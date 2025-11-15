import React, { useState, useEffect, useRef } from 'react';
import SettingsPanel from './SettingsPanel';

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
  SettingOutlined,
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
  const [hotMode, setHotMode] = useState('rate');  // 新增：热门数据库模式状态
  const [hotRatio, setHotRatio] = useState(0.5);  // 新增：热门数据库比例状态
  const [loading, setLoading] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordForm] = Form.useForm();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isPopular, setIsPopular] = useState(false);

  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    const check = () => {
      // md 断点 ~768px：宽度小于等于 760-780 时视为移动/窄屏
      const mobile = window.innerWidth <= 760;
      setIsMobile(mobile);
      // 自动折叠侧栏以避免换行/白带问题
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
      // 1200px 为阈值：你可以根据需要调整
      const compact = window.innerWidth <= 1200;
      setIsCompact(compact);
      // 为了让 CSS 更容易控制，我们给 body 添加一个 class
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
      
      // 兼容 API 返回格式 + 补全 key（优先真实字段）
      let loadedRecords = Array.isArray(recordsRes.records) ? recordsRes.records : 
                         Array.isArray(recordsRes.data) ? recordsRes.data : 
                         Array.isArray(recordsRes) ? recordsRes : [];
      
      // 为每个记录补全 key（优先 rec.Key / rec.id；fallback 警告）
      loadedRecords = loadedRecords.map((rec, index) => {
        if (!rec.Key && !rec.id && !rec.key) {
          console.warn('记录缺少 Key/id/key:', rec, ' - 可能后端返回不完整');
        }
        return {
          key: rec.Key || rec.id || rec.key || `rec_${Date.now()}_${index}`,  // 优先后端 Key/id/key
          value: rec.Value || rec.value || '',  // 映射 Value to value
          probability: rec.Probability || rec.probability || 0,  // 映射 Probability to probability
          ...rec  // 保留其他字段
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

  const handleAddRecord = () => {
    setEditingRecord(null);
    recordForm.resetFields();
    setIsPopular(true); // 重置为默认值
    setRecordModalVisible(true);
  };

  const handleEditRecord = (record) => {
    console.log('编辑记录数据:', record);  // 调试
    if (!record.key) {
      message.error('记录无有效键，无法编辑');
      return;
    }
    
    setEditingRecord(record);
    recordForm.setFieldsValue({
      key: record.key,
      value: record.value || '',
      probability: record.probability || 0,
      is_popular: record.is_popular || true,
    });
    setIsPopular(record.is_popular || true); // 设置热门状态
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
      // 构造标准数据格式，确保 Key, Value, Probability (或其他后端期望的字段) 存在
      const dataToSend = {
        key: editingRecord ? editingRecord.key : values.key, // 编辑使用旧 key，添加使用新 key
        value: values.value,
        probability: Number(values.probability) || 0,
        };
      if (editingRecord) {
        const updateData = {
          ...editingRecord,
          value: values.value,
          probability: Number(values.probability) || 0,
           is_popular: values.is_popular || true, // 添加热门字段
        };
        
        await adminAPI.updateRecord(dataToSend.key, dataToSend);
        newRecord = { ...editingRecord, ...dataToSend };
        message.success('更新成功');
        setRecords(prev => prev.map(r => r.key === editingRecord.key ? newRecord : r));
      } else {
        // 【新增】：添加新数据时的概率总和检查
        const newProbability = Number(values.probability) || 0;
        if (newProbability < 0 || newProbability > 1) {
          message.error('请输入真实概率');
          return;  // 提前返回，不执行添加
        }
        const currentTotalProbability = records.reduce((sum, record) => sum + (Number(record.probability) || 0), 0);

        const addData = {
          "key": values.key,
          "value": values.value,
          "probability": newProbability,
          "is_popular": values.is_popular || true,
        };
        const res = await adminAPI.addRecord(dataToSend);
        newRecord = { 
          ...dataToSend, 
          key: res.key || res.id || dataToSend.key  // 优先后端返回的 key/id
        };
        console.log('添加响应:', res);  // 调试
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
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '概率',
      dataIndex: 'probability',
      key: 'probability',
      render: (value) => (value ?? 0).toFixed(6),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEditRecord(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条记录吗？"
            onConfirm={() => handleDeleteRecord(record.key)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
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
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
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
      render: (date) => new Date(date || Date.now()).toLocaleString(),
    },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={6} lg={6}>
                <Card>
                  <Statistic title="总记录数" value={stats?.records_count || 0} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6} lg={6}>
                <Card>
                  <Statistic title="用户数量" value={stats?.users_count || 0} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6} lg={6}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: '14px' }}>选择热门数据库模式</Text>
                    <Select value={hotMode} onChange={setHotMode} style={{ width: '100%' }}>
                      <Option value="rate">rate比例限制</Option>
                      <Option value="lim">lim概率限制</Option>
                    </Select>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6} lg={6}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: '14px' }}>热门数据库比例</Text>
                    <InputNumber
                      min={0}
                      max={1}
                      step={0.000001}
                      precision={6}
                      value={hotRatio}
                      onChange={setHotRatio}
                      style={{ width: '100%' }}
                    />
                  </div>
                </Card>
              </Col>
            </Row>
            
            <Card title="系统配置">
              <Form layout="inline">
                <Form.Item label="p_worse值">
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.1}
                    value={pWorse}
                    onChange={handlePWorseChange}
                    style={{ width: 120 }}
                  />
                </Form.Item>
                <Form.Item>
                  <Button icon={<CloudUploadOutlined />} onClick={handleBackup}>
                    备份数据
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>
        );
      
      case 'records':
        console.log('Records 数据:', records);  // 调试
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
                pagination={{ pageSize: 10 }}
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
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </ErrorBoundary>
        );
      
      case 'settings':
        return (
          <ErrorBoundary>
            <SettingsPanel
              pWorse={pWorse}
              handlePWorseChange={handlePWorseChange}
              stats={stats}
              handleBackup={handleBackup}
            />
          </ErrorBoundary>
        );
      
      default:
        return <div>请选择功能</div>;
    }
  };

  return (
    <ErrorBoundary>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          collapsible 
          collapsed={collapsed}
          onCollapse={(val) => setCollapsed(val)}
          breakpoint="lg"
          onBreakpoint={(broken) => { setCollapsed(broken); }}
          collapsedWidth={80}
          width={240}
          style={{ background: '#fff', minWidth: 0 }}
        >
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <h3 style={{ margin: 0, color: '#1890ff' }}>
              {collapsed ? 'PIR' : 'PIR管理系统'}
            </h3>
          </div>
          
          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ borderRight: 0, minWidth: 0  }}
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
            <Menu.Item key="settings" icon={<SettingOutlined />}>
              系统设置
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
            minWidth: 0
          }}>
            <h2 style={{ margin: 0 }}>管理员控制台</h2>
            <Space>
              <span>欢迎，{user?.username}</span>
              <Button icon={<LogoutOutlined />} onClick={logout}>
                退出
              </Button>
            </Space>
          </Header>
          
          <Content style={{ margin: '24px', background: '#fff', padding: 24, minWidth: 0, overflow: 'auto' }}>
           <div style={{ minWidth: 0, overflow: 'hidden'  }}>
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
                <Input placeholder="请输入键" />
              </Form.Item>
            )}
            
            <Form.Item
              name="value"
              label="值"
              rules={[{ required: true, message: '请输入值' }]}
            >
              <Input placeholder="请输入值" />
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
              />
            </Form.Item>
            
            {/* 添加是否热门选项 */}
            <Form.Item
              name="is_popular"
              label="是否热门"
              valuePropName="checked"
            >
              <Select placeholder="请选择是否热门">
                <Option value={true}>是</Option>
                <Option value={false}>否</Option>
              </Select>
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingRecord ? '更新' : '添加'}
                </Button>
                <Button onClick={() => setRecordModalVisible(false)}>
                  取消
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