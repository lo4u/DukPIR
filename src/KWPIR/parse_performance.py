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
        'Hint Update Communication': r'Hint Update Communication:\s*([\d.]+)\s*(bytes|[KMGT]?B)'
    }
    
    while i < len(lines):
        line = lines[i].strip()
        # 统计块只属于当前这一轮：遇到下一轮运行提示或下一个测试配置就停止，
        # 否则后续轮次的数值会不断覆盖本轮，导致每轮都取到最后一轮的数据
        if line.startswith('开始测试:') or extract_run_number(line) is not None:
            break
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
    current_run_number = None
    
    while i < len(lines):
        line = lines[i]
        
        # 查找测试开始
        if line.strip().startswith('开始测试:'):
            current_test_name = line.strip().split(':', 1)[1].strip()
            current_run_number = None
            
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
        if run_number is not None:
            current_run_number = run_number
        
        # 查找性能统计部分
        if line.strip().startswith('=== Performance Statistics ==='):
            if current_params and current_test_name:
                performance_stats = extract_performance_statistics(lines, i + 1)
                
                if performance_stats:
                    # 使用当前这一轮记录的运行序号，缺省时回退到计数
                    run_num = current_run_number if current_run_number is not None else len([r for r in results if r.get('test_name') == current_test_name]) + 1
                    
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

# 参与取均值的字段
TIME_FIELDS = [
    'Offline Time', 'Add operation time', 'Update operation time', 'Delete operation time',
    'Online Query Time', 'Online Response Time', 'Total Online Time'
]
COMMUNICATION_FIELDS = [
    'Offline Communication', 'Online Query Communication',
    'Online Answer Communication', 'Hint Update Communication'
]

# 通信量统一换算到 MB 后再取均值，避免不同单位直接相加
UNIT_TO_MB = {
    'bytes': 1.0 / (1024 * 1024),
    'B': 1.0 / (1024 * 1024),
    'KB': 1.0 / 1024,
    'MB': 1.0,
    'GB': 1024.0,
    'TB': 1024.0 * 1024,
}

def communication_to_mb(value: str) -> Optional[float]:
    """
    将带单位的通信量文本转换为 MB 数值，例如 "87.4844 MB"、"259.8281 KB"
    """
    if not value:
        return None
    match = re.match(r'^\s*([\d.]+)\s*([KMGT]?B|bytes)\s*$', value)
    if not match:
        return None
    number = float(match.group(1))
    unit = match.group(2)
    if unit == 'bytes':
        unit = 'B'
    return number * UNIT_TO_MB[unit]

def format_average_number(value: float) -> str:
    """
    均值格式化：最多保留 6 位小数并去掉多余的 0
    """
    return f"{value:.6f}".rstrip('0').rstrip('.')

def build_group_average(group: List[Dict[str, str]]) -> Dict[str, str]:
    """
    对同一测试配置的一组运行结果取均值
    """
    average_entry = dict(group[0])
    average_entry['run_number'] = 'avg'

    for key in TIME_FIELDS:
        values = []
        for result in group:
            raw = result.get(key)
            if raw:
                try:
                    values.append(float(raw))
                except ValueError:
                    pass
        if values:
            average_entry[key] = format_average_number(sum(values) / len(values))

    for key in COMMUNICATION_FIELDS:
        values = []
        for result in group:
            converted = communication_to_mb(result.get(key, ''))
            if converted is not None:
                values.append(converted)
        if values:
            average_entry[key] = f"{sum(values) / len(values):.4f} MB"

    return average_entry

def add_group_averages(results: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    在每个测试配置的 10 次运行结果之后紧接插入该组的均值行
    """
    ordered_names = []
    groups: Dict[str, List[Dict[str, str]]] = {}
    for result in results:
        test_name = result['test_name']
        if test_name not in groups:
            groups[test_name] = []
            ordered_names.append(test_name)
        groups[test_name].append(result)

    averaged_results = []
    for test_name in ordered_names:
        group = groups[test_name]
        averaged_results.extend(group)
        averaged_results.append(build_group_average(group))

    return averaged_results

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
        'Online Answer Communication', 'Hint Update Communication'
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

        # 统计每个测试配置的运行次数与均值行
        test_counts = {}
        average_counts = {}
        for result in results:
            test_name = result['test_name']
            if result.get('run_number') == 'avg':
                average_counts[test_name] = average_counts.get(test_name, 0) + 1
            else:
                test_counts[test_name] = test_counts.get(test_name, 0) + 1

        print(f"共处理了 {sum(test_counts.values())} 个测试运行，"
              f"并生成 {sum(average_counts.values())} 条均值")

        print("\n各测试配置运行次数统计:")
        for test_name, count in test_counts.items():
            has_average = '含均值行' if average_counts.get(test_name) else '无均值行'
            print(f"  {test_name}: {count} 次 ({has_average})")
            
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
    run_results = parse_test_file(input_file)
    
    if run_results:
        # 在每个测试配置的 10 次运行后插入该组均值
        results = add_group_averages(run_results)
        write_to_csv(results, output_file)
        
        # 显示统计信息
        print(f"\n解析完成!")
        print(f"输入文件: {input_file}")
        print(f"输出文件: {output_file}")
        print(f"处理的测试运行总数: {len(run_results)}")
        print(f"生成的均值行数量: {len(results) - len(run_results)}")
    else:
        print("未找到任何测试数据，请检查输入文件格式")

if __name__ == "__main__":
    main()