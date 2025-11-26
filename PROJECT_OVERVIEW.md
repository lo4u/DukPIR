# PIR系统完整项目

这是一个完整的PIR（Private Information Retrieval）隐私查询系统，包含后端API服务和前端Web应用。

## 🏗️ 项目结构

```
ddpir/
├── backend/                 # 后端服务
│   ├── main.go             # 主服务器
│   ├── auth.go             # 认证系统
│   ├── pir_service.go       # PIR服务封装
│   ├── pir_methods.go       # PIR核心方法
│   ├── handlers.go          # API处理器
│   ├── storage.go           # 数据存储
│   ├── go.mod              # Go依赖
│   ├── start.sh            # 启动脚本
│   ├── test.sh             # 测试脚本
│   └── README.md           # 后端文档
├── frontend-web/            # 前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── contexts/       # React上下文
│   │   ├── services/       # API服务
│   │   ├── App.jsx         # 主应用
│   │   └── main.jsx        # 入口文件
│   ├── package.json        # 前端依赖
│   ├── vite.config.js      # Vite配置
│   ├── start.sh           # 启动脚本
│   └── README.md          # 前端文档
└── frontend/               # 原始PIR代码
    └── main.go            # PIR核心实现
```

## 🚀 快速开始

### 1. 启动后端服务

```bash
cd backend

# 方式1: 自动生成随机数据库（推荐）
./start.sh 8080 ./data "" debug false 1000 10

# 方式2: 使用指定数据库文件
./start.sh 8080 ./data database.txt debug false

# 方式3: 强制初始化随机数据库
./start.sh 8080 ./data "" debug true 1000 10
```

### 2. 启动前端应用

```bash
cd frontend-web
./start.sh 3000 dev
```

### 3. 访问应用

- 前端地址: http://localhost:3000
- 后端API: http://localhost:8080

## 🔑 默认账户

- 管理员: `admin` / `admin123`
- 可以注册新用户

## 📋 功能特性

### 后端功能
- ✅ JWT身份认证
- ✅ 管理员和用户角色管理
- ✅ PIR隐私查询服务
- ✅ 动态数据管理（增删改查）
- ✅ 文件系统存储
- ✅ 性能统计
- ✅ 数据备份
- ✅ p_worse配置管理
- ✅ **自动随机数据库生成** ⭐

### 前端功能
- ✅ 响应式设计
- ✅ 双身份界面（管理员/用户）
- ✅ 现代化UI（Ant Design）
- ✅ 实时查询
- ✅ 数据管理
- ✅ 查询历史
- ✅ 性能统计展示

## 🎯 核心特性

### 隐私保护
- **用户无法控制数据库选择**: 系统根据p_worse值自动选择
- **智能查询策略**: 平衡性能和隐私保护
- **动态配置**: 管理员可调整隐私保护级别

### 数据管理
- **动态更新**: 支持运行时修改数据
- **无需重启**: 添加/删除记录不影响系统运行
- **文件存储**: 无需外部数据库依赖

### 用户体验
- **角色分离**: 管理员和用户不同的界面
- **实时反馈**: 查询结果和性能统计
- **历史记录**: 用户查询历史保存

## 🔧 技术栈

### 后端
- **Go**: 主要编程语言
- **Gin**: Web框架
- **JWT**: 身份认证
- **SimplePIR**: PIR算法实现
- **Cuckoo Filter**: 数据结构

### 前端
- **React 18**: 前端框架
- **Ant Design 5**: UI组件库
- **React Router 6**: 路由管理
- **Axios**: HTTP客户端
- **Vite**: 构建工具

## 📊 API接口

### 认证接口
- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册

### 系统接口
- `GET /health` - 健康检查
- `POST /system/init-pir` - 初始化PIR系统
- `GET /system/stats` - 获取统计信息

### 管理员接口
- `POST /admin/records` - 添加记录
- `PUT /admin/records/:key` - 更新记录
- `DELETE /admin/records/:key` - 删除记录
- `GET /admin/records` - 获取所有记录
- `GET /admin/users` - 获取用户列表
- `POST /admin/backup` - 备份数据
- `POST /admin/config/p-worse` - 设置p_worse值
- `GET /admin/config/p-worse` - 获取p_worse值

### 用户接口
- `POST /user/query` - 查询数据
- `GET /user/stats` - 获取统计信息

## 🎨 界面预览

### 登录页面
- 用户名密码登录
- 新用户注册
- 角色选择（admin/user）

### 管理员界面
- 仪表板：系统概览和统计
- 数据管理：增删改查PIR记录
- 用户管理：查看和管理用户
- 系统配置：设置p_worse等参数

### 用户界面
- 数据查询：关键字查询
- 查询历史：历史记录展示
- 性能统计：查询性能指标
- 结果展示：查询结果和统计

## 🔒 安全特性

- **JWT认证**: 安全的token认证机制
- **角色权限**: 严格的权限控制
- **密码加密**: bcrypt密码加密
- **CORS配置**: 跨域请求安全
- **输入验证**: 前后端数据验证

## 📈 性能特性

- **并行处理**: PIR查询并行执行
- **缓存机制**: 查询结果缓存
- **性能统计**: 详细的性能指标
- **响应式**: 支持移动设备
- **优化查询**: 智能数据库选择

## 🛠️ 开发指南

### 后端开发
1. 修改Go代码
2. 运行测试: `./test.sh`
3. 重启服务

### 前端开发
1. 修改React组件
2. 热重载自动更新
3. 构建生产版本: `npm run build`

### 部署
1. 构建前端: `npm run build`
2. 部署后端: 直接运行Go二进制文件
3. 配置反向代理

## 📝 注意事项

1. **端口配置**: 后端8080，前端3000
2. **数据目录**: 后端数据存储在`./data`目录
3. **依赖安装**: 确保Node.js和Go环境
4. **权限设置**: 确保脚本有执行权限
5. **网络配置**: 确保端口未被占用

## 🎉 完成状态

- ✅ 后端API服务完整实现
- ✅ 前端Web应用完整实现
- ✅ 双身份认证系统
- ✅ PIR隐私查询功能
- ✅ 数据管理功能
- ✅ 性能统计功能
- ✅ 响应式设计
- ✅ 完整的文档和脚本

这个完整的PIR系统提供了企业级的隐私查询解决方案，具有良好的用户体验和强大的功能特性。
