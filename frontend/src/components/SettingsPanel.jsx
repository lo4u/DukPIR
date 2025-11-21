import { Row, Col, Card, Form, InputNumber, Space, Button, Statistic, Tag, message, Select, Input } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import { useState, useRef } from 'react';

const SettingsPanel = ({ pWorse, handlePWorseChange, stats, handleBackup }) => {
  const [form] = Form.useForm();
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

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
      form.setFieldsValue({
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

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleInitDatabase = async (values) => {
    try {
      if (!selectedFile) {
        message.error('请先选择数据库文件');
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        message.error('未找到认证token，请重新登录');
        setLoading(false);
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
      
    } catch (error) {
      console.error('初始化数据库失败:', error);
      message.error(`数据库初始化失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <Card 
        title="系统配置" 
        style={{ 
          borderRadius: 8, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: 'none'
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Row 
          gutter={[24, 24]}
          style={{ 
            width: '100%', 
            padding: 0, 
            margin: 0
          }}
        >
          <Col xs={24} md={12}>
            <Card 
              title="隐私参数配置" 
              size="small"
              style={{ 
                height: '100%', 
                borderRadius: 8,
                border: '1px solid #f0f0f0'
              }}
              bodyStyle={{ padding: '16px 20px' }}
            >
              <Form layout="vertical">
                <Form.Item 
                  label={
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '14px' }}>
                      p_worse 隐私参数
                    </div>
                  }
                  extra={
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                      当前值: {pWorse.toFixed(2)} | 控制查询隐私级别 (0=性能优先, 1=隐私优先)
                    </div>
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <InputNumber
                      min={0}
                      max={1}
                      step={0.01}
                      value={pWorse}
                      onChange={handlePWorseChange}
                      style={{ width: 100 }}
                      precision={2}
                      size="middle"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        height: 8, 
                        background: '#f0f0f0', 
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            background: '#1890ff',
                            width: `${pWorse * 100}%`,
                            transition: 'width 0.3s'
                          }} 
                        />
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#666',
                        marginTop: 4
                      }}>
                        <span>性能优先</span>
                        <span>隐私优先</span>
                      </div>
                    </div>
                  </div>
                </Form.Item>
                
                <Form.Item style={{ marginTop: 16 }}>
                  <Button 
                    icon={<CloudUploadOutlined />} 
                    onClick={handleBackup}
                    type="default"
                    size="middle"
                  >
                    备份数据
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card 
              title="系统统计" 
              size="small"
              style={{ 
                height: '100%', 
                borderRadius: 8,
                border: '1px solid #f0f0f0'
              }}
              bodyStyle={{ padding: '16px 20px' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={8} md={12}>
                  <Statistic 
                    title="总记录数" 
                    value={stats?.records_count || 0}
                    valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                    prefix={<div style={{ width: 8, height: 8, background: '#1890ff', borderRadius: '50%', marginRight: 8 }} />}
                  />
                </Col>
                <Col xs={12} sm={8} md={12}>
                  <Statistic 
                    title="用户数" 
                    value={stats?.users_count || 0}
                    valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                    prefix={<div style={{ width: 8, height: 8, background: '#52c41a', borderRadius: '50%', marginRight: 8 }} />}
                  />
                </Col>
                <Col xs={24} sm={8} md={24}>
                  <div style={{ marginTop: 8 }}>
                    <Statistic 
                      title="平均查询时间" 
                      value={(stats?.performance_stats?.avg_query_time || 0).toFixed(2)} 
                      suffix="ms"
                      valueStyle={{ color: '#fa8c16', fontSize: '20px' }}
                    />
                  </div>
                </Col>
              </Row>  
              
              <div style={{ 
                marginTop: 16, 
                padding: '16px 0', 
                borderTop: '1px solid #f0f0f0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                        系统运行状态
                      </div>
                      <Tag color="green" style={{ margin: 0 }}>正常</Tag>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                        最后备份
                      </div>
                      <div style={{ fontSize: '12px', color: '#1890ff' }}>--</div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>
        </Row>
        
        <Card 
          title="高级操作" 
          style={{ 
            marginTop: 24, 
            borderRadius: 8,
            border: '1px solid #f0f0f0'
          }} 
          size="small"
          bodyStyle={{ padding: '20px' }}
        >
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleInitDatabase}
            style={{ maxWidth: 600, margin: '0 auto' }}
            initialValues={{
              mode: 'rate',
              p_worse: 0.1,
              use_ntt: 1
            }}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item 
                  name="database_path" 
                  label="数据库路径" 
                  rules={[{ required: true, message: '请选择数据库文件' }]}
                >
                  <Input 
                    placeholder="请选择数据库文件" 
                    readOnly
                    size="middle"
                    addonAfter={
                      <Button 
                        type="link" 
                        size="small"
                        onClick={triggerFileInput}
                        disabled={loading}
                        style={{ padding: '4px 8px' }}
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
                  disabled={loading}
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
                    disabled={loading}
                    size="middle"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="mode"
                  label="热门数据库选取模式"
                  rules={[{ required: true, message: '请选择选取模式' }]}
                >
                  <Select placeholder="请选择模式" disabled={loading} size="middle">
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
                    step={0.01}
                    placeholder="0~1的浮点数"
                    style={{ width: '100%' }}
                    precision={2}
                    disabled={loading}
                    size="middle"
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
                    disabled={loading}
                    size="middle"
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
                  <Select placeholder="请选择" disabled={loading} size="middle">
                    <Select.Option value={1}>是</Select.Option>
                    <Select.Option value={0}>否</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ textAlign: 'center', marginTop: 24, marginBottom: 0 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                loading={loading}
                disabled={!selectedFile}
                style={{ minWidth: 120, height: 40 }}
              >
                {loading ? '初始化中...' : '初始化数据库'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Card>
    </div>
  );
};

export default SettingsPanel;