import React, { useState } from 'react';
import { Form, Input, Button, Card, Tabs, message, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
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
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        title={
          <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>
            PIR隐私查询系统
          </div>
        }
        style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
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
        
        <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
          <p>默认管理员账户：admin / admin123</p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;