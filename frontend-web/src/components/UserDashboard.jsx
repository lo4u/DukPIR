import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Input, 
  Button, 
  Table, 
  message, 
  Space,
  Row,
  Col,
  Tag,
  Typography,
  Divider,
  Popconfirm,
  Statistic
} from 'antd';
import {
  SearchOutlined,
  LogoutOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const UserDashboard = () => {
  const [queryKey, setQueryKey] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadQueryHistory();
  }, []);

  const loadQueryHistory = () => {
    const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
    setQueryHistory(history);
  };

  const saveQueryHistory = (query, status, errorMsg = null) => {  // 修改：添加 errorMsg 用于显示
    const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
    const newHistory = [{ 
      key: query, 
      status, 
      error: errorMsg || null,  // 新增：保存错误消息，便于历史显示
      timestamp: new Date().toISOString() 
    }, ...history.slice(0, 9)];
    localStorage.setItem('queryHistory', JSON.stringify(newHistory));
    setQueryHistory(newHistory);
  };

  const deleteHistoryItem = (index) => {
    const newHistory = queryHistory.filter((_, i) => i !== index);
    localStorage.setItem('queryHistory', JSON.stringify(newHistory));
    setQueryHistory(newHistory);
    message.success('删除成功');
  };

  const handleQuery = async () => {
    if (!queryKey.trim()) {
      message.warning('请输入查询关键字');
      return;
    }

    setLoading(true);
    setQueryError(null);
    setShowResult(false);
    try {
      const response = await userAPI.query(queryKey.trim());
      
      const valueResult = response.value?.value || 
                         response.results?.[0]?.value || 
                         response.value || 
                         response.results || 
                         null;
      
      // 【核心修复】：检查业务 success，如果 false，视为错误
      if (response.success === false) {
        const errorMsg = response.message || '未找到匹配的数据';  // 从后端提取消息，fallback 到默认
        setQueryError(errorMsg);
        setQueryResult(null);  // 清空结果
        setShowResult(true);
        saveQueryHistory(queryKey.trim(), false, errorMsg);  // 保存失败历史
        message.warning(errorMsg);  // 用 warning 显示业务警告
        setLoading(false);
        return;  // 提前返回，避免后续成功逻辑
      }
      
      // 成功路径
      setQueryResult(valueResult);
      setShowResult(true);
      saveQueryHistory(queryKey.trim(), true);  // 成功，无 errorMsg
      message.success('查询成功');
    } catch (error) {
      // 网络/异常错误
      const errorMsg = error.response?.data?.message || error.message || '查询失败';
      setQueryError(errorMsg);
      setQueryResult(null);
      setShowResult(true);
      saveQueryHistory(queryKey.trim(), false, errorMsg);
      message.error(errorMsg);  // 用 error 显示异常
      console.error('查询错误:', error);
    }
    setLoading(false);
  };

  const handleClear = () => {
    setQueryKey('');
    setQueryResult(null);
    setQueryError(null);
    setShowResult(false);
    message.info('已清除查询');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleQuery();
    }
  };

  // 修改：历史列，状态显示 error，如果有
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
      render: (timestamp) => new Date(timestamp).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, __, index) => (
        <Popconfirm
          title="确定删除此记录？"
          onConfirm={() => deleteHistoryItem(index)}
          okText="删除"
          cancelText="取消"
        >
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  // 辅助函数：格式化结果显示（微调：失败时不显示详细结果）
  const formatResult = (result) => {
    if (result === null || result === undefined) return <Text type="secondary">-</Text>;
    if (typeof result === 'object') {
      const { stats, ...displayResult } = result;
      return <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: '12px', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(displayResult, null, 2)}</pre>;
    }
    return result;
  };

  // 判断是否显示 stats（只在成功且有 stats 时）
  const hasValidResult = !queryError && queryResult !== null && queryResult !== undefined;

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
              suffix={<SearchOutlined />}
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
            <Button 
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={loading}
            >
              清除
            </Button>
          </Space.Compact>
          
          {showResult && (
            <Card 
              title={queryError ? "查询失败" : "查询结果"} 
              size="small"
              style={{ marginTop: 16 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="查询状态"
                    value={queryError ? '失败' : '成功'}
                    valueStyle={{ color: queryError ? '#cf1322' : '#3f8600' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="返回值"
                    value={hasValidResult && typeof queryResult === 'string' ? queryResult : '-'}
                  />
                </Col>
              </Row>
              
              {/* 详细结果显示：只在成功时 */}
              {hasValidResult && (
                <>
                  <Divider />
                  <Text strong>详细结果：</Text>
                  {formatResult(queryResult)}
                </>
              )}
              
              {/* 错误显示 */}
              {queryError && (
                <div style={{ marginTop: 16 }}>
                  <Text type="danger" style={{ fontSize: '16px', display: 'block', textAlign: 'center' }}>
                    {queryError}
                  </Text>
                </div>
              )}
              
              {/* Stats：只在成功且有 stats 时显示 */}
              {hasValidResult && queryResult?.stats && (
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