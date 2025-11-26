import React, { useState } from 'react';
import { Form, Input, Button, Card, Tabs, message, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    setLoading(true);
    const result = await login(values.username, values.password);
    setLoading(false);
    
    if (result.success) {
      message.success('登录成功');
      navigate('/dashboard');
    } else {
      message.error(result.error);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    // 修复：传默认 role: "user"（后端期望第三个参数）
    const result = await register(values.username, values.password, "user");
    setLoading(false);
    
    if (result.success) {
      message.success('注册成功，请登录');
      loginForm.setFieldsValue({ username: values.username });
    } else {
      message.error(result.error);
    }
  };

  // 确认密码验证函数
  const passwordValidator = (_, value) => {
    const password = registerForm.getFieldValue('password');
    if (!value || value === password) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('两次密码不一致'));
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'flex-end',
      paddingRight: '10%',
      backgroundImage: 'url(/assets/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 半透明遮罩层增强对比度 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.15)',
        zIndex: 0
      }} />
      
      <Card 
        title={
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              background: '#fff',
              border: '3px solid #2d3748'
            }}>
              <img 
                src="/assets/logo.jpg" 
                alt="PIR Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;background:#4a5568;display:flex;align-items:center;justify-content:center"><svg style="width:50px;height:50px;color:#fff" fill="currentColor" viewBox="0 0 20 20"><path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"></path><path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"></path><path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"></path></svg></div>';
                }}
              />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d3748', marginBottom: '8px' }}>
              关键字匿踪查询系统
            </div>
            <div style={{ fontSize: '15px', color: '#718096', letterSpacing: '1px' }}>Keyword Private Information Retrieval</div>
          </div>
        }
        style={{ 
          width: 520, 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35), 0 8px 20px rgba(0, 0, 0, 0.2)',
          borderRadius: '16px',
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          marginRight: '8%',
        }}
        bordered={false}
      >
        <Tabs
          defaultActiveKey="login"
          items={[
            {
              key: 'login',
              label: (
                <span>
                  <LoginOutlined />
                  登录
                </span>
              ),
              children: (
                <Form
                  form={loginForm}
                  name="login"
                  onFinish={handleLogin}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="用户名" 
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined />} 
                      placeholder="密码" 
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      block
                    >
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: (
                <span>
                  <UserAddOutlined />
                  注册
                </span>
              ),
              children: (
                <Form
                  form={registerForm}
                  name="register"
                  onFinish={handleRegister}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="用户名" 
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: '请输入密码' },
                      { min: 6, message: '密码至少6位' }
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined />} 
                      placeholder="密码" 
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="confirmPassword"
                    rules={[
                      { required: true, message: '请确认密码' },
                      { validator: passwordValidator }
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined />} 
                      placeholder="确认密码" 
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      block
                    >
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '24px', 
          padding: '16px',
          background: '#f7fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ margin: 0, color: '#4a5568', fontSize: '13px' }}>
            <LockOutlined style={{ marginRight: '8px' }} />
            默认管理员账户：<strong>admin / admin123</strong>
          </p>
        </div>
      </Card>
      
      {/* 页脚信息 */}
      <div style={{
        position: 'fixed',
        bottom: '12px',
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: 999,
        pointerEvents: 'none'
      }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '16px',
          pointerEvents: 'auto'
        }}>
          {/* 星舟图案 */}
          <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 4L36 20L52 24L36 28L32 44L28 28L12 24L28 20L32 4Z" fill="#667eea" opacity="0.9"/>
            <path d="M32 20L34 28L42 30L34 32L32 40L30 32L22 30L30 28L32 20Z" fill="#764ba2" opacity="0.7"/>
            <circle cx="32" cy="30" r="3" fill="#ffd700"/>
            <path d="M20 48L22 52L26 54L22 56L20 60L18 56L14 54L18 52L20 48Z" fill="#667eea" opacity="0.6"/>
            <path d="M44 48L46 52L50 54L46 56L44 60L42 56L38 54L42 52L44 48Z" fill="#764ba2" opacity="0.6"/>
          </svg>
          
          <div style={{ 
            fontSize: '13px', 
            color: '#555',
            textShadow: '0 1px 3px rgba(255,255,255,0.8), 0 0 10px rgba(255,255,255,0.5)'
          }}>
            <div style={{ marginBottom: '4px', fontWeight: 600 }}>本站为第十届全国密码技术竞赛参赛作品</div>
            <div>
              <a href="#" style={{ color: '#667eea', textDecoration: 'none', marginRight: '12px', fontWeight: 500 }}>关于我们</a>
              <span style={{ color: '#999' }}>|</span>
              <a href="#" style={{ color: '#667eea', textDecoration: 'none', marginLeft: '12px', fontWeight: 500 }}>联系我们</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;