import React from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Layout, 
  Card, 
  Input, 
  Button, 
  Table, 
  Space,
  Row,
  Col,
  Tag,
  Typography
} from 'antd';
import {
  SearchOutlined,
  LogoutOutlined,
  DatabaseOutlined,
  ClearOutlined
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title } = Typography;

const UserDashboard = () => {
  // 静态数据
  const queryKey = '81458705';
  const queryResult = 'x3KPgTjcTa'; // 静态返回值：10位随机字符串
  const showResult = true;

  // 静态查询历史：10条记录，9条成功
  const queryHistory = [
    { key: '81458705', status: true, timestamp: new Date('2025-10-22T09:21:03').toISOString() },
    { key: '58527453', status: true, timestamp: new Date('2025-10-22T09:20:45').toISOString() },
    { key: '68539900', status: true, timestamp: new Date('2025-10-22T09:18:52').toISOString() },
    { key: '27433849', status: true, timestamp: new Date('2025-10-22T09:18:02').toISOString() },
    { key: '01901253', status: false,error: '失败/未匹配', timestamp: new Date('2025-10-22T09:17:43').toISOString() },
    { key: '15852018', status: true, timestamp: new Date('2025-10-22T09:17:23').toISOString() },
    { key: '12561604', status: true, timestamp: new Date('2025-10-22T09:03:54').toISOString() },
    { key: '97178117', status: true, timestamp: new Date('2025-10-22T09:02:58').toISOString() },
    { key: '07714159', status: true, timestamp: new Date('2025-10-22T08:40:23').toISOString() },
    { key: '85695727', status: true,  timestamp: new Date('2025-10-22T08:30:11').toISOString() }
  ];

  const historyColumns = [
    {
      title: '查询关键字',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: '查询状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => (
        <Tag color={status ? 'green' : 'red'}>
          {status ? '成功' : (record.error || '失败/未匹配')}
        </Tag>
      ),
    },
    {
      title: '查询时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: () => (
        <Button type="link" size="small" danger>删除</Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DatabaseOutlined style={{ fontSize: '24px', marginRight: '12px', color: '#1890ff' }} />
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            PIR隐私查询系统
          </Title>
        </div>
        <Space>
          <span>欢迎，user1</span>
          <Button icon={<LogoutOutlined />} type="link">
            退出
          </Button>
        </Space>
      </Header>
      
      <Content style={{ margin: '24px', background: '#fff', padding: 24 }}>
        {/* 查询区域 */}
        <Card title="数据查询" style={{ marginBottom: 24 }}>
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Input
              placeholder="请输入查询关键字"
              value={queryKey}
              suffix={<SearchOutlined />}
              style={{ flex: 1 }}
              readOnly
            />
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
            >
              查询
            </Button>
            <Button 
              icon={<ClearOutlined />}
            >
              清除
            </Button>
          </Space.Compact>
          
          {showResult && (
            <Card 
              title="查询结果" 
              size="small"
              style={{ marginTop: 16 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>查询状态</div>
                    <div style={{ fontSize: '24px', color: '#3f8600' }}>成功</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>返回值</div>
                    <div style={{ fontSize: '24px' }}>{queryResult}</div>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </Card>

        {/* 查询历史 */}
        <Card title="查询历史">
          <Table
            columns={historyColumns}
            dataSource={queryHistory}
            rowKey="key"
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </Card>
      </Content>
    </Layout>
  );
};

// 渲染到DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<UserDashboard />);