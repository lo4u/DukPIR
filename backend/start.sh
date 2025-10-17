#!/bin/bash

# PIR后端服务启动脚本

echo "=== PIR后端服务启动脚本 ==="
echo

# 检查Go是否安装
if ! command -v go &> /dev/null; then
    echo "错误: Go未安装，请先安装Go"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "main.go" ]; then
    echo "错误: 请在backend目录下运行此脚本"
    exit 1
fi

# 智能依赖管理
echo "检查Go模块依赖..."
if [ ! -f "go.mod" ]; then
    echo "初始化Go模块..."
    go mod init pir-backend
fi

# 检查并安装Go依赖
if [ ! -f "go.sum" ]; then
    echo "下载Go模块依赖..."
    go mod tidy
    if [ $? -ne 0 ]; then
        echo "错误: Go模块整理失败"
        exit 1
    fi
    echo "Go模块依赖下载完成"
else
    echo "验证现有依赖..."
    go mod verify
    if [ $? -ne 0 ]; then
        echo "依赖验证失败，重新下载..."
        go mod tidy
    fi
fi

# 检查代码语法
echo "检查代码语法..."
go build -o /tmp/pir-backend-test .
if [ $? -ne 0 ]; then
    echo "错误: 代码编译失败，请检查语法错误"
    exit 1
fi
rm -f /tmp/pir-backend-test
echo "代码语法检查通过"

# 设置默认参数
PORT=${1:-8080}
DATA_DIR=${2:-./data}
DB_FILE=${3:-""}
MODE=${4:-debug}
INIT_DB=${5:-false}
NUM_ROWS=${6:-1000}
KEY_LEN=${7:-10}

echo "启动参数:"
echo "  端口: $PORT"
echo "  数据目录: $DATA_DIR"
echo "  数据库文件: ${DB_FILE:-"未指定（将生成随机数据库）"}"
echo "  运行模式: $MODE"
echo "  初始化数据库: $INIT_DB"
echo "  记录数: $NUM_ROWS"
echo "  键长度: $KEY_LEN"
echo

# 创建数据目录
mkdir -p "$DATA_DIR"

# 构建启动命令
CMD="go run main.go -port $PORT -data $DATA_DIR -mode $MODE"

# 添加数据库文件参数（如果指定）
if [ -n "$DB_FILE" ]; then
    CMD="$CMD -db $DB_FILE"
fi

# 添加初始化参数（如果指定）
if [ "$INIT_DB" = "true" ]; then
    CMD="$CMD -init -n $NUM_ROWS -l $KEY_LEN"
fi

echo "执行命令: $CMD"
echo

# 启动服务
echo "正在启动PIR后端服务..."
exec $CMD

# 使用说明（这行不会执行，因为上面有exec）
echo "使用说明:"
echo "  ./start.sh [端口] [数据目录] [数据库文件] [模式] [初始化] [记录数] [键长度]"
echo "  示例:"
echo "    ./start.sh 8080 ./data \"\" debug false 1000 10  # 自动生成随机数据库"
echo "    ./start.sh 8080 ./data database.txt debug false  # 使用指定数据库文件"
echo "    ./start.sh 8080 ./data \"\" debug true 500 8     # 强制初始化随机数据库"

# 上面那样会报错，请使用下面这条执行，如有必要，处理一下报错的原因。
go run main.go auth.go handlers.go pir_service.go pir_methods.go storage.go -port 8080 -data ./data -mode debug