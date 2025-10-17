import React, { useState, useEffect } from 'react';
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
  Switch, 
  message, 
  Space,
  Statistic,
  Row,
  Col,
  Tag,
  Popconfirm
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

const AdminDashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [pWorse, setPWorse] = useState(0.1);
  const [loading, setLoading] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordForm] = Form.useForm();
  const { user, logout } = useAuth();

  useEffect(() => {
    loadData();
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
      
      setRecords(recordsRes.records || []);
      setUsers(usersRes.users || []);
      setStats(statsRes);
      setPWorse(pWorseRes.p_worse || 0.1);
    } catch (error) {
      message.error('加载数据失败');
    }
    setLoading(false);
  };

  const handleAddRecord = () => {
    setEditingRecord(null);
    recordForm.resetFields();
    setRecordModalVisible(true);
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    recordForm.setFieldsValue({
      key: record.key,
      value: record.value,
      probability: record.probability,
      is_popular: false // 这里需要根据实际情况设置
    });
    setRecordModalVisible(true);
  };

  const handleDeleteRecord = async (key) => {
    try {
      await adminAPI.deleteRecord(key);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleRecordSubmit = async (values) => {
    try {
      if (editingRecord) {
        await adminAPI.updateRecord(editingRecord.key, {
          value: values.value,
          probability: values.probability
        });
        message.success('更新成功');
      } else {
        await adminAPI.addRecord({
          key: values.key,
          value: values.value,
          probability: values.probability,
          is_popular: values.is_popular
        });
        message.success('添加成功');
      }
      setRecordModalVisible(false);
      loadData();
    } catch (error) {
      message.error(editingRecord ? '更新失败' : '添加失败');
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
      render: (value) => value.toFixed(6),
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
      render: (date) => new Date(date).toLocaleString(),
    },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="总记录数" value={stats?.records_count || 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="用户数量" value={stats?.users_count || 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="离线时间" 
                    value={stats?.performance_stats?.offline_time || 0} 
                    suffix="ms" 
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="在线时间" 
                    value={stats?.performance_stats?.online_time || 0} 
                    suffix="ms" 
                  />
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
        return (
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
              dataSource={records}
              rowKey="key"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );
      
      case 'users':
        return (
          <Card title="用户管理">
            <Table
              columns={userColumns}
              dataSource={users}
              rowKey="username"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );
      
      default:
        return <div>请选择功能</div>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        style={{ background: '#fff' }}
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
          selectedKeys={[selectedKey]}
          onClick={({ key }) => setSelectedKey(key)}
          style={{ borderRight: 0 }}
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
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h2 style={{ margin: 0 }}>管理员控制台</h2>
          <Space>
            <span>欢迎，{user?.username}</span>
            <Button icon={<LogoutOutlined />} onClick={logout}>
              退出
            </Button>
          </Space>
        </Header>
        
        <Content style={{ margin: '24px', background: '#fff', padding: 24 }}>
          {renderContent()}
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
          
          {!editingRecord && (
            <Form.Item
              name="is_popular"
              label="是否热门"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          )}
          
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
  );
};

export default AdminDashboard;
