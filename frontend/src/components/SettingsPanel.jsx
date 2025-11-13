import { Row, Col, Card, Form, InputNumber, Space, Button, Statistic, Tag, message } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';

const SettingsPanel = ({ pWorse, handlePWorseChange, stats, handleBackup }) => {
  return (
    <div style={{ width: '100%' }}>
      <Card 
        title="系统配置" 
        style={{ 
          borderRadius: 8, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
          padding: 0 
        }}
      >
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
          {/* 左侧Col：均衡 span=12 */}
          <Col 
            xs={24} 
            sm={24} 
            md={12} 
            lg={12} 
            xl={12}
          >
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

                <Form.Item 
                  label="数据管理"
                  extra="备份系统数据和记录"
                  style={{ marginBottom: 0, padding: '0 16px' }}
                >
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<CloudUploadOutlined />} 
                      onClick={handleBackup}
                    >
                      数据备份
                    </Button>
                    <Button 
                      type="default"
                      onClick={() => message.info('恢复功能待开发')}
                    >
                      数据恢复
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* 右侧Col：均衡 span=12 */}
          <Col 
            xs={24} 
            sm={24} 
            md={12} 
            lg={12} 
            xl={12}
          >
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
        <Card 
          title="高级操作" 
          style={{ marginTop: 32, borderRadius: 6 }} 
          size="small"
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Space wrap>
              <Button 
                type="dashed" 
                onClick={() => message.info('PIR 初始化功能待开发')}
              >
                初始化 PIR 数据库
              </Button>
              <Button 
                type="dashed"
                onClick={() => message.info('系统重置功能待开发')}
              >
                系统重置
              </Button>
              <Button 
                type="dashed"
                onClick={() => message.info('日志清理功能待开发')}
              >
                清理日志
              </Button>
            </Space>
          </div>
        </Card>
      </Card>
    </div>
  );
};

export default SettingsPanel;