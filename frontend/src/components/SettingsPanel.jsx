// SettingsPanel.jsx - 完整版本，包含真实的API调用
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
      // 验证文件大小（例如限制为10MB）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        message.error('文件大小不能超过10MB');
        return;
      }
      
      // 验证文件类型
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

  // 读取文件内容为Base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // 实际调用API的函数
  const handleInitDatabase = async (values) => {
    try {
      if (!selectedFile) {
        message.error('请先选择数据库文件');
        return;
      }

      setLoading(true);

      // 获取token（根据您的实际存储方式调整）
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        message.error('未找到认证token，请重新登录');
        setLoading(false);
        return;
      }

      // 准备请求数据
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

      // 实际API调用
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

  // 如果需要上传文件内容，使用这个版本
  const handleInitDatabaseWithFileUpload = async (values) => {
    try {
      if (!selectedFile) {
        message.error('请先选择数据库文件');
        return;
      }

      setLoading(true);

      // 获取token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        message.error('未找到认证token，请重新登录');
        setLoading(false);
        return;
      }

      // 读取文件内容
      const fileContent = await readFileAsBase64(selectedFile);
      
      // 准备请求数据（包含文件内容）
      const requestData = {
        file_name: selectedFile.name,
        file_content: fileContent.split(',')[1], // 移除data:application/octet-stream;base64,前缀
        file_size: selectedFile.size,
        num_rows: 0,
        key_len: values.value_length || 8,
        mode: values.mode,
        val: values.hot_param,
        pro_limit: values.hot_param,
        rate_of_pop: values.hot_param,
        p_worse: values.p_worse || 0.1,
        use_ntt: values.use_ntt ? 1 : 0
      };

      console.log('发送初始化请求（含文件）:', {
        ...requestData,
        file_content: `${requestData.file_content.substring(0, 50)}...` // 只打印前50字符
      });

      // 实际API调用
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
      <Card title="系统配置" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 0 }}>
        {/* 隐私参数配置和系统统计部分保持不变 */}
        <Row 
          gutter={24}
          align="stretch"
          justify="space-between"
          style={{ 
            width: '100%', 
            minHeight: '500px', 
            padding: 0, 
            margin: 0
          }}
        >
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Card 
              title="隐私参数配置" 
              size="small"
              style={{ height: '100%', borderRadius: 6, padding: 16 }}
            >
              <Form layout="vertical">
                <Form.Item 
                  label={
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      p_worse 隐私参数
                    </div>
                  }
                  extra={
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                      当前值: {pWorse.toFixed(2)} | 控制查询隐私级别 (0=性能优先, 1=隐私优先)
                    </div>
                  }
                  style={{ padding: '0 16px' }}
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
                            width: `${pWorse * 100}%`
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
              </Form>
            </Card>
          </Col>

          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Card 
              title="系统统计" 
              style={{ 
                height: '100%', 
                minHeight: '400px', 
                borderRadius: 6, 
                textAlign: 'center' 
              }}
            >
              <Row gutter={[16, 24]}>
                <Col xs={12} sm={8} lg={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Statistic 
                      title="总记录数" 
                      value={stats?.records_count || 0}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </div>
                </Col>
                <Col xs={12} sm={8} lg={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Statistic 
                      title="用户数" 
                      value={stats?.users_count || 0}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </div>
                </Col>
                <Col xs={24} sm={8} lg={24}>
                  <div style={{ textAlign: 'center' }}>
                    <Statistic 
                      title="平均查询时间" 
                      value={(stats?.performance_stats?.avg_query_time || 0).toFixed(2)} 
                      suffix="ms"
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </div>
                </Col>
              </Row>  
              <div style={{ marginTop: 24, padding: '16px 0', borderTop: '1px solid #f0f0f0' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                        系统运行状态
                      </div>
                      <Tag color="green">正常</Tag>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                        最后备份
                      </div>
                      <div style={{ fontSize: '12px' }}>--</div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>
        </Row>
        
        {/* 高级操作部分 */}
        <Card title="高级操作" style={{ marginTop: 32, borderRadius: 6 }} size="small">
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleInitDatabase} // 使用这个版本，如果后端需要文件内容，改为handleInitDatabaseWithFileUpload
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
                    addonAfter={
                      <Button 
                        type="link" 
                        size="small"
                        onClick={triggerFileInput}
                        disabled={loading}
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
                    padding: 8, 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: 4,
                    fontSize: '12px'
                  }}>
                    <div><strong>文件名:</strong> {selectedFile.name}</div>
                    <div><strong>文件大小:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</div>
                    <div><strong>类型:</strong> {selectedFile.type || '未知'}</div>
                  </div>
                )}
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
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
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="mode"
                  label="热门数据库选取模式"
                  rules={[{ required: true, message: '请选择选取模式' }]}
                >
                  <Select placeholder="请选择模式" disabled={loading}>
                    <Select.Option value="rate">比例模式</Select.Option>
                    <Select.Option value="lim">概率模式</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
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
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
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
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="use_ntt"
                  label="使用NTT加速"
                  rules={[{ required: true, message: '请选择是否使用NTT加速' }]}
                >
                  <Select placeholder="请选择" disabled={loading}>
                    <Select.Option value={1}>是</Select.Option>
                    <Select.Option value={0}>否</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ textAlign: 'center', marginTop: 24 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                loading={loading}
                disabled={!selectedFile}
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