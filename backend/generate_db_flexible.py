import random
import string
import os
import argparse
from datetime import datetime

def generate_random_string(length):
    """生成随机字符串（a-zA-Z0-9）"""
    charset = string.ascii_letters + string.digits
    return ''.join(random.choices(charset, k=length))

def generate_random_db(num_rows, key_len, output_file):
    """生成随机数据库并写入文件"""
    # 创建输出目录
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # 生成随机概率（归一化总和=1.0）
    probabilities = [random.random() for _ in range(num_rows)]
    total_prob = sum(probabilities)
    probabilities = [p / total_prob for p in probabilities]
    
    # 确保key唯一
    used_keys = set()
    
    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        # 头部注释（匹配README格式）
        gen_time = datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ')
        f.write("# PIR数据库记录文件\n")
        f.write("# 格式: key value probability\n")
        f.write(f"# 生成时间: {gen_time}\n\n")
        
        # 生成记录
        for i in range(num_rows):
            # 生成唯一key
            key = None
            while key is None or key in used_keys:
                key = generate_random_string(key_len)
            used_keys.add(key)
            
            # 生成value
            value = generate_random_string(key_len)
            
            # 概率（保留6位小数）
            prob = round(probabilities[i], 6)
            
            # 写入一行
            f.write(f"{key} {value} {prob}\n")
    
    # 验证概率总和
    sum_prob = sum(probabilities)
    print(f"生成了 {num_rows} 条随机记录，键长度 {key_len}，概率总和: {sum_prob:.6f}")
    print(f"文件已保存到: {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="生成随机PIR数据库文件")
    parser.add_argument('-n', type=int, default=1000, help="记录数 (默认: 1000)")
    parser.add_argument('-l', type=int, default=10, help="键/值长度 (默认: 10)")
    parser.add_argument('-o', type=str, default='./data/records.txt', help="输出文件路径 (默认: ./data/records.txt)")
    args = parser.parse_args()
    
    generate_random_db(args.n, args.l, args.o)
    
'''自定义参数，在终端用命令：
py generate_db.py -n 500 -l 8 -o ./data/my_db.txt
生成500行长度为8记录，保存到/data/my_db.txt目录下

如果不自定义参数py generate_db.py
生成1000条记录，长度10，保存到./data/records.txt'''