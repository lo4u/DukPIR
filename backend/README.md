# PIR后端服务

这是一个基于Go和Gin框架的PIR（Private Information Retrieval）后端服务，支持管理员和用户两种身份，管理员可以添加数据，用户可以查询数据。

## 功能特性

- **身份认证系统**: 支持管理员和普通用户两种角色
- **PIR查询**: 基于SimplePIR和Cuckoo Filter的隐私信息检索
- **数据管理**: 管理员可以添加、更新、删除记录
- **文件存储**: 使用文件系统存储用户数据和PIR记录
- **性能统计**: 提供查询性能统计信息
- **数据备份**: 支持数据备份功能

## 安装和运行

### 1. 安装依赖

```bash
cd backend
go mod tidy
```

### 2. 运行服务

```bash
# 基本运行（自动生成随机数据库）
go run main.go

# 指定端口和数据目录
go run main.go -port 8080 -data ./data

# 使用指定的数据库文件
go run main.go -db database.txt

# 强制初始化PIR数据库
go run main.go -init -n 1000 -l 10

# 生产模式运行
go run main.go -mode release -port 8080
```

### 3. 命令行参数

| 参数 | 默认值 | 描述 |
|------|--------|------|
| `-port` | 8080 | 服务器端口 |
| `-data` | ./data | 数据存储目录 |
| `-db` | "" | 数据库文件路径（可选，不指定则生成随机数据库） |
| `-mode` | debug | 运行模式: debug, release |
| `-init` | false | 强制初始化PIR数据库 |
| `-n` | 1000 | 初始化时生成的记录数 |
| `-l` | 10 | 初始化时生成的键值长度 |

## API接口

### 认证接口

#### 用户登录
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### 用户注册
```http
POST /auth/register
Content-Type: application/json

{
  "username": "user1",
  "password": "password123",
  "role": "user"
}
```

### 系统接口

#### 健康检查
```http
GET /health
```

#### 初始化PIR系统
```http
POST /system/init-pir
Content-Type: application/json

{
  "num_rows": 1000,
  "key_len": 10,
  "mode": "rate",
  "val": 0.1,
  "rate_of_pop": 0.1,
  "p_worse": 0.1,
  "use_ntt": 1
}
```

#### 获取统计信息
```http
GET /system/stats
```

### 管理员接口

所有管理员接口都需要在请求头中包含认证token：
```
Authorization: Bearer <token>
```

#### 添加记录
```http
POST /admin/records
Content-Type: application/json
Authorization: Bearer <token>

{
  "key": "key1",
  "value": "value1",
  "probability": 0.5,
  "is_popular": true
}
```

#### 更新记录
```http
PUT /admin/records/:key
Content-Type: application/json
Authorization: Bearer <token>

{
  "value": "new_value",
  "probability": 0.6
}
```

#### 删除记录
```http
DELETE /admin/records/:key
Authorization: Bearer <token>
```

#### 获取所有记录
```http
GET /admin/records
Authorization: Bearer <token>
```

#### 获取单个记录
```http
GET /admin/records/:key
Authorization: Bearer <token>
```

#### 获取用户列表
```http
GET /admin/users
Authorization: Bearer <token>
```

#### 删除用户
```http
DELETE /admin/users/:username
Authorization: Bearer <token>
```

#### 备份数据
```http
POST /admin/backup
Authorization: Bearer <token>
```

#### 设置p_worse值
```http
POST /admin/config/p-worse
Content-Type: application/json
Authorization: Bearer <token>

{
  "p_worse": 0.2
}
```

#### 获取当前p_worse值
```http
GET /admin/config/p-worse
Authorization: Bearer <token>
```

### 用户接口

所有用户接口都需要在请求头中包含认证token：
```
Authorization: Bearer <token>
```

#### 查询数据
```http
POST /user/query
Content-Type: application/json
Authorization: Bearer <token>

{
  "key": "key1"
}
```

**注意**: 用户不能指定p_worse参数，系统会根据管理员配置的p_worse值自动选择使用热门数据库或完整数据库进行查询。

#### 获取统计信息
```http
GET /user/stats
Authorization: Bearer <token>
```

## 默认账户

系统启动时会自动创建默认管理员账户：
- 用户名: `admin`
- 密码: `admin123`

## 数据存储

### 文件结构

```
data/
├── users.json          # 用户数据
├── records.txt         # PIR记录数据
└── backups/           # 备份文件
    ├── users_20231201_120000.json
    └── records_20231201_120000.txt
```

### 记录文件格式

```
# PIR数据库记录文件
# 格式: key value probability
# 生成时间: 2023-12-01T12:00:00Z

key1 value1 0.500000
key2 value2 0.300000
key3 value3 0.200000
```

## 使用示例

### 1. 启动服务（自动生成随机数据库）

```bash
# 使用默认参数启动（自动生成1000条随机记录）
go run main.go

# 指定记录数和键长度
go run main.go -n 500 -l 8

# 使用指定的数据库文件
go run main.go -db my_database.txt

# 强制重新初始化数据库
go run main.go -init -n 2000 -l 12
```

### 2. 登录获取token

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 3. 添加记录

```bash
curl -X POST http://localhost:8080/admin/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"key":"testkey","value":"testvalue","probability":0.5,"is_popular":true}'
```

### 4. 查询数据

```bash
curl -X POST http://localhost:8080/user/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"key":"testkey"}'
```

## 性能特性

- **离线阶段**: 初始化PIR数据库，包括指纹数据库和值数据库
- **在线阶段**: 执行隐私查询，支持热门数据库和完整数据库
- **动态更新**: 支持添加、更新、删除记录而不需要重新初始化
- **性能统计**: 提供查询时间、通信量等性能指标
- **智能数据库选择**: 系统根据配置的p_worse值自动选择查询数据库

## p_worse配置说明

p_worse是系统的一个重要参数，用于控制查询时选择数据库的策略：

- **p_worse = 0**: 总是使用热门数据库查询（性能更好）
- **p_worse = 1**: 总是使用完整数据库查询（隐私保护更强）
- **0 < p_worse < 1**: 以p_worse概率使用完整数据库，以(1-p_worse)概率使用热门数据库

管理员可以通过API动态调整这个值，用户无法直接控制数据库选择，确保隐私保护策略的一致性。

## 安全特性

- **JWT认证**: 使用JWT token进行身份认证
- **角色权限**: 区分管理员和普通用户权限
- **密码加密**: 使用bcrypt加密存储密码
- **隐私保护**: 基于PIR技术保护查询隐私

## 错误处理

API返回标准的HTTP状态码和错误信息：

```json
{
  "error": "错误描述"
}
```

常见错误：
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未认证或token无效
- `403 Forbidden`: 权限不足
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误
