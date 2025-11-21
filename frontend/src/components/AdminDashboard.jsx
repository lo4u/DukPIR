import React, { useState, useEffect, useRef } from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('渲染错误:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
          <h2>出错了！</h2>
          <p>错误信息：{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>刷新页面</button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { 
  Layout, 
  Menu, 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  message, 
  Space,
  Statistic,
  Row,
  Col,
  Tag,
  Popconfirm,
  Typography
} from 'antd';
import {
  DashboardOutlined,
  DatabaseOutlined,
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CloudUploadOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, systemAPI } from '../services/api';

const { Header, Sider, Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

const AdminDashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [pWorse, setPWorse] = useState(0.1);
  const [hotMode, setHotMode] = useState('比例模式');
  const [hotParam, setHotParam] = useState(0.1);
  const [loading, setLoading] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordForm] = Form.useForm();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  // 系统设置状态
  const [systemForm] = Form.useForm();
  const [selectedFile, setSelectedFile] = useState(null);
  const [initLoading, setInitLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 760;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  
  useEffect(() => {
    const onResize = () => {
      const compact = window.innerWidth <= 1200;
      setIsCompact(compact);
      if (compact) {
        document.body.classList.add('layout-compact');
      } else {
        document.body.classList.remove('layout-compact');
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, usersRes, statsRes, pWorseRes] = await Promise.all([
        adminAPI.getAllRecords(),
        adminAPI.getAllUsers(),
        systemAPI.getStats(),
        adminAPI.getPWorse()
      ]);
      
      let loadedRecords = Array.isArray(recordsRes.records) ? recordsRes.records : 
                         Array.isArray(recordsRes.data) ? recordsRes.data : 
                         Array.isArray(recordsRes) ? recordsRes : [];
      
      loadedRecords = loadedRecords.map((rec, index) => {
        if (!rec.Key && !rec.id && !rec.key) {
          console.warn('记录缺少 Key/id/key:', rec, ' - 可能后端返回不完整');
        }
        return {
          key: rec.Key || rec.id || rec.key || `rec_${Date.now()}_${index}`,
          value: rec.Value || rec.value || '',
          probability: rec.Probability || rec.probability || 0,
          ...rec
        };
      });
      
      setRecords(loadedRecords);
      setUsers(usersRes.users || usersRes.data || []);
      setStats(statsRes);
      setPWorse(pWorseRes.p_worse || 0.1);
    } catch (error) {
      console.error('loadData 错误:', error.response?.data || error.message);
      message.error('加载数据失败');
    }
    setLoading(false);
  };

  // 系统设置相关函数
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        message.error('文件大小不能超过10MB');
        return;
      }
      
      const allowedTypes = ['.txt', '.csv', '.db', '.sqlite', '.json'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        message.error(`不支持的文件类型。请选择以下类型: ${allowedTypes.join(', ')}`);
        return;
      }
      
      setSelectedFile(file);
      systemForm.setFieldsValue({
        database_path: file.name
      });
      message.success(`已选择文件: ${file.name}`);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInitDatabase = async (values) => {
    try {
      if (!selectedFile) {
        message.error('请先选择数据库文件');
        return;
      }

      setInitLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        message.error('未找到认证token，请重新登录');
        setInitLoading(false);
        return;
      }

      // 更新仪表板显示的模式和参数
      const modeDisplay = values.mode === 'rate' ? '比例模式' : '概率模式';
      setHotMode(modeDisplay);
      setHotParam(values.hot_param);

      const requestData = {
        file_path: selectedFile.name,
        num_rows: 0,
        key_len: values.value_length || 8,
        mode: values.mode,
        val: values.hot_param,
        pro_limit: values.hot_param,
        rate_of_pop: values.hot_param,
        p_worse: values.p_worse || 0.1,
        use_ntt: values.use_ntt ? 1 : 0
      };

      console.log('发送初始化请求:', requestData);

      const response = await fetch('http://localhost:8080/system/init-pir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API响应:', result);
      message.success('数据库初始化成功');
      
    } catch (error) {
      console.error('初始化数据库失败:', error);
      message.error(`数据库初始化失败: ${error.message}`);
    } finally {
      setInitLoading(false);
    }
  };

  const handleAddRecord = () => {
    setEditingRecord(null);
    recordForm.resetFields();
    setRecordModalVisible(true);
  };

  const handleEditRecord = (record) => {
    console.log('编辑记录数据:', record);
    if (!record.key) {
      message.error('记录无有效键，无法编辑');
      return;
    }
    
    setEditingRecord(record);
    recordForm.setFieldsValue({
      key: record.key,
      value: record.value || '',
      probability: record.probability || 0,
    });
    setRecordModalVisible(true);
  };

  const handleDeleteRecord = async (key) => {
    if (!key) {
      message.error('无有效键，无法删除');
      return;
    }
    
    try {
      const deleteKey = String(key);
      await adminAPI.deleteRecord(deleteKey);
      message.success('删除成功');
      setRecords(prev => prev.filter(r => r.key !== key));
    } catch (error) {
      console.error('删除错误详情:', error.response?.data || error.message);
      message.error(`删除失败: ${error.response?.data?.message || error.message || '未知错误'}`);
    }
  };

  const handleRecordSubmit = async (values) => {
    try {
      let newRecord;
      const dataToSend = {
        key: editingRecord ? editingRecord.key : values.key,
        value: values.value,
        probability: Number(values.probability) || 0,
      };
      
      if (editingRecord) {
        const updateData = {
          ...editingRecord,
          value: values.value,
          probability: Number(values.probability) || 0,
        };
        
        await adminAPI.updateRecord(dataToSend.key, dataToSend);
        newRecord = { ...editingRecord, ...dataToSend };
        message.success('更新成功');
        setRecords(prev => prev.map(r => r.key === editingRecord.key ? newRecord : r));
      } else {
        const newProbability = Number(values.probability) || 0;
        if (newProbability < 0 || newProbability > 1) {
          message.error('请输入真实概率');
          return;
        }

        const addData = {
          "key": values.key,
          "value": values.value,
          "probability": newProbability,
          "is_popular": values.is_popular || true,
        };
        const res = await adminAPI.addRecord(addData);
        newRecord = { 
          ...addData, 
          key: res.key || res.id || addData.key
        };
        console.log('添加响应:', res);
        message.success('添加成功');
        setRecords(prev => [...prev, newRecord]);
      }
      
      setRecordModalVisible(false);
      recordForm.resetFields();
    } catch (error) {
      console.error('提交错误详情:', error.response?.data || error.message);
      message.error(`${editingRecord ? '更新' : '添加'}失败: ${error.response?.data?.message || error.message || '未知错误'}`);
    }
  };

  const handleBackup = async () => {
    try {
      await adminAPI.backupData();
      message.success('备份成功');
    } catch (error) {
      message.error('备份失败');
    }
  };

  const handlePWorseChange = async (value) => {
    try {
      await adminAPI.setPWorse(value);
      setPWorse(value);
      message.success('p_worse值设置成功');
    } catch (error) {
      message.error('设置失败');
    }
  };

  const recordColumns = [
    {
      title: '键',
      dataIndex: 'key',
      key: 'key',
      width: 200,
      ellipsis: true,
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      width: 250,
      ellipsis: true,
    },
    {
      title: '概率',
      dataIndex: 'probability',
      key: 'probability',
      width: 120,
      render: (value) => (value ?? 0).toFixed(6),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEditRecord(record)}
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条记录吗？"
            onConfirm={() => handleDeleteRecord(record.key)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '用户'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date) => new Date(date || Date.now()).toLocaleString(),
    },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={6} lg={6}>
                <Card 
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      color: 'rgba(0, 0, 0, 0.45)',
                      marginBottom: 4,
                      fontWeight: 400,
                      lineHeight: '22px'
                    }}>
                      总记录数
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 600,
                      color: '#000',
                      lineHeight: '1.2'
                    }}>
                      {stats?.records_count || 0}
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6} lg={6}>
                <Card 
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      color: 'rgba(0, 0, 0, 0.45)',
                      marginBottom: 4,
                      fontWeight: 400,
                      lineHeight: '22px'
                    }}>
                      用户数量
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 600,
                      color: '#000',
                      lineHeight: '1.2'
                    }}>
                      {stats?.users_count || 0}
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6} lg={6}>
                <Card 
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      color: 'rgba(0, 0, 0, 0.45)',
                      marginBottom: 4,
                      fontWeight: 400,
                      lineHeight: '22px'
                    }}>
                      热门数据库选取模式
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 600,
                      color: '#000',
                      lineHeight: '1.2'
                    }}>
                      {hotMode}
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6} lg={6}>
                <Card 
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      color: 'rgba(0, 0, 0, 0.45)',
                      marginBottom: 4,
                      fontWeight: 400,
                      lineHeight: '22px'
                    }}>
                      热门数据库选取参数
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 600,
                      color: '#000',
                      lineHeight: '1.2'
                    }}>
                      {hotParam.toFixed(3)}
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
            
            {/* 系统设置部分保持不变 */}
            <Card title="系统设置">
              <Form 
                form={systemForm} 
                layout="vertical" 
                onFinish={handleInitDatabase}
                style={{ maxWidth: 800, margin: '0 auto' }}
                initialValues={{
                  mode: 'rate',
                  hot_param: 0.1,
                  p_worse: 0.1,
                  use_ntt: 1
                }}
              >
                <Row gutter={[24, 16]}>
                  <Col span={24}>
                    <Form.Item 
                      name="database_path" 
                      label="数据库路径" 
                      rules={[{ required: true, message: '请选择数据库文件' }]}
                    >
                      <Input 
                        placeholder="请选择数据库文件" 
                        readOnly
                        addonAfter={
                          <Button 
                            type="link" 
                            size="small"
                            onClick={triggerFileInput}
                            disabled={initLoading}
                          >
                            {selectedFile ? '重新选择' : '选择文件'}
                          </Button>
                        }
                      />
                    </Form.Item>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                      accept=".txt,.csv,.db,.sqlite,.json"
                      disabled={initLoading}
                    />
                    
                    {selectedFile && (
                      <div style={{ 
                        marginTop: 8, 
                        padding: 12, 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: 6,
                        fontSize: '13px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>文件名:</span>
                          <span>{selectedFile.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>文件大小:</span>
                          <span>{(selectedFile.size / 1024).toFixed(2)} KB</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 500 }}>类型:</span>
                          <span>{selectedFile.type || '未知'}</span>
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="value_length"
                      label="值长度"
                      rules={[
                        { required: true, message: '请输入值长度' },
                        { type: 'integer', min: 1, message: '值长度必须为正整数' }
                      ]}
                    >
                      <InputNumber 
                        min={1}
                        placeholder="请输入正整数"
                        style={{ width: '100%' }}
                        disabled={initLoading}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="mode"
                      label="热门数据库选取模式"
                      rules={[{ required: true, message: '请选择选取模式' }]}
                    >
                      <Select placeholder="请选择模式" disabled={initLoading}>
                        <Select.Option value="rate">比例模式</Select.Option>
                        <Select.Option value="lim">概率模式</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="hot_param"
                      label="热门数据库选取参数"
                      rules={[
                        { required: true, message: '请输入选取参数' },
                        { type: 'number', min: 0, max: 1, message: '参数必须在0~1之间' }
                      ]}
                    >
                      <InputNumber 
                        min={0}
                        max={1}
                        step={0.001}
                        placeholder="0~1的浮点数"
                        style={{ width: '100%' }}
                        precision={3}
                        disabled={initLoading}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="p_worse"
                      label="最坏出错概率"
                      rules={[
                        { required: true, message: '请输入最坏出错概率' },
                        { type: 'number', min: 0, max: 1, message: '概率必须在0~1之间' }
                      ]}
                    >
                      <InputNumber 
                        min={0}
                        max={1}
                        step={0.01}
                        placeholder="0~1的浮点数"
                        style={{ width: '100%' }}
                        precision={2}
                        disabled={initLoading}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="use_ntt"
                      label="使用NTT加速"
                      rules={[{ required: true, message: '请选择是否使用NTT加速' }]}
                    >
                      <Select placeholder="请选择" disabled={initLoading}>
                        <Select.Option value={1}>是</Select.Option>
                        <Select.Option value={0}>否</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                  <Space>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={initLoading}
                      disabled={!selectedFile}
                      style={{ minWidth: 120, height: 40 }}
                    >
                      {initLoading ? '初始化中...' : '初始化数据库'}
                    </Button>
                   
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </div>
        );
      
      case 'records':
        console.log('Records 数据:', records);
        return (
          <ErrorBoundary>
            <Card
              title="记录管理"
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRecord}>
                  添加记录
                </Button>
              }
            >
              <Table
                columns={recordColumns}
                dataSource={records || []}
                rowKey={(record) => record.key || record.id || 'fallback'}
                loading={loading}
                pagination={{ 
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条记录`
                }}
                scroll={{ x: 800 }}
                size="middle"
              />
            </Card>
          </ErrorBoundary>
        );
      
      case 'users':
        return (
          <ErrorBoundary>
            <Card title="用户管理">
              <Table
                columns={userColumns}
                dataSource={users}
                rowKey="username"
                loading={loading}
                pagination={{ 
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true
                }}
                scroll={{ x: 600 }}
                size="middle"
              />
            </Card>
          </ErrorBoundary>
        );
      
      default:
        return <div>请选择功能</div>;
    }
  };

  return (
    <ErrorBoundary>
      <Layout style={{ minHeight: '100vh', fontFamily: 'Ubuntu, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <Sider 
          collapsible 
          collapsed={collapsed}
          onCollapse={(val) => setCollapsed(val)}
          breakpoint="lg"
          onBreakpoint={(broken) => { setCollapsed(broken); }}
          collapsedWidth={isMobile ? 0 : 80}
          width={240}
          style={{ 
            background: '#fff', 
            minWidth: 0,
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
            padding: '0 16px'
          }}>
            <h3 style={{ 
              margin: 0, 
              color: '#1890ff',
              fontSize: collapsed ? '16px' : '18px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {collapsed ? 'PIR' : 'PIR管理系统'}
            </h3>
          </div>
          
          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ 
              borderRight: 0, 
              minWidth: 0,
              padding: '8px 0'
            }}
          >
            <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
              仪表板
            </Menu.Item>
            <Menu.Item key="records" icon={<DatabaseOutlined />}>
              记录管理
            </Menu.Item>
            <Menu.Item key="users" icon={<UserOutlined />}>
              用户管理
            </Menu.Item>
          </Menu>
        </Sider>
        
        <Layout>
          <Header style={{ 
            background: '#fff', 
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            minWidth: 0,
            height: 64,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>管理员控制台</Title>
            <Space>
              <Text>欢迎，{user?.username}</Text>
              <Button icon={<LogoutOutlined />} onClick={logout} size="middle">
                退出
              </Button>
            </Space>
          </Header>
          
          <Content style={{ 
            margin: '24px', 
            background: '#f5f5f5', 
            padding: 24, 
            minWidth: 0, 
            overflow: 'auto',
            borderRadius: 8
          }}>
            <div style={{ 
              minWidth: 0, 
              overflow: 'hidden',
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              {renderContent()}
            </div>
          </Content>
        </Layout>

        {/* 记录编辑模态框 */}
        <Modal
          title={editingRecord ? '编辑记录' : '添加记录'}
          open={recordModalVisible}
          onCancel={() => setRecordModalVisible(false)}
          footer={null}
          width={520}
          styles={{
            body: {
              padding: '24px 0'
            }
          }}
        >
          <Form
            form={recordForm}
            layout="vertical"
            onFinish={handleRecordSubmit}
          >
            {!editingRecord && (
              <Form.Item
                name="key"
                label="键"
                rules={[{ required: true, message: '请输入键' }]}
              >
                <Input placeholder="请输入键" size="large" />
              </Form.Item>
            )}
            
            <Form.Item
              name="value"
              label="值"
              rules={[{ required: true, message: '请输入值' }]}
            >
              <Input placeholder="请输入值" size="large" />
            </Form.Item>
            
            <Form.Item
              name="probability"
              label="概率"
              rules={[{ required: true, message: '请输入概率' }]}
            >
              <InputNumber 
                min={0} 
                max={1} 
                step={0.001} 
                style={{ width: '100%' }}
                placeholder="请输入概率"
                size="large"
              />
            </Form.Item>
            
            {/* 只在添加记录时显示是否热门选项 */}
            {!editingRecord && (
              <Form.Item
                name="is_popular"
                label="是否热门"
                initialValue={true}
              >
                <Select placeholder="请选择是否热门" size="large">
                  <Option value={true}>是</Option>
                  <Option value={false}>否</Option>
                </Select>
              </Form.Item>
            )}
            
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setRecordModalVisible(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingRecord ? '更新' : '添加'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    </ErrorBoundary>
  );
};

export default AdminDashboard;