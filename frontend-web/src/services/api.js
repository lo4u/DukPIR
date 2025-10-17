import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authAPI = {
  // 登录
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  // 注册
  register: (username, password, role) => 
    api.post('/auth/register', { username, password, role }),
};

// 系统API
export const systemAPI = {
  // 健康检查
  health: () => api.get('/health'),
  
  // 初始化PIR系统
  initPIR: (config) => api.post('/system/init-pir', config),
  
  // 获取统计信息
  getStats: () => api.get('/system/stats'),
};

// 管理员API
export const adminAPI = {
  // 记录管理
  addRecord: (record) => api.post('/admin/records', record),
  updateRecord: (key, record) => api.put(`/admin/records/${key}`, record),
  deleteRecord: (key) => api.delete(`/admin/records/${key}`),
  getAllRecords: () => api.get('/admin/records'),
  getRecord: (key) => api.get(`/admin/records/${key}`),
  
  // 用户管理
  getAllUsers: () => api.get('/admin/users'),
  deleteUser: (username) => api.delete(`/admin/users/${username}`),
  
  // 系统管理
  backupData: () => api.post('/admin/backup'),
  setPWorse: (pWorse) => api.post('/admin/config/p-worse', { p_worse: pWorse }),
  getPWorse: () => api.get('/admin/config/p-worse'),
};

// 用户API
export const userAPI = {
  // 查询数据
  query: (key) => api.post('/user/query', { key }),
  
  // 获取统计信息
  getStats: () => api.get('/user/stats'),
};

export default api;
