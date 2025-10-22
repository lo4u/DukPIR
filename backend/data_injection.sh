#!/bin/bash
## 1.将您的自定义数据命名为 custom_database.txt 并放在与脚本相同的目录下。
## 2.在终端中执行：bash inject_data.sh

# --- 配置参数 ---
DATABASE_FILE="custom_database.txt"
BACKEND_URL="http://localhost:8080/admin/records"
AUTH_URL="http://localhost:8080/auth/login"

# 默认的管理员凭证 (请根据您的实际设置修改)
ADMIN_USER="admin"
ADMIN_PASS="admin123"

echo "--- 步骤 1: 获取 ADMIN_TOKEN ---"

# 尝试登录并获取 token
TOKEN_RESPONSE=$(curl -s -X POST "$AUTH_URL" \
  -H "Content-Type: application/json" \
  -d '{"username":"'"$ADMIN_USER"'","password":"'"$ADMIN_PASS"'"}' \
  | jq -r '.token')

# 检查 token 是否成功获取
if [ "$TOKEN_RESPONSE" == "null" ] || [ -z "$TOKEN_RESPONSE" ]; then
    echo "错误：无法获取 ADMIN_TOKEN。请检查后端是否运行、用户名/密码是否正确，以及 jq 是否已安装。"
    # 尝试打印完整的错误信息（如果存在）
    curl -s -X POST "$AUTH_URL" -H "Content-Type: application/json" -d '{"username":"'"$ADMIN_USER"'","password":"'"$ADMIN_PASS"'"}'
    echo ""
    exit 1
fi

# 将获取到的 token 赋值给 ADMIN_TOKEN 变量
ADMIN_TOKEN="$TOKEN_RESPONSE"
echo "ADMIN_TOKEN 获取成功。"

echo "--- 步骤 2: 检查文件和开始注入 ---"

# 确保数据库文件存在
if [ ! -f "$DATABASE_FILE" ]; then
    echo "错误：数据库文件 $DATABASE_FILE 不存在。"
    exit 1
fi

# 逐行读取数据库文件
# ... (原有的数据注入逻辑保持不变)
while IFS=' ' read -r key value probability; do
    # 检查是否是有效行 (非空且有三个字段)
    if [ -n "$key" ] && [ -n "$value" ] && [ -n "$probability" ]; then
        
        # 确定 is_popular 字段：如果 probability > 0.5 (一个常见的阈值) 则设为 true
        # 注意：实际的 "热门" 标记应该根据您的 DD-PIR 实现来确定。
        # 这里我们假设 probability > 0.5 就是 is_popular: true
        is_popular="false"
        if (( $(echo "$probability > 0.5" | bc -l) )); then
            is_popular="true"
        fi

        # 构造 JSON 数据
        JSON_DATA=$(cat <<-EOF
{
  "key": "$key",
  "value": "$value",
  "probability": $probability,
  "is_popular": $is_popular
}
EOF
)

        # 执行 POST 请求
        echo "注入记录: Key=$key, Probability=$probability"
        curl -s -X POST "$BACKEND_URL" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -d "$JSON_DATA" | jq .
    fi
done < "$DATABASE_FILE"

echo "--- 数据注入完成 ---"
