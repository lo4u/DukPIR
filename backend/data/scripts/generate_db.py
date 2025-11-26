import random
import string
import os
import argparse
from datetime import datetime
import numpy as np

def generate_random_key(length):
    """生成长度为length的纯10进制随机字符串（0-9）"""
    charset = string.digits  # 只用 '0123456789'
    return ''.join(random.choices(charset, k=length))

def generate_random_value(length):
    """生成长度为length的随机字符串（a-zA-Z0-9）"""
    charset = string.ascii_letters + string.digits
    return ''.join(random.choices(charset, k=length))

def generate_random_db(num_rows, key_len, value_len, output_file):
    """生成随机数据库并写入文件"""
    # 创建输出目录
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # 生成长尾分布概率（Zipf分布的反转形式）
    # 目标：概率高的记录少（热门少数），概率低的记录多（冷门多数）
    # 使用反转的幂律分布：rank越大，概率越高
    alpha = 2.1
    ranks = np.arange(1, num_rows + 1)
    
    # 反转：让后面的rank获得更高的概率
    # 方法：使用 (num_rows + 1 - k)^(-alpha) 而不是 k^(-alpha)
    reversed_ranks = num_rows + 1 - ranks
    probabilities = reversed_ranks ** (-alpha)
    
    # 归一化使总和=1.0
    total_prob = sum(probabilities)
    probabilities = [p / total_prob for p in probabilities]
    
    # 打乱顺序，避免按顺序排列
    random.shuffle(probabilities)
    
    # 确保key唯一
    used_keys = set()
    
    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        # 头部注释（匹配README格式）
        gen_time = datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ')
        f.write("# PIR数据库记录文件\n")
        f.write("# 格式: key value probability\n")
        f.write(f"# 生成时间: {gen_time}\n")
        f.write(f"# 概率分布: 长尾分布 (反转幂律, alpha=2.1, 高概率记录少)\n\n")
        
        # 生成记录
        for i in range(num_rows):
            # 生成唯一key（纯数字）
            key = None
            while key is None or key in used_keys:
                key = generate_random_key(key_len)
            used_keys.add(key)
            
            # 生成value
            value = generate_random_value(value_len)
            
            # 概率格式化：使用科学计数法表示极小值，避免round导致的0.000000
            prob = probabilities[i]
            if prob < 1e-6:
                # 对于极小概率，使用科学计数法
                prob_str = f"{prob:.6e}"
            else:
                # 对于正常概率，保留6位小数
                prob_str = f"{prob:.6f}"
            
            # 写入一行
            f.write(f"{key} {value} {prob_str}\n")
    
    # 验证概率总和和分布特征
    sum_prob = sum(probabilities)
    high_prob_count = sum(1 for p in probabilities if p > 0.001)  # 高概率(>0.1%)的数量
    low_prob_count = sum(1 for p in probabilities if p < 0.0001)  # 低概率(<0.01%)的数量
    print(f"生成了 {num_rows} 条记录（长尾分布 alpha=2.1），key长度 {key_len}（纯数字），value长度 {value_len}")
    print(f"概率总和: {sum_prob:.6f}")
    print(f"高概率记录(>0.1%): {high_prob_count} 条, 低概率记录(<0.01%): {low_prob_count} 条")
    print(f"文件已保存到: {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="生成随机PIR数据库文件")
    parser.add_argument('-l', type=int, default=10, help="value长度 (默认: 10)")
    args = parser.parse_args()
    
    # 固定参数
    num_rows = 1000
    key_len = 8
    value_len = args.l
    output_file = '../my_db.txt'
    
    generate_random_db(num_rows, key_len, value_len, output_file)