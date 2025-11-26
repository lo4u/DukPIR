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
  ClearOutlined,
  DownloadOutlined
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

  const saveQueryHistory = (query, status, errorMsg = null, result = null) => {
    const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
    const newHistory = [{
      key: query,
      status,
      error: errorMsg || null,
      result: result,  // 新增：保存查询结果
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

  const clearAllHistory = () => {
    localStorage.removeItem('queryHistory');
    setQueryHistory([]);
    message.success('已清空所有查询历史');
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
        saveQueryHistory(queryKey.trim(), false, errorMsg, null);  // 保存失败历史
        message.warning(errorMsg);  // 用 warning 显示业务警告
        setLoading(false);
        return;  // 提前返回，避免后续成功逻辑
      }

      // 成功路径
      setQueryResult(valueResult);
      setShowResult(true);
      saveQueryHistory(queryKey.trim(), true, null, valueResult);  // 成功，保存结果
      message.success('查询成功');
    } catch (error) {
      // 网络/异常错误
      const errorMsg = error.response?.data?.message || error.message || '查询失败';
      setQueryError(errorMsg);
      setQueryResult(null);
      setShowResult(true);
      saveQueryHistory(queryKey.trim(), false, errorMsg, null);
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

  const handleExportCSV = () => {
    if (queryHistory.length === 0) {
      message.warning('没有查询历史可导出');
      return;
    }

    // 构建CSV内容
    const headers = ['查询关键字', '查询状态', '查询结果', '错误信息', '查询时间'];
    const csvContent = [
      headers.join(','),
      ...queryHistory.map(record => {
        const status = record.status ? '成功' : '失败';
        const result = record.result
          ? (typeof record.result === 'string' ? record.result : JSON.stringify(record.result))
          : '-';
        const error = record.error || '-';
        const timestamp = new Date(record.timestamp).toLocaleString();

        // CSV转义：处理逗号和引号
        const escapeCSV = (str) => {
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        return [
          escapeCSV(record.key),
          escapeCSV(status),
          escapeCSV(result),
          escapeCSV(error),
          escapeCSV(timestamp)
        ].join(',');
      })
    ].join('\n');

    // 添加UTF-8 BOM以支持Excel正确显示中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `查询历史_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success(`已导出 ${queryHistory.length} 条查询历史`);
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
      title: '查询结果',
      dataIndex: 'result',
      key: 'result',
      ellipsis: true,
      render: (result) => {
        if (!result) return <Text type="secondary">-</Text>;
        if (typeof result === 'string') return result;
        if (typeof result === 'object') {
          const displayValue = result.value || result.results?.[0]?.value || JSON.stringify(result);
          return <Text ellipsis={{ tooltip: displayValue }}>{displayValue}</Text>;
        }
        return String(result);
      },
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
    <Layout style={{ minHeight: '100vh', position: 'relative', background: 'linear-gradient(180deg, rgba(240, 248, 255, 0.3) 0%, rgba(230, 240, 255, 0.5) 100%)' }}>
      {/* 波浪背景 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }}>
        <svg width="100%" height="100%" viewBox="0 0 1440 590" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <style>{`
            .path-0-user{
              animation:pathAnim-0-user 4s;
              animation-timing-function: linear;
              animation-iteration-count: infinite;
            }
            @keyframes pathAnim-0-user{
              0%{
                d: path("M 0,600 L 0,150 C 96.08612440191388,142.1244019138756 192.17224880382776,134.24880382775117 295,136 C 397.82775119617224,137.75119617224883 507.3971291866028,149.12918660287082 606,134 C 704.6028708133972,118.87081339712918 792.2392344497608,77.23444976076554 892,85 C 991.7607655502392,92.76555023923446 1103.645933014354,149.93301435406698 1197,169 C 1290.354066985646,188.06698564593302 1365.177033492823,169.0334928229665 1440,150 L 1440,600 L 0,600 Z");
              }
              25%{
                d: path("M 0,600 L 0,150 C 97.56937799043061,112.83253588516746 195.13875598086122,75.66507177033493 299,101 C 402.8612440191388,126.33492822966507 513.0143540669858,214.17224880382776 608,215 C 702.9856459330142,215.82775119617224 782.8038277511961,129.64593301435406 872,99 C 961.1961722488039,68.35406698564593 1059.7703349282297,93.24401913875599 1156,111 C 1252.2296650717703,128.755980861244 1346.1148325358852,139.377990430622 1440,150 L 1440,600 L 0,600 Z");
              }
              50%{
                d: path("M 0,600 L 0,150 C 78.57416267942583,180.4688995215311 157.14832535885165,210.9377990430622 255,218 C 352.85167464114835,225.0622009569378 469.98086124401925,208.7177033492823 579,178 C 688.0191387559807,147.2822966507177 788.9282296650719,102.1913875598086 892,95 C 995.0717703349281,87.8086124401914 1100.306220095694,118.51674641148327 1192,134 C 1283.693779904306,149.48325358851673 1361.846889952153,149.74162679425837 1440,150 L 1440,600 L 0,600 Z");
              }
              75%{
                d: path("M 0,600 L 0,150 C 82.21052631578945,142.82296650717703 164.4210526315789,135.64593301435406 267,129 C 369.5789473684211,122.35406698564593 492.52631578947376,116.23923444976076 589,120 C 685.4736842105262,123.76076555023924 755.4736842105264,137.39712918660285 856,143 C 956.5263157894736,148.60287081339715 1087.578947368421,146.17224880382776 1190,146 C 1292.421052631579,145.82775119617224 1366.2105263157896,147.91387559808612 1440,150 L 1440,600 L 0,600 Z");
              }
              100%{
                d: path("M 0,600 L 0,150 C 96.08612440191388,142.1244019138756 192.17224880382776,134.24880382775117 295,136 C 397.82775119617224,137.75119617224883 507.3971291866028,149.12918660287082 606,134 C 704.6028708133972,118.87081339712918 792.2392344497608,77.23444976076554 892,85 C 991.7607655502392,92.76555023923446 1103.645933014354,149.93301435406698 1197,169 C 1290.354066985646,188.06698564593302 1365.177033492823,169.0334928229665 1440,150 L 1440,600 L 0,600 Z");
              }
            }
            .path-1-user{
              animation:pathAnim-1-user 4s;
              animation-timing-function: linear;
              animation-iteration-count: infinite;
            }
            @keyframes pathAnim-1-user{
              0%{
                d: path("M 0,600 L 0,350 C 103.92344497607655,390.3349282296651 207.8468899521531,430.66985645933016 309,411 C 410.1531100478469,391.33014354066984 508.535885167464,311.65550239234443 609,303 C 709.464114832536,294.34449760765557 812.0095693779906,356.7081339712919 891,356 C 969.9904306220094,355.2918660287081 1025.4258373205741,291.511961722488 1113,280 C 1200.5741626794259,268.488038277512 1320.287081339713,309.244019138756 1440,350 L 1440,600 L 0,600 Z");
              }
              25%{
                d: path("M 0,600 L 0,350 C 103.79904306220098,362.9569377990431 207.59808612440196,375.9138755980861 308,376 C 408.40191387559804,376.0861244019139 505.4066985645933,363.30143540669854 586,378 C 666.5933014354067,392.69856459330146 730.7751196172247,434.88038277511964 827,418 C 923.2248803827753,401.11961722488036 1051.4928229665072,325.17703349282294 1159,304 C 1266.5071770334928,282.82296650717706 1353.2535885167463,316.41148325358853 1440,350 L 1440,600 L 0,600 Z");
              }
              50%{
                d: path("M 0,600 L 0,350 C 123.45454545454547,303.58851674641147 246.90909090909093,257.17703349282294 333,277 C 419.09090909090907,296.82296650717706 467.81818181818176,382.88038277511964 545,421 C 622.1818181818182,459.11961722488036 727.8181818181819,449.30143540669854 847,408 C 966.1818181818181,366.69856459330146 1098.9090909090908,293.9138755980861 1200,279 C 1301.0909090909092,264.0861244019139 1370.5454545454545,307.0430622009569 1440,350 L 1440,600 L 0,600 Z");
              }
              75%{
                d: path("M 0,600 L 0,350 C 117.50239234449762,378.6602870813397 235.00478468899524,407.3205741626794 315,403 C 394.99521531100476,398.6794258373206 437.48325358851673,361.37799043062205 539,341 C 640.5167464114833,320.62200956937795 801.0622009569377,317.1674641148325 900,310 C 998.9377990430623,302.8325358851675 1036.267942583732,291.95215311004785 1116,298 C 1195.732057416268,304.04784688995215 1317.8660287081339,327.02392344497605 1440,350 L 1440,600 L 0,600 Z");
              }
              100%{
                d: path("M 0,600 L 0,350 C 103.92344497607655,390.3349282296651 207.8468899521531,430.66985645933016 309,411 C 410.1531100478469,391.33014354066984 508.535885167464,311.65550239234443 609,303 C 709.464114832536,294.34449760765557 812.0095693779906,356.7081339712919 891,356 C 969.9904306220094,355.2918660287081 1025.4258373205741,291.511961722488 1113,280 C 1200.5741626794259,268.488038277512 1320.287081339713,309.244019138756 1440,350 L 1440,600 L 0,600 Z");
              }
            }
          `}</style>
          <defs>
            <linearGradient id="gradient-user" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="5%" stopColor="#abb8c3"></stop>
              <stop offset="95%" stopColor="#8ed1fc"></stop>
            </linearGradient>
          </defs>
          <path d="M 0,600 L 0,150 C 96.08612440191388,142.1244019138756 192.17224880382776,134.24880382775117 295,136 C 397.82775119617224,137.75119617224883 507.3971291866028,149.12918660287082 606,134 C 704.6028708133972,118.87081339712918 792.2392344497608,77.23444976076554 892,85 C 991.7607655502392,92.76555023923446 1103.645933014354,149.93301435406698 1197,169 C 1290.354066985646,188.06698564593302 1365.177033492823,169.0334928229665 1440,150 L 1440,600 L 0,600 Z" stroke="none" strokeWidth="0" fill="url(#gradient-user)" fillOpacity="0.53" className="path-0-user"></path>
          <path d="M 0,600 L 0,350 C 103.92344497607655,390.3349282296651 207.8468899521531,430.66985645933016 309,411 C 410.1531100478469,391.33014354066984 508.535885167464,311.65550239234443 609,303 C 709.464114832536,294.34449760765557 812.0095693779906,356.7081339712919 891,356 C 969.9904306220094,355.2918660287081 1025.4258373205741,291.511961722488 1113,280 C 1200.5741626794259,268.488038277512 1320.287081339713,309.244019138756 1440,350 L 1440,600 L 0,600 Z" stroke="none" strokeWidth="0" fill="url(#gradient-user)" fillOpacity="1" className="path-1-user"></path>
        </svg>
      </div>

      <Header style={{
        background: '#0f172a',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'relative',
        zIndex: 1,
        height: '64px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            marginRight: '12px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <img
              src="/assets/logo.jpg"
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<svg style="width:24px;height:24px;color:#60a5fa" fill="currentColor" viewBox="0 0 20 20"><path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"></path><path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"></path><path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"></path></svg>';
              }}
            />
          </div>
          <Title level={3} style={{ margin: 0, color: '#ffffff', fontSize: '20px' }}>
            关键字匿踪查询系统
          </Title>
        </div>
        <Space size="middle">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid rgba(96, 165, 250, 0.5)',
              flexShrink: 0,
              background: 'white'
            }}>
              <img
                src="/assets/client.jpg"
                alt="头像"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: #667eea; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${(user?.username || 'A')[0].toUpperCase()}</div>`;
                }}
              />
            </div>
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>欢迎，<strong style={{ color: '#ffffff' }}>{user?.username}</strong></span>
          </div>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={logout}
          >
            退出
          </Button>
        </Space>
      </Header>

      <Content style={{ margin: '80px 30px 60px 30px', background: 'transparent', padding: 0, position: 'relative', zIndex: 1 }}>
        {/* 查询区域 */}
        <Card
          title={
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#2d3748' }}>
              <SearchOutlined style={{ marginRight: '8px', color: '#667eea' }} />
              数据查询
            </span>
          }
          style={{
            marginBottom: 12,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
            border: 'none',
            background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)'
          }}
          bodyStyle={{ padding: '16px' }}
        >
          <Space.Compact style={{ width: '100%', marginBottom: 10 }}>
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
              style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                border: 'none',
                boxShadow: '0 2px 4px rgba(79, 172, 254, 0.3)'
              }}
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
        <Card
          title={
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#2d3748' }}>
              <ClockCircleOutlined style={{ marginRight: '8px', color: '#f093fb' }} />
              查询历史
            </span>
          }
          style={{
            marginTop: 12,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
            border: 'none',
            background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)'
          }}
          bodyStyle={{ padding: '16px' }}
          extra={
            <Space>
              <Popconfirm
                title="确定清空所有查询历史？"
                description="此操作不可恢复"
                onConfirm={clearAllHistory}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  icon={<ClearOutlined />}
                  disabled={queryHistory.length === 0}
                  danger
                >
                  清空历史
                </Button>
              </Popconfirm>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportCSV}
                disabled={queryHistory.length === 0}
                type="primary"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
                  color: '#ffffff'
                }}
              >
                导出数据表
              </Button>
            </Space>
          }
        >
          <Table
            columns={historyColumns}
            dataSource={queryHistory}
            rowKey={(record, index) => `${record.key}-${index}`}
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </Card>
      </Content>

      {/* 页脚信息 - 固定在背景上 */}
      <div style={{
        position: 'fixed',
        bottom: '8px',
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: 0,
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
            <path d="M32 4L36 20L52 24L36 28L32 44L28 28L12 24L28 20L32 4Z" fill="#667eea" opacity="0.9" />
            <path d="M32 20L34 28L42 30L34 32L32 40L30 32L22 30L30 28L32 20Z" fill="#764ba2" opacity="0.7" />
            <circle cx="32" cy="30" r="3" fill="#ffd700" />
            <path d="M20 48L22 52L26 54L22 56L20 60L18 56L14 54L18 52L20 48Z" fill="#667eea" opacity="0.6" />
            <path d="M44 48L46 52L50 54L46 56L44 60L42 56L38 54L42 52L44 48Z" fill="#764ba2" opacity="0.6" />
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
    </Layout>
  );
};

export default UserDashboard;