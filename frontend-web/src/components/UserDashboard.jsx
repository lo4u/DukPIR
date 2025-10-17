import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Input, 
  Button, 
  Table, 
  message, 
  Space,
  Statistic,
  Row,
  Col,
  Tag,
  Typography,
  Divider
} from 'antd';
import {
  SearchOutlined,
  LogoutOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const UserDashboard = () => {
  const [queryKey, setQueryKey] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadStats();
    loadQueryHistory();
  }, []);

  const loadStats = async () => {
    try {
      const response = await userAPI.getStats();
      setStats(response);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  const loadQueryHistory = () => {
    // 从本地存储加载查询历史
    const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
    setQueryHistory(history);
  };

  const saveQueryHistory = (query) => {
    const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
    const newHistory = [query, ...history.slice(0, 9)]; // 保留最近10条
    localStorage.setItem('queryHistory', JSON.stringify(newHistory));
    setQueryHistory(newHistory);
  };

  const handleQuery = async () => {
    if (!queryKey.trim()) {
      message.warning('请输入查询关键字');
      return;
    }

    setLoading(true);
    try {
      const response = await userAPI.query(queryKey.trim());
      setQueryResult(response);
      
      // 保存查询历史
      saveQueryHistory({
        key: queryKey.trim(),
        result: response,
        timestamp: new Date().toISOString()
      });
      
      if (response.success) {
        message.success('查询成功');
      } else {
        message.warning('未找到匹配的数据');
      }
    } catch (error) {
      message.error('查询失败');
      console.error('查询错误:', error);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleQuery();
    }
  };

  const historyColumns = [
    {
      title: '查询关键字',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: '查询结果',
      dataIndex: 'result',
      key: 'result',
      render: (result) => (
        <Tag color={result?.success ? 'green' : 'red'}>
          {result?.success ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '返回值',
      dataIndex: 'result',
      key: 'value',
      render: (result) => result?.value || '-',
    },
    {
      title: '查询时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleString(),
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
          <span>欢迎，{user?.username}</span>
          <Button icon={<LogoutOutlined />} onClick={logout}>
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
              onChange={(e) => setQueryKey(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ flex: 1 }}
            />
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              loading={loading}
              onClick={handleQuery}
            >
              查询
            </Button>
          </Space.Compact>
          
          {queryResult && (
            <Card 
              title="查询结果" 
              size="small"
              style={{ marginTop: 16 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="查询状态"
                    value={queryResult.success ? '成功' : '失败'}
                    valueStyle={{ color: queryResult.success ? '#3f8600' : '#cf1322' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="返回值"
                    value={queryResult.value || '-'}
                  />
                </Col>
              </Row>
              
              {queryResult.stats && (
                <>
                  <Divider />
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="查询时间"
                        value={queryResult.stats.online_time}
                        suffix="ms"
                        prefix={<ClockCircleOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="查询通信量"
                        value={queryResult.stats.online_query_comm}
                        suffix="MB"
                        prefix={<CloudUploadOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="应答通信量"
                        value={queryResult.stats.online_answer_comm}
                        suffix="MB"
                        prefix={<CloudUploadOutlined />}
                      />
                    </Col>
                  </Row>
                </>
              )}
            </Card>
          )}
        </Card>

        {/* 统计信息 */}
        {stats && (
          <Card title="系统统计" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="总记录数" value={stats.records_count || 0} />
              </Col>
              <Col span={6}>
                <Statistic title="用户数量" value={stats.users_count || 0} />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="离线时间" 
                  value={stats.performance_stats?.offline_time || 0} 
                  suffix="ms" 
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="在线时间" 
                  value={stats.performance_stats?.online_time || 0} 
                  suffix="ms" 
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* 查询历史 */}
        <Card title="查询历史">
          <Table
            columns={historyColumns}
            dataSource={queryHistory}
            rowKey={(record, index) => `${record.key}-${index}`}
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </Card>
      </Content>
    </Layout>
  );
};

export default UserDashboard;
