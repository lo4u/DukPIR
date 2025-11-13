# PIR前端应用

这是一个基于React和Ant Design的PIR（Private Information Retrieval）前端应用，支持管理员和用户两种身份的不同界面。

## 功能特性

- **双身份支持**: 管理员和普通用户不同的界面和功能
- **响应式设计**: 支持桌面和移动设备
- **现代化UI**: 基于Ant Design组件库
- **实时查询**: 支持PIR隐私查询功能
- **数据管理**: 管理员可以管理记录和用户
- **查询历史**: 用户查询历史记录
- **性能统计**: 显示查询性能指标

## 技术栈

- **React 18**: 前端框架
- **Ant Design 5**: UI组件库
- **React Router 6**: 路由管理
- **Axios**: HTTP客户端
- **Vite**: 构建工具

## 安装和运行

### 1. 安装依赖

```bash
cd frontend-web
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动

### 3. 构建生产版本

```bash
npm run build
```

## 项目结构

```
frontend-web/
├── public/                 # 静态资源
├── src/
│   ├── components/         # React组件
│   │   ├── LoginPage.jsx   # 登录页面
│   │   ├── AdminDashboard.jsx # 管理员仪表板
│   │   ├── UserDashboard.jsx # 用户仪表板
│   │   └── AppRoutes.jsx   # 路由配置
│   ├── contexts/           # React上下文
│   │   └── AuthContext.jsx # 认证上下文
│   ├── services/           # API服务
│   │   └── api.js          # API接口封装
│   ├── App.jsx             # 主应用组件
│   ├── App.css             # 应用样式
│   ├── main.jsx            # 入口文件
│   └── index.css           # 全局样式
├── package.json            # 项目配置
├── vite.config.js          # Vite配置
└── index.html              # HTML模板
```

## 功能说明

### 认证系统

- **登录**: 支持用户名密码登录
- **注册**: 支持新用户注册
- **角色管理**: 区分管理员和普通用户
- **Token认证**: 使用JWT token进行身份验证

### 管理员功能

- **仪表板**: 系统概览和统计信息
- **记录管理**: 添加、编辑、删除PIR记录
- **用户管理**: 查看和管理用户账户
- **系统配置**: 设置p_worse值等系统参数
- **数据备份**: 执行数据备份操作

### 用户功能

- **数据查询**: 通过关键字查询数据
- **查询历史**: 查看历史查询记录
- **性能统计**: 查看查询性能指标
- **结果展示**: 显示查询结果和统计信息

## API集成

前端通过以下API与后端通信：

### 认证API
- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册

### 系统API
- `GET /health` - 健康检查
- `POST /system/init-pir` - 初始化PIR系统
- `GET /system/stats` - 获取统计信息

### 管理员API
- `POST /admin/records` - 添加记录
- `PUT /admin/records/:key` - 更新记录
- `DELETE /admin/records/:key` - 删除记录
- `GET /admin/records` - 获取所有记录
- `GET /admin/users` - 获取用户列表
- `POST /admin/backup` - 备份数据
- `POST /admin/config/p-worse` - 设置p_worse值
- `GET /admin/config/p-worse` - 获取p_worse值

### 用户API
- `POST /user/query` - 查询数据
- `GET /user/stats` - 获取统计信息

## 配置说明

### 代理配置

开发环境下，前端通过Vite代理将API请求转发到后端：

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

### 环境变量

可以创建 `.env` 文件配置环境变量：

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_TITLE=PIR隐私查询系统
```

## 样式说明

### 主题配置

使用Ant Design的ConfigProvider配置主题：

```javascript
<ConfigProvider locale={zhCN}>
  <AuthProvider>
    <App />
  </AuthProvider>
</ConfigProvider>
```

### 自定义样式

- `App.css`: 应用级样式
- `index.css`: 全局样式重置
- 组件内联样式: 特定组件的样式

### 占位符样式

为了便于后续定制，提供了占位符样式类：

```css
.placeholder-bg {
  background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%);
  /* 占位符背景图案 */
}
```

## 部署说明

### 开发环境

```bash
npm run dev
```

### 生产环境

1. 构建项目：
```bash
npm run build
```

2. 部署dist目录到Web服务器

3. 配置反向代理将API请求转发到后端

### Docker部署

可以创建Dockerfile进行容器化部署：

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 注意事项

1. **后端依赖**: 确保后端服务在8080端口运行
2. **CORS配置**: 后端需要配置CORS允许前端跨域请求
3. **Token管理**: 前端自动处理token的存储和刷新
4. **错误处理**: 401错误会自动跳转到登录页面
5. **响应式**: 支持移动设备访问

## 默认账户

- 管理员: `admin` / `admin123`
- 可以注册新用户或使用现有账户

## 开发指南

### 添加新功能

1. 在`src/components/`中创建新组件
2. 在`src/services/api.js`中添加API接口
3. 更新路由配置
4. 添加相应的样式

### 自定义主题

可以通过Ant Design的主题配置自定义颜色和样式：

```javascript
import { ConfigProvider } from 'antd';

const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};

<ConfigProvider theme={theme}>
  <App />
</ConfigProvider>
```

这个前端应用提供了完整的PIR系统用户界面，支持管理员和用户的不同需求，具有良好的用户体验和现代化的设计。
