#!/usr/bin/env python3
import os
import glob
import csv
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXP_DIR = os.path.dirname(SCRIPT_DIR)
LOG_DIR = os.path.join(EXP_DIR, "logs")
RES_DIR = os.path.join(EXP_DIR, "results")
SUMMARY_FILE = os.path.join(RES_DIR, "summary.csv")

os.makedirs(RES_DIR, exist_ok=True)

patterns = {
    'offline_derive': re.compile(r'derive LHS from seed.*?time:\s*\[.*? ([0-9.]+ [µmuns]+) .*?\]'),
    'offline_gen':    re.compile(r'generate db and params.*?time:\s*\[.*? ([0-9.]+ [µmuns]+) .*?\]'),
    'offline_comm':   re.compile(r'Offline Comm Bytes:\s*(\d+)'),
    'online_query':   re.compile(r'Online Query Bytes:\s*(\d+)'),
    'online_resp':    re.compile(r'Online Response Bytes:\s*(\d+)'),
    'online_time':    re.compile(r'online end-to-end.*?time:\s*\[.*? ([0-9.]+ [µmuns]+) .*?\]')
}

def parse_time_to_ms(time_str):
    if not time_str or time_str == "N/A" or time_str == "Ignored":
        return 0.0
    val, unit = time_str.split()
    val = float(val)
    if unit == 's': return val * 1000.0
    if unit == 'ms': return val
    if unit in ['µs', 'us']: return val / 1000.0
    if unit == 'ns': return val / 1000000.0
    return val

def extract_from_log(filepath):
    results = {k: "N/A" for k in patterns}
    base_name = os.path.basename(filepath).replace(".log", "")
    label = re.sub(r'^\d{8}_\d{6}_', '', base_name)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read().replace('\n', ' ')

    for key, pattern in patterns.items():
        match = pattern.search(content)
        if match:
            results[key] = match.group(1).strip()
    
    if "group1" in label:
        results["offline_time"] = "Ignored"
        results["offline_comm"] = "Ignored"
    else:
        if results["offline_derive"] != "N/A" and results["offline_gen"] != "N/A":
            t1 = parse_time_to_ms(results["offline_derive"])
            t2 = parse_time_to_ms(results["offline_gen"])
            results["offline_time"] = f"{(t1 + t2) / 1000.0:.3f} s"
        else:
            results["offline_time"] = "N/A"
            
    return [label, results.get("offline_time","N/A"), results["offline_comm"], results["online_query"], results["online_resp"], results["online_time"]]

def main():
    if len(sys.argv) > 1:
        timestamp = sys.argv[1]
        log_files = sorted(glob.glob(os.path.join(LOG_DIR, f"{timestamp}_*.log")))
    else:
        log_files = sorted(glob.glob(os.path.join(LOG_DIR, "*.log")))
        
    if not log_files:
        print(f"No logs found in {LOG_DIR}.")
        return
        
    with open(SUMMARY_FILE, "w", newline="", encoding="utf-8") as f:
        f.truncate(0)
        writer = csv.writer(f)
        writer.writerow(["Experiment", "Offline_Time", "Offline_Comm(Bytes)", "Online_Query(Bytes)", "Online_Resp(Bytes)", "Online_Time"])
        for lf in log_files:
            writer.writerow(extract_from_log(lf))
            
    with open(SUMMARY_FILE, "r", encoding="utf-8") as f:
        rows = list(csv.reader(f))
        max_lens = [max(len(str(r[i])) for r in rows) for i in range(len(rows[0]))]
        sep = "+" + "+".join("-" * (w + 2) for w in max_lens) + "+"
        print(sep)
        for i, row in enumerate(rows):
            print(f"| " + " | ".join(str(c).ljust(w) for c, w in zip(row, max_lens)) + " |")
            if i == 0: print(sep)
        print(sep)

if __name__ == "__main__":
    main()
