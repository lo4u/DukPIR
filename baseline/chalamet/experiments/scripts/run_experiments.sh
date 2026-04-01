#!/usr/bin/env bash
set -e

# ==============================================================================
# Script to run Chalamet PIR benchmarks with realistic dataset distributions
# 
# Outputs:
#   - raw logs  : baseline/chalamet/experiments/logs/*.log
#   - summary   : baseline/chalamet/experiments/results/summary.csv
# ==============================================================================

# Default LWE settings (aligned with Makefile standards)
LWE_DIM=1774
NUM_SHARDS=8

# Paths
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXP_DIR="$ROOT_DIR/experiments"
LOG_DIR="$EXP_DIR/logs"
RESULTS_DIR="$EXP_DIR/results"
SUMMARY_FILE="$RESULTS_DIR/summary.csv"

cd "$ROOT_DIR"
echo "Creating experiment directories in $EXP_DIR..."
mkdir -p "$LOG_DIR" "$RESULTS_DIR"

# Initialize Summary CSV
echo "Experiment,N(log2),Dataset_Size,Offline_Time,Offline_Comm(Bytes),Online_Query(Bytes),Online_Resp(Bytes),Online_Time" > "$SUMMARY_FILE"

run_bench() {
  local N_EXP=$1
  local BITS=$2
  local PT_BITS=$3
  local DB_GEN=$4
  local LABEL=$5
  local L_LABEL=$6

  LOG_FILE="$LOG_DIR/${LABEL}.log"
  echo ""
  echo "================================================================================"
  echo "▶ Running $LABEL"
  echo "  N: 2^${N_EXP}, Row Size: ${L_LABEL} (${BITS} bits)"
  echo "  BENCH_DB_GEN (Offline timing): ${DB_GEN}"
  echo "================================================================================"
  
  # Execute cargo bench and log all outputs
  env \
    PIR_NUMBER_OF_ELEMENTS_EXP=$N_EXP \
    PIR_LWE_DIM=$LWE_DIM \
    PIR_ELEM_SIZE_BITS=$BITS \
    PIR_PLAINTEXT_BITS=$PT_BITS \
    PIR_NUM_SHARDS=$NUM_SHARDS \
    BENCH_DB_GEN=$DB_GEN \
    BENCH_KV=true \
    cargo bench --bench bench > "$LOG_FILE" 2>&1

  # Extract the targeted 5 metrics directly from the log file
  # The output matches our previous patched format
  OFFLINE_TIME=$(grep "1. 离线时间" "$LOG_FILE" | awk -F ':' '{print $2}' | xargs || echo "N/A")
  OFFLINE_COMM=$(grep "2. 离线通信" "$LOG_FILE" | awk -F ':' '{print $2}' | awk '{print $1}' | xargs || echo "N/A")
  ONLINE_QUERY=$(grep "3. 在线查询大小" "$LOG_FILE" | awk -F ':' '{print $2}' | awk '{print $1}' | xargs || echo "N/A")
  ONLINE_RESP=$(grep "4. 在线响应大小" "$LOG_FILE" | awk -F ':' '{print $2}' | awk '{print $1}' | xargs || echo "N/A")
  ONLINE_TIME=$(grep "5. 在线端到端时间" "$LOG_FILE" | awk -F ':' '{print $2}' | xargs || echo "N/A")

  # Wipe out the offline output placeholder if they shouldn't run
  if [ "$DB_GEN" = "false" ]; then
    OFFLINE_TIME="Ignored"
    OFFLINE_COMM="Ignored"
  fi

  # Record to summary
  echo "${LABEL},${N_EXP},${L_LABEL},${OFFLINE_TIME},${OFFLINE_COMM},${ONLINE_QUERY},${ONLINE_RESP},${ONLINE_TIME}" >> "$SUMMARY_FILE"
  echo "✔ Done! Results saved. View details in logs/${LABEL}.log"
}

# ============================================================================
# Group 1: Non-Offline Benchmarks 
# (Dataset sizes and configurations aligned with Makefile)
# ============================================================================
echo "Running Group 1: Varying database dimension sizes (Skipping Offline)..."
# N=2^20, 256B (2048 bits), PT_BITS=9
run_bench 20 2048 9 false "group1_N20_256B" "256B"
# N=2^17, 30KB (245760 bits), PT_BITS=10
run_bench 17 245760 10 false "group1_N17_30KB" "30KB"
# N=2^14, 100KB (819200 bits), PT_BITS=10
run_bench 14 819200 10 false "group1_N14_100KB" "100KB"

# ============================================================================
# Group 2: Offline Benchmarks Included
# (1KB entries across varying heights)
# ============================================================================
echo "Running Group 2: Fixed 1KB size, varying entries (Measuring Offline)..."
# N=2^16, 1KB (8192 bits), PT_BITS=10
run_bench 16 8192 10 true "group2_N16_1KB" "1KB"
# N=2^17, 1KB (8192 bits), PT_BITS=10
run_bench 17 8192 10 true "group2_N17_1KB" "1KB"
# N=2^18, 1KB (8192 bits), PT_BITS=10
run_bench 18 8192 10 true "group2_N18_1KB" "1KB"
# N=2^19, 1KB (8192 bits), PT_BITS=9
run_bench 19 8192 9 true "group2_N19_1KB" "1KB"
# N=2^20, 1KB (8192 bits), PT_BITS=9
run_bench 20 8192 9 true "group2_N20_1KB" "1KB"

echo ""
echo "================================================================================"
echo "🎉 所有测试运行完毕！现在自动调用 Python 脚本提取和分析结果..."
echo "================================================================================"

# 调用 Python 脚本一键整理并输出最终报表
python3 "$EXP_DIR/scripts/extract_results.py"

