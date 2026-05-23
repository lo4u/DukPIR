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

def get_db_data(db_file):
    """
    一次性读取数据库并缓存结果
    """
    if db_file in _db_cache:
        return _db_cache[db_file]
        
    keys = []
    probs = []
    with open(db_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split()
            # 找到合法的行 (key \t value \t prob)
            if len(parts) >= 3 and parts[2].replace('.', '', 1).isdigit():
                keys.append(parts[0])
                probs.append(float(parts[2]))
                
    if not keys:
        return None, None
        
    _db_cache[db_file] = (keys, probs)
    print(f"已成功加载数据文件: {db_file} (总计 {len(keys)} 条)")
    return keys, probs

def pick_random_keys(keys, probs, count):
    """
    一次性依据概率抽取所需数量的所有 Key
    """
    if not keys:
        return []
    # 按照概率随机抽取 count 个
    return random.choices(keys, weights=probs, k=count)

def run_test(db_file, val, p_worse, wt_file, run_count=10):
    print(f"\n{'='*80}")
    print(f"开始测试分布: {db_file}")
    print(f"查询参数: val={val}, p_worse={p_worse}, 结果写入目标={wt_file}")
    print(f"时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}")

    if not os.path.exists(db_file):
        print(f"错误: 未找到数据库文件 {db_file} （请先运行相关代码生成数据库）")
        return

    # 先清理或者初始化结果文件
    with open(wt_file, 'w', encoding='utf-8') as f:
        f.write("ActualValue\tRecoveredValue\tIsMatch\tSuccess\n")

    # 一次性读取并提取所有需要执行测试用的随机 qkeys
    keys, probs = get_db_data(db_file)
    if not keys:
        print("从数据库文件中装载数据失败！")
        return
        
    qkeys_to_test = pick_random_keys(keys, probs, run_count)

    for i, qkey in enumerate(qkeys_to_test, 1):
        # qkey 可能会很长，截断打印
        display_key = qkey[:20] + "..." if len(qkey) > 20 else qkey
        print(f"[{i}/{run_count}] 抽取查询键: {display_key}，正在运行查询...")

        # 构建命令参数 (这里假设可执行文件名为 ./production-app)
        cmd = ['./production-app', '-f', db_file, 
               '-val', str(val), 
               '-p_worse', str(p_worse), 
               '-qkey', qkey,
               '-wt', wt_file]

        # 执行命令 (捕获输出，防止被 Go 的调试信息刷屏)
        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            print(f"命令执行失败: {e}")
            print(f"Stderr: {e.stderr}")
        except FileNotFoundError:
            print("错误: 未找到 ./production-app 可执行文件，请先通过 go build -o production-app 编译")
            return
            
    print(f"\n完成测试: {db_file}，请查看日志结果: {wt_file}")

if __name__ == "__main__":
    # 配置4种分布对应的参数 (按照你的要求，91开对应 0.1 等等)
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
        # 这里默认给每个分布跑 100 次查询测试，你可根据电脑性能动态调整
        run_test(cfg['db'], cfg['val'], cfg['p_worse'], cfg['wt'], run_count=1)
