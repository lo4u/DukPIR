import sys

def load_records(file_path):
    """从records.txt加载记录，跳过头部"""
    records = []
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for line in lines:
            line = line.strip()
            if line.startswith('#') or not line:
                continue
            parts = line.split()
            if len(parts) == 3:
                key, value, prob_str = parts
                prob = float(prob_str)
                records.append({'key': key, 'value': value, 'probability': prob})
    return records

def analyze_popular(records, rate=0.1):
    """划分热门/非热门"""
    # 按概率降序排序
    records.sort(key=lambda x: x['probability'], reverse=True)
    
    total = len(records)
    popular_count = int(total * rate)
    
    popular = records[:popular_count]
    non_popular = records[popular_count:]
    
    print(f"总记录: {total}")
    print(f"热门记录 (前 {rate*100}% 高概率, {popular_count} 条, 示例前5):")
    for rec in popular[:5]:  # 只打印前5条热门
        print(f"  Key: {rec['key']}, Value: {rec['value']}, Prob: {rec['probability']:.6f}")
    if popular_count > 5:
        print(f"  ... (剩余 {popular_count - 5} 条热门记录已保存到文件)")
    
    print(f"\n非热门记录 ({len(non_popular)} 条, 示例前5):")
    for rec in non_popular[:5]:
        print(f"  Key: {rec['key']}, Value: {rec['value']}, Prob: {rec['probability']:.6f}")
    if len(non_popular) > 5:
        print(f"  ... (剩余 {len(non_popular) - 5} 条非热门记录已保存到文件)")
    
    # 保存完整列表到文件
    with open('popular_records.txt', 'w') as f:
        f.write("# 热门记录 (高概率前10%)\n")
        for rec in popular:
            f.write(f"{rec['key']} {rec['value']} {rec['probability']:.6f}\n")
    with open('non_popular_records.txt', 'w') as f:
        f.write("# 非热门记录\n")
        for rec in non_popular:
            f.write(f"{rec['key']} {rec['value']} {rec['probability']:.6f}\n")
    
    print(f"\n完整详细列表已保存: popular_records.txt (热门 {popular_count} 条), non_popular_records.txt (非热门 {len(non_popular)} 条)")

if __name__ == "__main__":
    file_path = './data/records.txt'
    records = load_records(file_path)
    if not records:
        print("错误: 无记录加载，请检查文件。")
        sys.exit(1)
    analyze_popular(records)