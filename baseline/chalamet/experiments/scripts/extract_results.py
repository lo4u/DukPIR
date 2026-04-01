#!/usr/bin/env python3
import os
import glob
import csv
import re

# ==============================================================================
# Script to parse raw bench logs and generate formatted CSV summary
# Input: baseline/chalamet/experiments/logs/*.log
# Output: baseline/chalamet/experiments/results/summary.csv
# ==============================================================================

# Directory mapping
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXP_DIR = os.path.dirname(SCRIPT_DIR)
LOG_DIR = os.path.join(EXP_DIR, "logs")
RES_DIR = os.path.join(EXP_DIR, "results")
SUMMARY_FILE = os.path.join(RES_DIR, "summary.csv")

os.makedirs(RES_DIR, exist_ok=True)

# Regex matching to exactly grab our 5 customized benchmarks string patterns
patterns = {
    "offline_time": re.compile(r"Offline Setup Time:\s*(.*)"),
    "offline_comm": re.compile(r"Offline Comm Bytes:\s*(\d+)"),
    "online_query": re.compile(r"Online Query Bytes:\s*(\d+)"),
    "online_resp":  re.compile(r"Online Response Bytes:\s*(\d+)"),
    "online_time":  re.compile(r"online end-to-end.*?time:\s*\[.*? ([0-9.]+ [µmuns]+) .*?\]")
}

def extract_from_log(filepath):
    results = {k: "N/A" for k in patterns}
    filename = os.path.basename(filepath)
    label = filename.replace(".log", "")
    
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            for key, pattern in patterns.items():
                match = pattern.search(line)
                if match:
                    results[key] = match.group(1).strip()
    
    # If this log represents a Group 1 experiment (where we intentionally skipped offline generation)
    if "group1" in label:
        if results["offline_time"] == "N/A": results["offline_time"] = "Ignored"
        if results["offline_comm"] == "N/A": results["offline_comm"] = "Ignored"
        
    return [
        label, 
        results["offline_time"], 
        results["offline_comm"], 
        results["online_query"], 
        results["online_resp"], 
        results["online_time"]
    ]

def main():
    log_files = sorted(glob.glob(os.path.join(LOG_DIR, "*.log")))
    if not log_files:
        print(f"❌ No log files found in {LOG_DIR}. Did you run the experiments script first?")
        return
        
    print(f"🔍 Extracting results from {len(log_files)} log files...")
    
    # Write to CSV
    with open(SUMMARY_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Experiment", "Offline_Time", "Offline_Comm(Bytes)", "Online_Query(Bytes)", "Online_Resp(Bytes)", "Online_Time"])
        for lf in log_files:
            row = extract_from_log(lf)
            writer.writerow(row)
            
    print(f"✅ Extraction complete! Detailed CSV saved to: {os.path.relpath(SUMMARY_FILE, os.path.dirname(EXP_DIR))}\n")
    
    # Pretty print in terminal acting as a table formatter
    with open(SUMMARY_FILE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)
        
        # Calculate column widths
        max_lens = [0] * len(rows[0])
        for row in rows:
            for i, col in enumerate(row):
                if len(str(col)) > max_lens[i]:
                    max_lens[i] = len(str(col))
        
        # Draw table
        separator = "+" + "+".join("-" * (w + 2) for w in max_lens) + "+"
        print(separator)
        for i, row in enumerate(rows):
            fmt_row = " | ".join(str(c).ljust(w) for c, w in zip(row, max_lens))
            print(f"| {fmt_row} |")
            if i == 0:
                print(separator)
        print(separator)

if __name__ == "__main__":
    main()
