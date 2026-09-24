#!/usr/bin/env python3
"""
性能测试脚本 - 用于测试PIR系统性能
"""

import subprocess
import datetime
import time
import sys
import os

def run_test(db_size, key_len, p_worse, querypop, use_ntt, test_name, run_count=10, val=0.1):
    """
    运行单个测试配置

    val: 高频（popular）子集占比，对应 production-app 的 -val 参数，配合 -mode rate 使用
    """
    print(f"\n{'='*80}", flush=True)
    print(f"开始测试: {test_name}", flush=True)
    print(f"时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
    print(f"参数: db_size={db_size}, key_len={key_len}, p_worse={p_worse}, querypop={querypop}, val={val}", flush=True)
    print(f"{'='*80}", flush=True)
    
    for i in range(1, run_count + 1):
        print(f"\n{'-'*60}", flush=True)
        print(f"第 {i} 次运行:", flush=True)
        print(f"{'-'*60}", flush=True)
        
        # 构建命令参数
        cmd = ['./production-app', '-n', str(db_size), '-l', str(key_len), 
               '-p_worse', str(p_worse), '-querypop', str(querypop),
               '-use_ntt', str(use_ntt),
               '-mode', 'rate', '-val', str(val)]
        
        # 执行命令
        try:
            result = subprocess.run(cmd, capture_output=False, text=True, check=True)
        except subprocess.CalledProcessError as e:
            print(f"命令执行失败: {e}", flush=True)
        except FileNotFoundError:
            print("错误: 未找到 production-app 可执行文件", flush=True)
            return

    print(f"\n{'='*80}", flush=True)
    print(f"完成测试: {test_name}", flush=True)
    print(f"时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
    print(f"{'='*80}\n", flush=True)

def test_suite_a():
    """
    测试套件a: 不同数据库大小，固定键值长度1KB
    """
    print("开始测试套件 A", flush=True)
    print("数据库大小: 2^16 到 2^20, 键值长度: 1KB", flush=True)
    
    db_sizes = [2**16, 2**17, 2**18, 2**19, 2**20]
    key_len = 1024  # 1KB
    use_ntt = 0
    
    for db_size in db_sizes:
        for p_worse in [0, 1]:
            for querypop in [0, 1]:
                # 跳过 p_worse=0 且 querypop=0 的情况
                if p_worse == querypop:
                    continue
                
                test_name = f"A_db{db_size}_len{key_len}_p{p_worse}_q{querypop}"
                run_test(db_size, key_len, p_worse, querypop, use_ntt, test_name)

def test_suite_b():
    """
    测试套件b: 不同数据库大小和键值长度组合
    """
    print("开始测试套件 B", flush=True)
    print("不同数据库大小和键值长度组合", flush=True)
    
    test_cases = [
        (2**20, 256),      # 1MB数据库，256B键值
        (2**17, 30*1024),  # 128KB数据库，30KB键值  
        (2**14, 100*1024)  # 16KB数据库，100KB键值
    ]
    use_ntt = 0
    
    for db_size, key_len in test_cases:
        for p_worse in [0, 1]:
            for querypop in [0, 1]:
                # 跳过 p_worse=0 且 querypop=0 的情况
                if p_worse == querypop:
                    continue
                
                test_name = f"B_db{db_size}_len{key_len}_p{p_worse}_q{querypop}"
                run_test(db_size, key_len, p_worse, querypop, use_ntt, test_name)

def test_suite_distribution():
    """
    测试套件: 不同数据分布（高频子集占比）下的查询性能

    固定数据库 2^20 * 1KB，高频子集占比取 0.1/0.2/0.3/0.4，对应 -val 参数；
    p_worse 与套件 A/B 保持一致（p_worse=1 走全库、p_worse=0 走高频库），
    两种情况的耗时可在后续按占比加权平均。
    """
    print("开始测试套件 数据分布", flush=True)
    print("数据库大小: 2^20, 键值长度: 1KB, 高频子集占比: 0.1/0.2/0.3/0.4", flush=True)

    db_size = 2**20      # 2^20 条记录
    key_len = 1024       # 1KB
    use_ntt = 0
    popular_rates = [ 0.2, 0.3, 0.4]

    for val in popular_rates:
        for p_worse in [0, 1]:
            for querypop in [0, 1]:
                # 跳过 p_worse 与 querypop 相同的情况（与套件 A/B 一致）
                if p_worse == querypop:
                    continue

                test_name = f"D_db{db_size}_len{key_len}_val{val:.1f}_p{p_worse}_q{querypop}"
                run_test(db_size, key_len, p_worse, querypop, use_ntt, test_name, val=val)

def test_suite_ntt():
    """
    测试套件ntt: NTT加速预处理测试
    """
    print("开始测试套件 NTT", flush=True)
    print("NTT加速预处理相关性能测试", flush=True)

    db_sizes = [2**16, 2**17, 2**18, 2**19, 2**20]
    key_len = 1024  # 1KB
    use_ntt = 1

    for db_size in db_sizes:
        for p_worse in [0, 1]:
            for querypop in [0, 1]:
              if p_worse == 0 and querypop == 0:
                  continue

              test_name = f"NTT_db{db_size}_len{key_len}"
              run_test(db_size, key_len, p_worse, querypop, use_ntt, test_name)

# 套件开关：按需启用，避免每次运行都重跑全部套件
ENABLE_SUITE_A = False
ENABLE_SUITE_B = False
ENABLE_SUITE_DISTRIBUTION = True
ENABLE_SUITE_NTT = False

def main():
    """
    主函数
    """
    start_time = datetime.datetime.now()
    print("开始性能测试", flush=True)
    print(f"开始时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
    print(f"{'#'*80}", flush=True)

    if ENABLE_SUITE_A:
        # 运行测试套件A
        test_suite_a()

    if ENABLE_SUITE_B:
        # 运行测试套件B
        test_suite_b()

    if ENABLE_SUITE_DISTRIBUTION:
        # 运行数据分布套件（高频子集占比 0.1/0.2/0.3/0.4）
        test_suite_distribution()

    if ENABLE_SUITE_NTT:
        # 运行测试套件NTT
        test_suite_ntt()
    
    end_time = datetime.datetime.now()
    duration = end_time - start_time
    
    print(f"{'#'*80}", flush=True)
    print("所有测试完成!", flush=True)
    print(f"结束时间: {end_time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
    print(f"总运行时间: {duration}", flush=True)

if __name__ == "__main__":
    main()