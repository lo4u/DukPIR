#!/bin/bash

# PIR前端应用启动脚本

echo "=== PIR前端应用启动脚本 ==="
echo

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: npm未安装，请先安装npm"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在frontend-web目录下运行此脚本"
    exit 1
fi

# 设置默认参数
PORT=${1:-3000}
MODE=${2:-dev}

echo "启动参数:"
echo "  端口: $PORT"
echo "  模式: $MODE"
echo

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
    echo
fi

# 构建启动命令
if [ "$MODE" = "build" ]; then
    echo "构建生产版本..."
    npm run build
    echo "构建完成，文件在dist目录中"
elif [ "$MODE" = "preview" ]; then
    echo "预览生产版本..."
    npm run preview -- --port $PORT
else
    echo "启动开发服务器..."
    echo "前端地址: http://localhost:$PORT"
    echo "后端API: http://localhost:8080"
    echo
    echo "请确保后端服务已启动在8080端口"
    echo
    
    # 启动开发服务器
    PORT=$PORT npm run dev
fi
