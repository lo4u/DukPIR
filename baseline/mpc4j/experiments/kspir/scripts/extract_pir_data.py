#!/usr/bin/env python3
"""Extract and summarize mpc4j PIR .output files."""

from __future__ import annotations

import argparse
import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


SCRIPT_DIR = Path(__file__).resolve().parent
EXP_ROOT = SCRIPT_DIR.parent


FILE_RE = re.compile(
    r"^(?P<proto>[A-Z0-9_]+)_(?P<append>.+)_(?P<entry>[0-9]+)_(?P<party>[01])_(?P<thread>[0-9]+)\.output$"
)


@dataclass
class Row:
    file_name: str
    append: str
    entry_bit_length: Optional[int]
    party_id: int
    party: str
    server_set_size: int
    query_num: int
    init_time_ms: int
    init_send_bytes: int
    init_payload_bytes: int
    pto_time_ms: int
    pto_send_bytes: int
    pto_payload_bytes: int

    @property
    def log_n(self) -> Optional[int]:
        n = self.server_set_size
        if n > 0 and (n & (n - 1) == 0):
            return n.bit_length() - 1
        return None


def to_int(value: str) -> int:
    return int(value.strip())


def parse_output_file(path: Path) -> List[Row]:
    name_match = FILE_RE.match(path.name)
    append = name_match.group("append") if name_match else "unknown"
    entry_bit_length = int(name_match.group("entry")) if name_match else None

    rows: List[Row] = []
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for line in reader:
            party_id = to_int(line["Party ID"])
            rows.append(
                Row(
                    file_name=path.name,
                    append=append,
                    entry_bit_length=entry_bit_length,
                    party_id=party_id,
                    party="server" if party_id == 0 else "client",
                    server_set_size=to_int(line["Server Set Size"]),
                    query_num=to_int(line["Query Num"]),
                    init_time_ms=to_int(line["Init Time(ms)"]),
                    init_send_bytes=to_int(line["Init Send Bytes(B)"]),
                    init_payload_bytes=to_int(line["Init Payload Bytes(B)"]),
                    pto_time_ms=to_int(line["Pto  Time(ms)"]),
                    pto_send_bytes=to_int(line["Pto  Send Bytes(B)"]),
                    pto_payload_bytes=to_int(line["Pto  Payload Bytes(B)"]),
                )
            )
    return rows


def find_output_files(input_path: Path) -> List[Path]:
    if input_path.is_file() and input_path.suffix == ".output":
        return [input_path]
    if input_path.is_dir():
        return sorted(input_path.glob("*.output"))
    return []


def write_raw_csv(rows: Iterable[Row], output_file: Path) -> None:
    with output_file.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "file_name",
                "append",
                "entry_bit_length(bits)",
                "entry_size(bytes)",
                "party",
                "party_id",
                "set_size(count)",

                "log_n(bits)",
                "query_num(count)",
                "offline_compute_time(ms)",
                "offline_comm_send(bytes)",
                "offline_comm_payload(bytes)",
                "online_compute_time(ms)",
                "online_comm_send(bytes)",
                "online_comm_payload(bytes)",
            ]
        )
        for r in rows:
            writer.writerow(
                [
                    r.file_name,
                    r.append,
                    "" if r.entry_bit_length is None else r.entry_bit_length,
                    "" if r.entry_bit_length is None else r.entry_bit_length // 8,
                    r.party,
                    r.party_id,
                    r.server_set_size,
                    "" if r.log_n is None else r.log_n,
                    r.query_num,
                    r.init_time_ms,
                    r.init_send_bytes,
                    r.init_payload_bytes,
                    r.pto_time_ms,
                    r.pto_send_bytes,
                    r.pto_payload_bytes,
                ]
            )


def pair_rows(rows: List[Row]) -> Dict[Tuple[str, Optional[int], int, int], Dict[str, Row]]:
    grouped: Dict[Tuple[str, Optional[int], int, int], Dict[str, Row]] = {}
    for r in rows:
        key = (r.append, r.entry_bit_length, r.server_set_size, r.query_num)
        if key not in grouped:
            grouped[key] = {}
        grouped[key][r.party] = r
    return grouped


def write_focus_csv(rows: List[Row], output_file: Path) -> None:
    grouped = pair_rows(rows)
    with output_file.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "experiment",
                "entry_bit_length(bits)",
                "entry_size(bytes)",
                "set_size(count)",
                "log_n(bits)",
                "entry_query_num(count)",
                "offline_compute_time(ms)",
                "offline_comm_send(bytes)",
                "online_query_uplink(bytes)",
                "online_response_downlink(bytes)",
                "online_compute_time(ms)",
            ]
        )
        for key in sorted(grouped.keys()):
            append, entry_bit_length, n, q = key
            srv = grouped[key].get("server")
            cli = grouped[key].get("client")
            if srv is None or cli is None:
                continue

            # End-to-end online time is bounded by the slower side in a synchronized run.
            online_compute_ms_total = max(srv.pto_time_ms, cli.pto_time_ms)
            writer.writerow(
                [
                    append,
                    "" if entry_bit_length is None else entry_bit_length,
                    "" if entry_bit_length is None else entry_bit_length // 8,
                    n,
                    "" if srv.log_n is None else srv.log_n,
                    q,
                    srv.init_time_ms,
                    srv.init_send_bytes,
                    cli.pto_send_bytes,
                    srv.pto_send_bytes,
                    online_compute_ms_total,
                ]
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract PIR experiment data from .output files")
    parser.add_argument(
        "inputs",
        nargs="+",
        type=Path,
        help="One or more .output files or directories containing .output files",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=EXP_ROOT / "results" / "summary",
        help="Directory to write summary CSV files",
    )
    args = parser.parse_args()

    files: List[Path] = []
    for input_path in args.inputs:
        files.extend(find_output_files(input_path))
    files = sorted(set(files))

    if not files:
        joined_inputs = ", ".join(str(p) for p in args.inputs)
        raise SystemExit(f"No .output files found in: {joined_inputs}")

    rows: List[Row] = []
    for file in files:
        rows.extend(parse_output_file(file))

    args.out_dir.mkdir(parents=True, exist_ok=True)
    raw_csv = args.out_dir / "pir_raw_metrics.csv"
    focus_csv = args.out_dir / "pir_focus_metrics.csv"

    write_raw_csv(rows, raw_csv)
    write_focus_csv(rows, focus_csv)

    print(f"Parsed files: {len(files)}")
    print(f"Parsed rows: {len(rows)}")
    print(f"Raw metrics: {raw_csv}")
    print(f"Focus metrics: {focus_csv}")


if __name__ == "__main__":
    main()
