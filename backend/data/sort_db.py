import os

def sort_data_by_probability(input_path, output_path):
    # 用于存储解析后的数据
    data_records = []

    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            # 读取所有行
            lines = f.readlines()

            # 检查行数是否足够
            if len(lines) < 4:
                print("错误：文件行数不足4行。")
                return

            # 从第5行开始处理 (索引为4，因为索引从0开始)
            # lines[4:] 表示忽略前4行
            for line in lines[4:]:
                # 去除首尾空白字符
                line = line.strip()
                
                # 跳过空行（防止文件末尾有空行导致报错）
                if not line:
                    continue

                # 按照空白字符分割 (默认分割空格或Tab)
                parts = line.split()

                # 确保这一行至少有3个部分 (key, value, probability)
                if len(parts) >= 3:
                    key = parts[0]
                    value = parts[1]
                    try:
                        # 将第三个部分转换为浮点数以便排序
                        prob = float(parts[2])
                        # 将整行数据以元组形式存入 list: (原始行文本, 概率数值)
                        # 或者存储解析后的字段，这里为了输出方便，重新组装
                        data_records.append({
                            'key': key,
                            'value': value,
                            'prob': prob
                        })
                    except ValueError:
                        print(f"警告：无法解析概率值的一行: {line}")

        # 对数据进行排序
        # key参数指定排序依据，x['prob'] 表示按概率排
        # reverse=True 表示降序 (从大到小)，如果你想要从小到大，改成 False
        data_records.sort(key=lambda x: x['prob'], reverse=True)

        # 写入新文件
        with open(output_path, 'w', encoding='utf-8') as f_out:
            # 可选：如果你想保留原文件的头4行，可以在这里先写入
            # f_out.write("".join(lines[:4])) 
            
            # 写入排序后的数据
            for item in data_records:
                # 使用 f-string 格式化输出，保持原有结构
                f_out.write(f"{item['key']} {item['value']} {item['prob']}\n")

        print(f"处理完成！")
        print(f"共排序了 {len(data_records)} 条数据。")
        print(f"结果已保存至: {output_path}")

    except FileNotFoundError:
        print(f"错误：找不到文件 {input_path}")
    except Exception as e:
        print(f"发生未知错误: {e}")

# --- 配置部分 ---

# 假设你的脚本和 txt 文件在同一目录下，或者你可以写绝对路径
# 根据你的截图，文件名是 my_db.txt
input_filename = 'my_db.txt' 
output_filename = 'my_db_sorted.txt'

# 执行函数
if __name__ == '__main__':
    sort_data_by_probability(input_filename, output_filename)