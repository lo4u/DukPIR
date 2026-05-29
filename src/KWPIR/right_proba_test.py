#!/usr/bin/env python3
"""
正确率测试脚本
"""

import subprocess
import datetime
import random
import sys
import os

# 全局缓存读取的数据库数据，避免重复读取
_db_cache = {}

# def get_db_data(db_file, val):
#     """
#     一次性读取数据库并缓存结果，同时按概率大小判断是否属于热点（与Go逻辑一致）。
#     """
#     if (db_file, val) in _db_cache:
#         return _db_cache[(db_file, val)]
        
#     records = []
#     with open(db_file, 'r', encoding='utf-8') as f:
#         for line in f:
#             parts = line.strip().split()
#             # 找到合法的行 (key \t value \t prob)
#             if len(parts) >= 3 and parts[2].replace('.', '', 1).isdigit():
#                 records.append((parts[0], float(parts[2])))
                
#     if not records:
#         return None, None, None
        
#     # 按概率大小排序（与Go的排序逻辑一致），然后标记前 val 比例的为热点
#     sorted_records = sorted(records, key=lambda x: x[1], reverse=True)
#     top_index = int(val * len(sorted_records))
    
#     # 构建热点集合，用于快速查询
#     hot_keys = set(k for k, _ in sorted_records[:top_index])
    
#     # 保持原始文件顺序的 keys 和 probs，但标记每个 key 是否在热点集合中
#     keys = [k for k, _ in records]
#     probs = [p for _, p in records]
#     is_hots = [k in hot_keys for k in keys]

#     _db_cache[(db_file, val)] = (keys, probs, is_hots)
#     print(f"已成功加载数据文件: {db_file} (总计 {len(keys)} 条，按概率排序后前 {top_index} 条为热点)")
#     return keys, probs, is_hots

# def pick_random_keys(keys, probs, is_hots, count):
#     """
#     一次性依据概率抽取所需数量的所有 Key，返回 (key, is_hot)
#     """
#     if not keys:
#         return []
#     # 按照概率随机抽取 count 个
#     population = list(zip(keys, is_hots))
#     return random.choices(population, weights=probs, k=count)

def run_test(db_file, val, p_worse, wt_file, run_count=10):
    print(f"\n{'='*80}")
    print(f"开始测试分布: {db_file}")
    print(f"查询参数: val={val}, p_worse={p_worse}, 结果写入目标={wt_file}")
    print(f"时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}")

    if not os.path.exists(db_file):
        print(f"错误: 未找到数据库文件 {db_file} （请先运行相关代码生成数据库）")
        return

    base_wt_file, ext = os.path.splitext(wt_file)
    if not ext:
        ext = '.txt'

    for run_index in range(1, run_count + 1):
        run_wt_file = f"{base_wt_file}_{run_index:02d}{ext}"

        # 先清理或者初始化结果文件
        with open(run_wt_file, 'w', encoding='utf-8') as f:
            f.write("QueryKey\tActualValue\tIsHot\tQueryDB\tSuccess\tType\n")

        # 构建命令参数 (这里假设可执行文件名为 ./production-app)
        cmd = ['./production-app', '-f', db_file,
                '-val', str(val),
                '-p_worse', str(p_worse),
                '-wt', run_wt_file]

        # 执行命令
        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            print(f"第 {run_index} 次命令执行失败: {e}")
            print(f"Stderr: {e.stderr}")
            continue
        except FileNotFoundError:
            print("错误: 未找到 ./production-app 可执行文件，请先通过 go build -o production-app 编译")
            return

        print(f"完成第 {run_index} 次测试: {db_file}，请查看日志结果: {run_wt_file}")

if __name__ == "__main__":
    # 配置4种分布对应的参数 
    configurations = [
        {"db": "./data/db_91.txt", "val": 0.1, "p_worse": 0.1, "wt": "./results/result_91.txt"},
        {"db": "./data/db_82.txt", "val": 0.2, "p_worse": 0.2, "wt": "./results/result_82.txt"},
        {"db": "./data/db_73.txt", "val": 0.3, "p_worse": 0.3, "wt": "./results/result_73.txt"},
        {"db": "./data/db_64.txt", "val": 0.4, "p_worse": 0.4, "wt": "./results/result_64.txt"},
    ]
    
    # 提前编译Go代码以确保使用最新逻辑并且提高连续运行效率
    print("正在编译 Go 代码至 ./production-app ...")
    subprocess.run(['go', 'build', '-o', 'production-app'], check=False)

    for cfg in configurations:
        # 每个分布跑 10 次查询测试
        run_test(cfg['db'], cfg['val'], cfg['p_worse'], cfg['wt'], run_count=10)
