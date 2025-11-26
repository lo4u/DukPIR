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
  LogoutOutlined,
  ControlOutlined,
  TeamOutlined
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
  const [ipLocation, setIpLocation] = useState('北京');
  
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
  const handleFileSelect = async (event) => {
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
      
      // 读取文件内容分析数据
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
          
          let maxProb = 0;
          let minProb = Infinity;
          let recordCount = 0;
          
          // 过滤注释行后的所有数据行
          const dataLines = lines.slice(0);
          
          dataLines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const key = parts[0];
              const value = parts[1];
              const prob = parseFloat(parts[2]);
              
              if (!isNaN(prob) && prob > 0) {
                maxProb = Math.max(maxProb, prob);
                if (minProb === Infinity || prob < minProb) {
                  minProb = prob;
                }
              }
              
              recordCount++;
            }
          });
          
          // 值长度固定为10
          const valueLength = 10;
          systemForm.setFieldsValue({ value_length: valueLength });
          
          setSelectedFile({
            name: file.name,
            size: file.size,
            type: file.type,
            recordCount,
            maxProb,
            minProb: minProb === Infinity ? 0 : minProb
          });
          
          systemForm.setFieldsValue({
            database_path: file.name
          });
          
          message.success(`已选择文件: ${file.name}`);
        } catch (error) {
          console.error('文件解析错误:', error);
          setSelectedFile(file);
          systemForm.setFieldsValue({
            database_path: file.name
          });
          message.success(`已选择文件: ${file.name}`);
        }
      };
      reader.readAsText(file);
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
      
      // 更新仪表板显示的模式和参数
      const modeDisplay = values.mode === 'rate' ? '比例模式' : '概率模式';
      setHotMode(modeDisplay);
      setHotParam(values.hot_param);
      setPWorse(values.p_worse || 0.1);
      
      // 自动刷新数据
      await loadData();
      
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
      render: (value) => {
        const prob = value ?? 0;
        // 对于极小的概率值使用科学计数法
        if (prob < 1e-4 && prob > 0) {
          return prob.toExponential(2);
        }
        return prob.toFixed(6);
      },
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
            {/* 顶部概览区域：配置信息和用户信息 */}
            <Row gutter={[16, 10]} style={{ marginBottom: 10 }}>
              {/* 左侧：系统配置信息卡片 */}
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Card 
                  style={{ 
                    height: '100%',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    transition: 'all 0.3s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(142, 209, 252, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                  }}
                  bodyStyle={{ padding: '20px' }}
                  bordered={false}
                >
                  <div style={{ color: '#2d3748', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700,
                      marginBottom: 20,
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: '2px solid #e2e8f0',
                      paddingBottom: 12
                    }}>
                      <ControlOutlined style={{ fontSize: '24px', marginRight: '10px', color: '#2d3748' }} />
                      系统配置概览
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingTop: '10px' }}>
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '12px', 
                            padding: '14px',
                            border: '1px solid #e2e8f0',
                            height: '85px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}>
                            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <DatabaseOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                              总记录数
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2d3748' }}>
                              {stats?.records_count || 0}
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '12px', 
                            padding: '14px',
                            border: '1px solid #e2e8f0',
                            height: '85px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}>
                            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <TeamOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                              用户数量
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2d3748' }}>
                              {stats?.users_count || 0}
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '12px', 
                            padding: '14px',
                            border: '1px solid #e2e8f0',
                            height: '85px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}>
                            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ControlOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                              选取模式
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>
                              {hotMode}
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '12px', 
                            padding: '14px',
                            border: '1px solid #e2e8f0',
                            height: '85px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}>
                            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ControlOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                              选取参数
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>
                              {hotParam.toFixed(3)}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Card>
              </Col>

              {/* 右侧：用户信息卡片 */}
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Card 
                  style={{ 
                    height: '100%',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    transition: 'all 0.3s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(142, 209, 252, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                  }}
                  bodyStyle={{ padding: '20px' }}
                  bordered={false}
                >
                  <div style={{ color: '#2d3748', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700,
                      marginBottom: 20,
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: '2px solid #e2e8f0',
                      paddingBottom: 12
                    }}>
                      <UserOutlined style={{ fontSize: '24px', marginRight: '10px', color: '#2d3748' }} />
                      当前用户信息
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '10px' }}>
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '12px', 
                            padding: '14px',
                            border: '1px solid #e2e8f0',
                            height: '85px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <div style={{ 
                              width: '42px', 
                              height: '42px', 
                              borderRadius: '50%', 
                              overflow: 'hidden',
                              border: '2px solid rgba(255, 255, 255, 0.6)',
                              flexShrink: 0,
                              background: 'white'
                            }}>
                              <img 
                                src="/assets/server.jpg" 
                                alt="头像" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: #667eea; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${(user?.username || 'A')[0].toUpperCase()}</div>`;
                                }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: 4 }}>用户名</div>
                              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>{user?.username || 'admin'}</div>
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '12px', 
                            padding: '14px',
                            border: '1px solid #e2e8f0',
                            height: '85px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}>
                            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: 8 }}>角色</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>管理员</div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '12px', 
                            padding: '14px',
                            border: '1px solid #e2e8f0',
                            height: '85px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}>
                            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: 8 }}>登录时间</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>
                              {new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '12px', 
                            padding: '14px',
                            border: '1px solid #e2e8f0',
                            height: '85px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}>
                            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: 8 }}>IP属地</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>
                              {ipLocation}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
            
            {/* 系统设置 */}
            <Card 
              title={
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#2d3748' }}>
                  <DatabaseOutlined style={{ marginRight: '8px', color: '#2d3748' }} />
                  系统设置
                </span>
              }
              style={{ 
                borderRadius: '12px', 
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'all 0.3s ease',
                marginTop: '25px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(142, 209, 252, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              }}
            >
              <Form 
                form={systemForm} 
                layout="vertical" 
                onFinish={handleInitDatabase}
                style={{ maxWidth: 1000, margin: '0 auto' }}
                initialValues={{
                  mode: 'rate',
                  hot_param: 0.1,
                  p_worse: 0.1,
                  use_ntt: 1
                }}
              >
                <Row gutter={[12, 10]}>
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
                        marginTop: 16, 
                        padding: 14, 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: 8,
                        fontSize: '13px',
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        marginBottom: 16
                      }}>
                        <Row gutter={[12, 6]}>
                          <Col span={12}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontWeight: 500, color: '#495057' }}>文件名:</span>
                              <span style={{ color: '#212529' }}>{selectedFile.name}</span>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontWeight: 500, color: '#495057' }}>文件大小:</span>
                              <span style={{ color: '#212529' }}>{(selectedFile.size / 1024).toFixed(2)} KB</span>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontWeight: 500, color: '#495057' }}>类型:</span>
                              <span style={{ color: '#212529' }}>{selectedFile.type || 'text/plain'}</span>
                            </div>
                          </Col>
                          {selectedFile.recordCount && (
                            <Col span={12}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontWeight: 500, color: '#495057' }}>记录数:</span>
                                <span style={{ color: '#212529' }}>{selectedFile.recordCount.toLocaleString()}</span>
                              </div>
                            </Col>
                          )}
                          {selectedFile.maxProb > 0 && (
                            <>
                              <Col span={12}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <span style={{ fontWeight: 500, color: '#495057' }}>最大概率:</span>
                                  <span style={{ color: '#198754', fontWeight: 600 }}>
                                    {selectedFile.maxProb < 0.0001 ? selectedFile.maxProb.toExponential(3) : selectedFile.maxProb.toFixed(6)}
                                  </span>
                                </div>
                              </Col>
                              <Col span={12}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: 500, color: '#495057' }}>最小概率:</span>
                                  <span style={{ color: '#dc3545', fontWeight: 600 }}>
                                    {selectedFile.minProb < 0.0001 ? selectedFile.minProb.toExponential(3) : selectedFile.minProb.toFixed(6)}
                                  </span>
                                </div>
                              </Col>
                            </>
                          )}
                        </Row>
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
                      label="最坏情况正确概率"
                      rules={[
                        { required: true, message: '请输入最坏情况正确概率' },
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

                <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'center' }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={initLoading}
                    disabled={!selectedFile}
                    size="large"
                    style={{ 
                      minWidth: 200, 
                      height: 48,
                      fontSize: '16px',
                      color: '#fff',
                      background: '#8ed1fc',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(142, 209, 252, 0.4)'
                    }}
                  >
                    {initLoading ? '初始化中...' : '初始化数据库'}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>
        );
      
      case 'records':
        console.log('Records 数据:', records);
        
        // 计算概率分布数据用于图表 - 使用全部数据
        const sortedRecords = [...records].sort((a, b) => b.probability - a.probability);
        const chartData = sortedRecords.map((record, index) => ({
          rank: index + 1,
          probability: record.probability
        }));
        
        return (
          <ErrorBoundary>
            {/* 数据分布图表 */}
            <Card
              title={
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#2d3748' }}>
                  <DashboardOutlined style={{ marginRight: '8px', color: '#8ed1fc' }} />
                  数据库查询分布可视化
                </span>
              }
              style={{ 
                marginBottom: 16,
                borderRadius: '12px', 
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(142, 209, 252, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ width: '100%', height: '350px' }}>
                {chartData.length > 0 ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <svg width="100%" height="100%" viewBox="0 0 900 400" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 0.3 }} />
                          <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 0.05 }} />
                        </linearGradient>
                      </defs>

                      {/* 计算对数坐标 */}
                      {(() => {
                        // 数据验证和安全处理
                        const validProbabilities = chartData.map(p => p.probability).filter(p => p > 0);
                        if (validProbabilities.length === 0) {
                          return <text x="450" y="200" textAnchor="middle" fill="#a0aec0">无有效概率数据</text>;
                        }
                        
                        const maxProb = Math.max(...validProbabilities);
                        const minProb = Math.min(...validProbabilities);
                        const maxRank = chartData.length;
                        
                        // 检查数据有效性
                        if (!isFinite(maxProb) || !isFinite(minProb) || maxProb <= 0 || minProb <= 0 || maxRank === 0) {
                          return <text x="450" y="200" textAnchor="middle" fill="#a0aec0">数据异常，无法显示</text>;
                        }
                        
                        const logMaxProb = Math.log10(maxProb);
                        const logMinProb = Math.log10(minProb);
                        const logMaxRank = Math.log10(maxRank);
                        
                        // 检查对数值有效性
                        if (!isFinite(logMaxProb) || !isFinite(logMinProb) || !isFinite(logMaxRank)) {
                          return <text x="450" y="200" textAnchor="middle" fill="#a0aec0">数据范围异常</text>;
                        }
                        
                        const padding = { top: 50, right: 80, bottom: 70, left: 90 };
                        const chartWidth = 900 - padding.left - padding.right;
                        const chartHeight = 400 - padding.top - padding.bottom;
                        
                        // 生成对数刻度
                        const yTicks = [];
                        for (let i = Math.floor(logMinProb); i <= Math.ceil(logMaxProb); i++) {
                          yTicks.push(Math.pow(10, i));
                        }
                        
                        const xTicks = [];
                        for (let i = 0; i <= Math.floor(logMaxRank); i++) {
                          xTicks.push(Math.pow(10, i));
                        }
                        
                        // 计算点位置，过滤掉边缘的极端点以避免直接连接坐标轴
                        const validData = chartData.filter(point => {
                          const logRank = Math.log10(point.rank);
                          const logProb = Math.log10(Math.max(point.probability, minProb));
                          // 只保留在有效范围内的点
                          return logRank > 0.05 * logMaxRank && logRank < 0.98 * logMaxRank &&
                                 logProb > logMinProb + 0.05 * (logMaxProb - logMinProb);
                        });
                        
                        const points = validData.map((point) => {
                          const logRank = Math.log10(point.rank);
                          const logProb = Math.log10(Math.max(point.probability, minProb));
                          
                          const x = padding.left + (logRank / logMaxRank) * chartWidth;
                          const y = padding.top + chartHeight - ((logProb - logMinProb) / (logMaxProb - logMinProb)) * chartHeight;
                          return { x, y };
                        });
                        
                        const pathData = points.length > 0 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';
                        
                        return (
                          <>
                            {/* 网格线 - Y轴 */}
                            {yTicks.map(tick => {
                              const logTick = Math.log10(tick);
                              const y = padding.top + chartHeight - ((logTick - logMinProb) / (logMaxProb - logMinProb)) * chartHeight;
                              return (
                                <g key={`y-grid-${tick}`}>
                                  <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={900 - padding.right}
                                    y2={y}
                                    stroke="#e2e8f0"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                  />
                                  <text
                                    x={padding.left - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    fontSize="11"
                                    fill="#64748b"
                                  >
                                    {tick.toExponential(0)}
                                  </text>
                                </g>
                              );
                            })}
                            
                            {/* 网格线 - X轴 */}
                            {xTicks.map(tick => {
                              const logTick = Math.log10(tick);
                              const x = padding.left + (logTick / logMaxRank) * chartWidth;
                              return (
                                <g key={`x-grid-${tick}`}>
                                  <line
                                    x1={x}
                                    y1={padding.top}
                                    x2={x}
                                    y2={400 - padding.bottom}
                                    stroke="#e2e8f0"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                  />
                                  <text
                                    x={x}
                                    y={400 - padding.bottom + 20}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fill="#64748b"
                                  >
                                    {tick >= 1000 ? `${tick/1000}k` : tick}
                                  </text>
                                </g>
                              );
                            })}
                            
                            {/* 坐标轴 */}
                            <line 
                              x1={padding.left} 
                              y1={padding.top} 
                              x2={padding.left} 
                              y2={400 - padding.bottom} 
                              stroke="#475569" 
                              strokeWidth="2" 
                            />
                            <line 
                              x1={padding.left} 
                              y1={400 - padding.bottom} 
                              x2={900 - padding.right} 
                              y2={400 - padding.bottom} 
                              stroke="#475569" 
                              strokeWidth="2" 
                            />
                            
                            {/* 填充区域 */}
                            {points.length > 0 && (
                              <path 
                                d={`${pathData} L ${points[points.length - 1].x} ${400 - padding.bottom} L ${points[0].x} ${400 - padding.bottom} Z`}
                                fill="url(#chartGradient)"
                              />
                            )}
                            
                            {/* 曲线 */}
                            {points.length > 0 && (
                              <path
                                d={pathData}
                                fill="none"
                                stroke="#667eea"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                            
                            {/* 坐标轴标签 */}
                            <text 
                              x={450} 
                              y={400 - 15} 
                              textAnchor="middle" 
                              fontSize="13" 
                              fill="#475569"
                              fontWeight="500"
                            >
                              记录排名
                            </text>
                            <text
                              x={-200}
                              y={30}
                              textAnchor="middle"
                              fontSize="13"
                              fill="#475569"
                              fontWeight="500"
                              transform={`rotate(-90, 30, 200)`}
                            >
                              访问概率
                            </text>
                            
                            {/* 标题 */}
                            <text 
                              x={450} 
                              y={30} 
                              textAnchor="middle" 
                              fontSize="16" 
                              fill="#2d3748"
                              fontWeight="600"
                            >
                              查询概率分布图（对数坐标）
                            </text>
                            
                            {/* 图例 */}
                            <text 
                              x={900 - padding.right - 10} 
                              y={padding.top + 25} 
                              textAnchor="end" 
                              fontSize="12" 
                              fill="#64748b"
                            >
                              总记录数: {chartData.length.toLocaleString()}
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    color: '#a0aec0'
                  }}>
                    暂无数据
                  </div>
                )}
              </div>
            </Card>
            
            <Card
              title={
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#2d3748' }}>
                  <DatabaseOutlined style={{ marginRight: '8px', color: '#8ed1fc' }} />
                  数据管理
                </span>
              }
              style={{ 
                marginTop: 16,
                borderRadius: '12px', 
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(142, 209, 252, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              }}
              bodyStyle={{ padding: '16px' }}
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleAddRecord}
                  style={{
                    background: '#8ed1fc',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(142, 209, 252, 0.3)'
                  }}
                >
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
            <Card 
              title={
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#2d3748' }}>
                  <UserOutlined style={{ marginRight: '8px', color: '#8ed1fc' }} />
                  用户管理
                </span>
              }
              style={{ 
                borderRadius: '12px', 
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(142, 209, 252, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              }}
              bodyStyle={{ padding: '16px' }}
            >
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
      <Layout style={{ minHeight: '100vh', fontFamily: 'Ubuntu, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', position: 'relative', background: 'linear-gradient(180deg, rgba(240, 248, 255, 0.3) 0%, rgba(230, 240, 255, 0.5) 100%)' }}>
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
              /* 自定义侧边栏折叠按钮颜色 */
              .ant-layout-sider-trigger {
                background: #2d3748 !important;
                color: #ffffff !important;
              }
              .ant-layout-sider-trigger:hover {
                background: #12151cff !important;
              }
              
              .path-0{
                animation:pathAnim-0 4s;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
              }
              @keyframes pathAnim-0{
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
              .path-1{
                animation:pathAnim-1 4s;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
              }
              @keyframes pathAnim-1{
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
              <linearGradient id="gradient-admin" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="5%" stopColor="#bccce7"></stop>
                <stop offset="95%" stopColor="#8ed1fc"></stop>
              </linearGradient>
            </defs>
            <path d="M 0,600 L 0,150 C 96.08612440191388,142.1244019138756 192.17224880382776,134.24880382775117 295,136 C 397.82775119617224,137.75119617224883 507.3971291866028,149.12918660287082 606,134 C 704.6028708133972,118.87081339712918 792.2392344497608,77.23444976076554 892,85 C 991.7607655502392,92.76555023923446 1103.645933014354,149.93301435406698 1197,169 C 1290.354066985646,188.06698564593302 1365.177033492823,169.0334928229665 1440,150 L 1440,600 L 0,600 Z" stroke="none" strokeWidth="0" fill="url(#gradient-admin)" fillOpacity="0.53" className="path-0"></path>
            <path d="M 0,600 L 0,350 C 103.92344497607655,390.3349282296651 207.8468899521531,430.66985645933016 309,411 C 410.1531100478469,391.33014354066984 508.535885167464,311.65550239234443 609,303 C 709.464114832536,294.34449760765557 812.0095693779906,356.7081339712919 891,356 C 969.9904306220094,355.2918660287081 1025.4258373205741,291.511961722488 1113,280 C 1200.5741626794259,268.488038277512 1320.287081339713,309.244019138756 1440,350 L 1440,600 L 0,600 Z" stroke="none" strokeWidth="0" fill="url(#gradient-admin)" fillOpacity="1" className="path-1"></path>
          </svg>
        </div>
        
        <Sider 
          collapsible 
          collapsed={collapsed}
          onCollapse={(val) => setCollapsed(val)}
          breakpoint="lg"
          onBreakpoint={(broken) => { setCollapsed(broken); }}
          collapsedWidth={isMobile ? 0 : 80}
          width={240}
          style={{ 
            background: '#cdd4da', 
            minWidth: 0,
            boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            overflowY: 'auto'
          }}
        >
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            padding: '0 8px',
            background: '#1e293b'
          }}>
            {collapsed ? (
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #8ed1fc'
              }}>
                <img 
                  src="/assets/logo.jpg" 
                  alt="PIR" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #6b7280'
                }}>
                  <img 
                    src="/assets/logo.jpg" 
                    alt="PIR" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
                <h3 style={{ 
                  margin: 0, 
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}>
                  关键字匿踪查询系统
                </h3>
              </div>
            )}
          </div>
          
          <Menu
            theme="light"
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ 
              borderRight: 0, 
              minWidth: 0,
              padding: '8px 0',
              background: '#cdd4da'
            }}
            items={[
              {
                key: 'dashboard',
                icon: <DashboardOutlined />,
                label: '仪表板',
                style: selectedKey === 'dashboard' ? {
                  background: '#8ed1fc',
                  color: '#1f2937',
                  fontWeight: 600,
                  borderRadius: '8px'
                } : {}
              },
              {
                key: 'records',
                icon: <DatabaseOutlined />,
                label: '数据管理',
                style: selectedKey === 'records' ? {
                  background: '#8ed1fc',
                  color: '#1f2937',
                  fontWeight: 600,
                  borderRadius: '8px'
                } : {}
              },
              {
                key: 'users',
                icon: <TeamOutlined />,
                label: '用户管理',
                style: selectedKey === 'users' ? {
                  background: '#8ed1fc',
                  color: '#1f2937',
                  fontWeight: 600,
                  borderRadius: '8px'
                } : {}
              }
            ]}
          />
        </Sider>
        
        <Layout style={{ marginLeft: collapsed ? (isMobile ? 0 : 80) : 240, transition: 'margin-left 0.2s' }}>
          <Header style={{ 
            background: '#1e293b', 
            padding: '0 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            minWidth: 0,
            height: 64,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            position: 'fixed',
            top: 0,
            right: 0,
            left: collapsed ? (isMobile ? 0 : 80) : 240,
            zIndex: 99,
            transition: 'left 0.2s'
          }}>
            <Title level={3} style={{ margin: 0, color: '#ffffff' }}>
              <ControlOutlined style={{ marginRight: '12px', color: '#8ed1fc' }} />
              管理员控制台
            </Title>
            <Space>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img 
                  src="/assets/server.jpg" 
                  alt="Admin" 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #6b7280'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div style={{ 
                  display: 'none',
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%',
                  background: '#667eea',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold'
                }}>
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <Text style={{ color: '#ffffff' }}>欢迎，<strong style={{ color: '#ffffff' }}>{user?.username}</strong></Text>
              </div>
              <Button 
                icon={<LogoutOutlined />} 
                onClick={logout} 
                size="middle"
                style={{ 
                  fontWeight: 500,
                  background: '#6b7280',
                  color: '#ffffff',
                  border: 'none'
                }}
              >
                退出
              </Button>
            </Space>
          </Header>
          
          <Content style={{ 
            margin: '80px 30px 60px 30px', 
            background: 'transparent', 
            padding: 8, 
            position: 'relative',
            zIndex: 1,
            minWidth: 0, 
            overflow: 'auto'
          }}>
            {renderContent()}
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
                <Button 
                  type="primary" 
                  htmlType="submit"
                  style={{
                    background: '#8ed1fc',
                    border: 'none'
                  }}
                >
                  {editingRecord ? '更新' : '添加'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
      
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
    </ErrorBoundary>
  );
};

export default AdminDashboard;