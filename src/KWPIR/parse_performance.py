#!/usr/bin/env python3
"""
从PIR性能测试结果txt文件中提取参数和性能统计数据，生成CSV文件
记录每组参数的10次运行结果
"""

import re
import csv
import sys
import os
from typing import List, Dict, Optional

def extract_test_parameters(line: str) -> Optional[Dict[str, str]]:
    """
    从参数行中提取测试参数
    """
    pattern = r'参数:\s*db_size=(\d+),\s*key_len=(\d+),\s*p_worse=(\d+),\s*querypop=(\d+)'
    match = re.search(pattern, line)
    if match:
        return {
            'db_size': match.group(1),
            'key_len': match.group(2),
            'p_worse': match.group(3),
            'querypop': match.group(4)
        }
    return None

def extract_performance_statistics(lines: List[str], start_index: int) -> Dict[str, str]:
    """
    从性能统计部分提取数据
    """
    stats = {}
    i = start_index
    
    # 性能统计指标的正则表达式模式
    patterns = {
        'Offline Time': r'Offline Time:\s*([\d.]+)\s*ms',
        'Add operation time': r'Add operation time:\s*([\d.]+)ms',
        'Update operation time': r'Update operation time:\s*([\d.]+)ms',
        'Delete operation time': r'Delete operation time:\s*([\d.]+)ms',
        'Online Query Time': r'Online Query Time:\s*([\d.]+)\s*ms',
        'Online Response Time': r'Online Response Time:\s*([\d.]+)\s*ms',
        'Total Online Time': r'Total Online Time:\s*([\d.]+)\s*ms',
        'Offline Communication': r'Offline Communication:\s*([\d.]+)\s*([KMGT]?B)',
        'Online Query Communication': r'Online Query Communication:\s*([\d.]+)\s*([KMGT]?B)',
        'Online Answer Communication': r'Online Answer Communication:\s*([\d.]+)\s*([KMGT]?B)',
        'Total Communication': r'Total Communication:\s*([\d.]+)\s*([KMGT]?B)'
    }
    
    while i < len(lines) and not lines[i].strip().startswith('开始测试:'):
        line = lines[i].strip()
        for key, pattern in patterns.items():
            match = re.search(pattern, line)
            if match:
                if key.endswith('Communication'):
                    # 处理通信量，包含单位和数值
                    value = f"{match.group(1)} {match.group(2)}"
                else:
                    # 处理时间，只有数值
                    value = match.group(1)
                stats[key] = value
                break
        i += 1
    
    return stats

def extract_run_number(line: str) -> Optional[int]:
    """
    从运行描述中提取运行序号
    """
    pattern = r'第\s*(\d+)\s*次运行'
    match = re.search(pattern, line)
    if match:
        return int(match.group(1))
    return None

def parse_test_file(filename: str) -> List[Dict[str, str]]:
    """
    解析测试结果文件，提取所有测试运行的参数和性能数据
    记录每组参数的10次运行结果
    """
    results = []
    
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            lines = file.readlines()
    except FileNotFoundError:
        print(f"错误: 文件 {filename} 未找到")
        return []
    except UnicodeDecodeError:
        # 尝试其他编码
        try:
            with open(filename, 'r', encoding='gbk') as file:
                lines = file.readlines()
        except:
            print(f"错误: 无法读取文件 {filename}")
            return []
    
    i = 0
    current_params = None
    current_test_name = None
    
    while i < len(lines):
        line = lines[i]
        
        # 查找测试开始
        if line.strip().startswith('开始测试:'):
            current_test_name = line.strip().split(':', 1)[1].strip()
            
            # 查找参数行
            j = i
            while j < min(i + 10, len(lines)):  # 在接下来的10行内查找参数
                params = extract_test_parameters(lines[j])
                if params:
                    current_params = params
                    print(f"找到测试配置: {current_test_name}, 参数: {current_params}")
                    break
                j += 1
        
        # 查找运行次数
        run_number = extract_run_number(line)
        
        # 查找性能统计部分
        if line.strip().startswith('=== Performance Statistics ==='):
            if current_params and current_test_name:
                performance_stats = extract_performance_statistics(lines, i + 1)
                
                if performance_stats:
                    # 使用运行序号，如果没有找到则使用默认值
                    run_num = run_number if run_number is not None else len([r for r in results if r.get('test_name') == current_test_name]) + 1
                    
                    result_entry = {
                        'test_name': current_test_name,
                        'run_number': str(run_num),
                        **current_params,
                        **performance_stats
                    }
                    results.append(result_entry)
                    print(f"记录第 {run_num} 次运行结果: {current_test_name}")
            else:
                print("警告: 找到性能统计但没有对应的测试参数")
        
        i += 1
    
    return results

def write_to_csv(results: List[Dict[str, str]], output_filename: str):
    """
    将结果写入CSV文件
    """
    if not results:
        print("没有找到可用的测试数据")
        return
    
    # 获取所有可能的列名
    all_keys = set()
    for result in results:
        all_keys.update(result.keys())
    
    # 定义列的顺序
    fieldnames = [
        'test_name', 'run_number', 'db_size', 'key_len', 'p_worse', 'querypop',
        'Offline Time', 'Add operation time', 'Update operation time', 'Delete operation time',
        'Online Query Time', 'Online Response Time', 'Total Online Time',
        'Offline Communication', 'Online Query Communication', 
        'Online Answer Communication', 'Total Communication'
    ]
    
    # 确保所有字段都在fieldnames中
    for key in all_keys:
        if key not in fieldnames:
            fieldnames.append(key)
    
    try:
        with open(output_filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for result in results:
                writer.writerow(result)
        print(f"成功将数据写入 {output_filename}")
        print(f"共处理了 {len(results)} 个测试运行")
        
        # 统计每个测试配置的运行次数
        test_counts = {}
        for result in results:
            test_name = result['test_name']
            test_counts[test_name] = test_counts.get(test_name, 0) + 1
        
        print("\n各测试配置运行次数统计:")
        for test_name, count in test_counts.items():
            print(f"  {test_name}: {count} 次")
            
    except Exception as e:
        print(f"写入CSV文件时出错: {e}")

def main():
    """
    主函数
    """
    if len(sys.argv) != 2:
        print("用法: python parse_performance.py <input_txt_file>")
        print("示例: python3 parse_performance.py performance_test_results_on_server.log")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = os.path.splitext(input_file)[0] + '_results.csv'
    
    print(f"开始解析文件: {input_file}")
    results = parse_test_file(input_file)
    
    if results:
        write_to_csv(results, output_file)
        
        # 显示统计信息
        print(f"\n解析完成!")
        print(f"输入文件: {input_file}")
        print(f"输出文件: {output_file}")
        print(f"处理的测试运行总数: {len(results)}")
    else:
        print("未找到任何测试数据，请检查输入文件格式")

if __name__ == "__main__":
    main()