import random
import argparse
from datetime import datetime

def read_database(file_path):
    """从文件读取数据库记录"""
    records = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # 跳过空行和注释
            if not line or line.startswith('#'):
                continue
            
            parts = line.split()
            if len(parts) >= 3:
                key = parts[0]
                value = parts[1]
                probability = float(parts[2])
                records.append({
                    'key': key,
                    'value': value,
                    'probability': probability
                })
    
    return records

def sample_by_probability(records, num_samples=10):
    """根据概率采样数据"""
    if not records:
        print("错误：数据库为空")
        return []
    
    # 提取键和概率
    keys = [rec['key'] for rec in records]
    probabilities = [rec['probability'] for rec in records]
    
    # 归一化概率（确保总和为1）
    total_prob = sum(probabilities)
    normalized_probs = [p / total_prob for p in probabilities]
    
    # 根据概率采样（允许重复）
    sampled_keys = random.choices(keys, weights=normalized_probs, k=num_samples)
    
    # 获取完整记录
    key_to_record = {rec['key']: rec for rec in records}
    sampled_records = [key_to_record[key] for key in sampled_keys]
    
    return sampled_records

def sample_without_replacement(records, num_samples=10):
    """根据概率采样数据（不重复）"""
    if not records:
        print("错误：数据库为空")
        return []
    
    if num_samples > len(records):
        print(f"警告：采样数量 {num_samples} 大于记录总数 {len(records)}，将采样全部记录")
        num_samples = len(records)
    
    # 提取键和概率
    keys = [rec['key'] for rec in records]
    probabilities = [rec['probability'] for rec in records]
    
    # 归一化概率
    total_prob = sum(probabilities)
    normalized_probs = [p / total_prob for p in probabilities]
    
    # 根据概率采样（不重复）
    sampled_indices = random.choices(range(len(records)), weights=normalized_probs, k=num_samples)
    
    # 去重并保持采样顺序
    seen = set()
    unique_indices = []
    for idx in sampled_indices:
        if idx not in seen:
            seen.add(idx)
            unique_indices.append(idx)
    
    # 如果去重后数量不足，继续采样
    while len(unique_indices) < num_samples:
        remaining_indices = [i for i in range(len(records)) if i not in seen]
        if not remaining_indices:
            break
        remaining_probs = [normalized_probs[i] for i in remaining_indices]
        total_remaining = sum(remaining_probs)
        remaining_probs = [p / total_remaining for p in remaining_probs]
        
        new_idx = random.choices(remaining_indices, weights=remaining_probs, k=1)[0]
        seen.add(new_idx)
        unique_indices.append(new_idx)
    
    sampled_records = [records[idx] for idx in unique_indices]
    
    return sampled_records

def save_samples(samples, output_file):
    """保存采样结果到文件"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 概率采样结果\n")
        f.write("# 格式: key value probability\n")
        f.write(f"# 生成时间: {datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ')}\n")
        f.write(f"# 采样数量: {len(samples)}\n\n")
        
        for sample in samples:
            f.write(f"{sample['key']} {sample['value']} {sample['probability']:.6f}\n")
    
    print(f"采样结果已保存到: {output_file}")

def main():
    parser = argparse.ArgumentParser(description="根据概率从数据库中采样数据")
    parser.add_argument('-i', '--input', type=str, default='../my_db.txt',
                        help="输入数据库文件路径 (默认: ../my_db.txt)")
    parser.add_argument('-o', '--output', type=str, default='../sampled_records.txt',
                        help="输出文件路径 (默认: ../sampled_records.txt)")
    parser.add_argument('-n', '--num', type=int, default=10,
                        help="采样数量 (默认: 10)")
    parser.add_argument('-r', '--allow-repeat', action='store_true',
                        help="允许重复采样（默认不允许重复）")
    parser.add_argument('--no-save', action='store_true',
                        help="不保存到文件，仅打印到控制台")
    
    args = parser.parse_args()
    
    # 读取数据库
    print(f"正在从 {args.input} 读取数据...")
    records = read_database(args.input)
    print(f"读取了 {len(records)} 条记录")
    
    # 计算概率总和
    total_prob = sum(rec['probability'] for rec in records)
    print(f"概率总和: {total_prob:.6f}")
    
    # 采样
    print(f"\n正在采样 {args.num} 条记录（{'允许重复' if args.allow_repeat else '不重复'}）...")
    if args.allow_repeat:
        samples = sample_by_probability(records, args.num)
    else:
        samples = sample_without_replacement(records, args.num)
    
    # 显示采样结果
    print(f"\n采样结果（共 {len(samples)} 条）：")
    print("-" * 80)
    print(f"{'序号':<6} {'Key':<15} {'Value':<20} {'Probability':<12}")
    print("-" * 80)
    
    for i, sample in enumerate(samples, 1):
        print(f"{i:<6} {sample['key']:<15} {sample['value']:<20} {sample['probability']:<12.6f}")
    
    print("-" * 80)
    
    # 统计采样概率总和
    sampled_prob_sum = sum(s['probability'] for s in samples)
    print(f"\n采样记录的概率总和: {sampled_prob_sum:.6f}")
    
    # 保存到文件
    if not args.no_save:
        save_samples(samples, args.output)

if __name__ == "__main__":
    main()
