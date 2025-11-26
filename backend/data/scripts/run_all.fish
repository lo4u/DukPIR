#!/usr/bin/env fish

# PIR数据库一键生成和处理脚本
# 功能：生成数据库 -> 分析热门数据 -> 概率采样

set -l SCRIPT_DIR (dirname (status -f))
set -l DATA_DIR (dirname $SCRIPT_DIR)

echo "================================"
echo "PIR数据库一键处理脚本"
echo "================================"
echo ""

# 检查Python环境
if not command -v python3 > /dev/null
    echo "错误: 未找到python3，请先安装Python 3"
    exit 1
end

# 检查numpy是否安装
if not python3 -c "import numpy" 2>/dev/null
    echo "警告: numpy未安装，正在安装..."
    pip3 install numpy
end

# 解析参数
set -l value_length 10
set -l sample_count 10

# 简单的参数解析
for i in (seq (count $argv))
    switch $argv[$i]
        case '-l' '--length'
            set value_length $argv[(math $i + 1)]
        case '-n' '--num'
            set sample_count $argv[(math $i + 1)]
        case '-h' '--help'
            echo "使用方法: ./run_all.fish [选项]"
            echo ""
            echo "选项:"
            echo "  -l, --length NUM    设置value长度 (默认: 10)"
            echo "  -n, --num NUM       设置采样数量 (默认: 10)"
            echo "  -h, --help          显示此帮助信息"
            echo ""
            echo "示例:"
            echo "  ./run_all.fish                    # 使用默认参数"
            echo "  ./run_all.fish -l 20 -n 15        # 设置value长度20，采样15条"
            exit 0
    end
end

echo "配置参数:"
echo "  Value长度: $value_length"
echo "  采样数量: $sample_count"
echo ""

# 切换到scripts目录
cd $SCRIPT_DIR

# 步骤1: 生成数据库
echo "步骤 1/3: 生成数据库..."
echo "----------------------------------------"
python3 generate_db.py -l $value_length
if test $status -ne 0
    echo "错误: 数据库生成失败"
    exit 1
end
echo ""

# 步骤2: 分析热门数据
echo "步骤 2/3: 分析热门数据..."
echo "----------------------------------------"
python3 analyze_popular.py
if test $status -ne 0
    echo "错误: 热门数据分析失败"
    exit 1
end
echo ""

# 步骤3: 概率采样
echo "步骤 3/3: 概率采样..."
echo "----------------------------------------"
python3 sample_by_probability.py -n $sample_count
if test $status -ne 0
    echo "错误: 概率采样失败"
    exit 1
end
echo ""

# 完成
echo "================================"
echo "✓ 全部完成！"
echo "================================"
echo ""
echo "生成的文件:"
echo "  - $DATA_DIR/my_db.txt              (完整数据库)"
echo "  - $DATA_DIR/popular_records.txt    (热门记录)"
echo "  - $DATA_DIR/non_popular_records.txt (非热门记录)"
echo "  - $DATA_DIR/sampled_records.txt    (采样记录)"
echo ""
