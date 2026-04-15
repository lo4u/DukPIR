#!/usr/bin/env bash
set -euo pipefail

# IMPORTANT: mpc4j config key is `entry_bit_length` (unit = bit), not byte.
# Example: 1KB entry means 8192 bits.

EXP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MPC4J_ROOT="$(cd "$EXP_ROOT/../.." && pwd)"
TEMP_DIR="$MPC4J_ROOT/temp"
CONF_DIR="$EXP_ROOT/configs"
RAW_DIR="$EXP_ROOT/results/raw"
SUMMARY_DIR="$EXP_ROOT/results/summary"
LOG_DIR="$EXP_ROOT/results/logs"

JAR_PATH="$(ls "$MPC4J_ROOT"/mpc4j-s2pc-pir/target/*-jar-with-dependencies.jar 2>/dev/null | head -n 1 || true)"
if [ -z "$JAR_PATH" ]; then
  echo "[ERROR] PIR fat jar not found. Build first (e.g., $MPC4J_ROOT/compile-pir.sh pir)."
  exit 1
fi

CONFIG_FILES=(
  "$CONF_DIR/kspir_exp_len_256B_n20.conf"
  "$CONF_DIR/kspir_exp_len_30KB_n17.conf"
  "$CONF_DIR/kspir_exp_len_100KB_n14.conf"
  "$CONF_DIR/kspir_exp_n16_to_n20_len_1KB.conf"
)

mkdir -p "$RAW_DIR" "$SUMMARY_DIR" "$LOG_DIR"

copy_new_outputs() {
  local before_file="$1"
  local label="$2"
  local now_file
  now_file="$(mktemp)"

  find "$TEMP_DIR" -maxdepth 1 -type f -name "*.output" -printf "%f\n" | sort > "$now_file"

  comm -13 "$before_file" "$now_file" | while read -r new_name; do
    [ -z "$new_name" ] && continue
    cp "$TEMP_DIR/$new_name" "$RAW_DIR/$label.$new_name"
  done

  rm -f "$now_file"
}

run_one_conf() {
  local conf="$1"
  local conf_base label before_file server_pid
  conf_base="$(basename "$conf" .conf)"
  label="$(date +%Y%m%d_%H%M%S)_$conf_base"

  if [ ! -f "$conf" ]; then
    echo "[ERROR] Missing config: $conf"
    return 1
  fi

  before_file="$(mktemp)"
  find "$TEMP_DIR" -maxdepth 1 -type f -name "*.output" -printf "%f\n" | sort > "$before_file"

  echo "[RUN] $conf_base"

  java -Xmx200g -Xms64g --add-modules=jdk.incubator.vector --enable-preview \
    -jar "$JAR_PATH" "$conf" server \
    > "$LOG_DIR/${label}.server.log" 2>&1 &
  server_pid=$!

  sleep 3

  java -Xmx128g -Xms4g --add-modules=jdk.incubator.vector --enable-preview \
    -jar "$JAR_PATH" "$conf" client \
    > "$LOG_DIR/${label}.client.log" 2>&1

  wait "$server_pid"

  copy_new_outputs "$before_file" "$label"
  rm -f "$before_file"

  echo "[DONE] $conf_base"
}

for conf in "${CONFIG_FILES[@]}"; do
  echo "[INFO] entry_bit_length in conf is BIT length (bytes * 8)."
  run_one_conf "$conf"
done

python3 "$EXP_ROOT/scripts/extract_pir_data.py" "$RAW_DIR" --out-dir "$SUMMARY_DIR"

echo "All experiments completed."
echo "Raw outputs: $RAW_DIR"
echo "Summary CSV: $SUMMARY_DIR"
