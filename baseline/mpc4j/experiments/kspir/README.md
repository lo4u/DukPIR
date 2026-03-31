# KSPIR Experiment Layout

This folder follows a protocol-oriented experiment structure.

## Structure

- `configs/`: fixed experiment configurations.
- `scripts/`: runnable orchestration and data extraction scripts.
- `results/raw/`: copied `.output` files from each run.
- `results/logs/`: Java stdout/stderr logs for server/client.
- `results/summary/`: extracted CSV tables for analysis.

## Current Scenarios

- `kspir_exp_len_256B_n20.conf`: `(N, l) = (2^20, 256B)`
- `kspir_exp_len_30KB_n17.conf`: `(N, l) = (2^17, 30KB)`
- `kspir_exp_len_100KB_n14.conf`: `(N, l) = (2^14, 100KB)`
- `kspir_exp_n16_to_n20_len_1KB.conf`: `N=2^{16,17,18,19,20}, l=1KB`

## Run

From `baseline/mpc4j`:

```bash
./experiments/kspir/scripts/run_pir_experiments.sh
```

## Extract only

```bash
python3 experiments/kspir/scripts/extract_pir_data.py experiments/kspir/results/raw
```
