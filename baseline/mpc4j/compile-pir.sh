#!/bin/bash
# mpc4j 编译脚本
# 用法:
#   ./compile-pir.sh pir   # 仅编译 mpc4j-s2pc-pir（默认）
#   ./compile-pir.sh all   # 编译整个 mpc4j

set -e  # 遇到错误立即退出

MODE="${1:-pir}"

show_usage() {
  echo "用法:"
  echo "  ./compile-pir.sh pir   # 仅编译 mpc4j-s2pc-pir（默认）"
  echo "  ./compile-pir.sh all   # 编译整个 mpc4j"
}

cd "$(dirname "$0")"

case "$MODE" in
  pir)
    echo "=========================================="
    echo "  编译 mpc4j-s2pc-pir 模块"
    echo "=========================================="
    echo ""
    echo "开始编译 PIR 模块..."
    mvn install -pl mpc4j-s2pc-pir -am \
      -Dos.detected.classifier=linux-x86_64 \
      -Dmaven.compiler.source=21 \
      -Dmaven.compiler.target=21 \
      -DskipTests
    ;;
  all)
    echo "=========================================="
    echo "  编译整个 mpc4j"
    echo "=========================================="
    echo ""
    echo "开始全量编译..."
    mvn install \
      -Dos.detected.classifier=linux-x86_64 \
      -Dmaven.compiler.source=21 \
      -Dmaven.compiler.target=21 \
      -DskipTests
    ;;
  -h|--help|help)
    show_usage
    exit 0
    ;;
  *)
    echo "错误: 不支持的参数 '$MODE'"
    echo ""
    show_usage
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "  编译成功！"
echo "=========================================="
