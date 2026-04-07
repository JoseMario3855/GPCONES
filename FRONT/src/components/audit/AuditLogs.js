import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Avatar, 
  Row, 
  Col, 
  Statistic, 
  DatePicker, 
  Select, 
  Input, 
  Form,
  Modal,
  Descriptions,
  Timeline,
  Divider,
  Tooltip,
  Badge,
  message
} from 'antd';
import { 
  AuditOutlined, 
  SearchOutlined, 
  DownloadOutlined, 
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  HomeOutlined,
  UploadOutlined,
  BarChartOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const AuditLogs = () => {
  const { user: currentUser, canViewAuditLogs } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    today: 0,
    byModule: {},
    byAction: {}
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (canViewAuditLogs) {
      loadAuditLogs();
      loadAuditStats();
    }
  }, [canViewAuditLogs]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      // TODO: Implementar endpoint real de auditoría
      const mockLogs = [
        {
          id: '1',
          user_id: '1',
          user_name: 'admin',
          user_full_name: 'Administrador del Sistema',
          action: 'CREACION_PREDIO',
          module: 'GESTION_CATASTRAL',
          details: 'Nuevo predio creado: NPN 12345 en Medellín',
          timestamp: new Date().toISOString(),
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          is_critical: false,
          previous_state: null,
          new_state: {
            npn: '12345',
            municipio: 'Medellín',
            estado: 'Borrador'
          }
        },
        {
          id: '2',
          user_id: '2',
          user_name: 'revisor',
          user_full_name: 'María García',
          action: 'CAMBIO_ESTADO_PREDIO',
          module: 'GESTION_CATASTRAL',
          details: 'Predio NPN 12345 aprobado',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          is_critical: true,
          previous_state: { estado: 'En Revisión' },
          new_state: { estado: 'Aprobado' }
        },
        {
          id: '3',
          user_id: '3',
          user_name: 'reconocedor',
          user_full_name: 'Juan Pérez',
          action: 'LOGIN_EXITOSO',
          module: 'AUTH',
          details: 'Inicio de sesión exitoso',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          is_critical: false,
          previous_state: null,
          new_state: null
        },
        {
          id: '4',
          user_id: '1',
          user_name: 'admin',
          user_full_name: 'Administrador del Sistema',
          action: 'CAMBIO_ROL_USUARIO',
          module: 'AUTH',
          details: 'Rol de usuario "reconocedor" cambiado a "Reconocedor Predial"',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          is_critical: true,
          previous_state: { role: 'Digitador Alfanumérico' },
          new_state: { role: 'Reconocedor Predial' }
        }
      ];
      setAuditLogs(mockLogs);
    } catch (error) {
      console.error('Error cargando logs de auditoría:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditStats = async () => {
    try {
      // TODO: Implementar endpoint real de estadísticas de auditoría
      const mockStats = {
        total: 4,
        critical: 2,
        today: 1,
        byModule: {
          'GESTION_CATASTRAL': 2,
          'AUTH': 2
        },
        byAction: {
          'CREACION_PREDIO': 1,
          'CAMBIO_ESTADO_PREDIO': 1,
          'LOGIN_EXITOSO': 1,
          'CAMBIO_ROL_USUARIO': 1
        }
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error cargando estadísticas de auditoría:', error);
    }
  };

  const handleFilter = (values) => {
    setFilters(values);
    // TODO: Implementar filtrado real
    loadAuditLogs();
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  };

  const handleExport = async (format) => {
    try {
      // TODO: Implementar exportación real
      message.success(`Exportando logs en formato ${format}...`);
    } catch (error) {
      console.error('Error exportando logs:', error);
      message.error('Error en la exportación');
    }
  };

  const getActionColor = (action) => {
    const colors = {
      'CREACION_PREDIO': 'blue',
      'CAMBIO_ESTADO_PREDIO': 'green',
      'LOGIN_EXITOSO': 'cyan',
      'LOGOUT': 'orange',
      'CAMBIO_ROL_USUARIO': 'red',
      'CAMBIO_PASSWORD': 'purple',
      'ELIMINACION_PREDIO': 'red',
      'CARGA_XTF': 'geekblue'
    };
    return colors[action] || 'default';
  };

  const getModuleIcon = (module) => {
    const icons = {
      'GESTION_CATASTRAL': <HomeOutlined />,
      'AUTH': <UserOutlined />,
      'XTF': <UploadOutlined />,
      'AUDIT': <BarChartOutlined />
    };
    return icons[module] || <FileTextOutlined />;
  };

  const getActionLabel = (action) => {
    const labels = {
      'CREACION_PREDIO': 'Creación de Predio',
      'CAMBIO_ESTADO_PREDIO': 'Cambio de Estado',
      'LOGIN_EXITOSO': 'Inicio de Sesión',
      'LOGOUT': 'Cierre de Sesión',
      'CAMBIO_ROL_USUARIO': 'Cambio de Rol',
      'CAMBIO_PASSWORD': 'Cambio de Contraseña',
      'ELIMINACION_PREDIO': 'Eliminación de Predio',
      'CARGA_XTF': 'Carga de XTF'
    };
    return labels[action] || action;
  };

  const columns = [
    {
      title: 'Usuario',
      dataIndex: 'user_full_name',
      key: 'user_full_name',
      render: (fullName, record) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />}
            style={{ backgroundColor: record.is_critical ? '#DC143C' : '#2E8B57' }}
          />
          <div>
            <Text strong>{fullName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              @{record.user_name}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Acción',
      dataIndex: 'action',
      key: 'action',
      render: (action) => (
        <Tag color={getActionColor(action)}>
          {getActionLabel(action)}
        </Tag>
      )
    },
    {
      title: 'Módulo',
      dataIndex: 'module',
      key: 'module',
      render: (module) => (
        <Tag icon={getModuleIcon(module)} color="blue">
          {module}
        </Tag>
      )
    },
    {
      title: 'Detalles',
      dataIndex: 'details',
      key: 'details',
      render: (details) => (
        <Text ellipsis={{ tooltip: details }}>
          {details}
        </Text>
      )
    },
    {
      title: 'Fecha/Hora',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => (
        <div>
          <Text strong>{moment(timestamp).format('DD/MM/YYYY')}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {moment(timestamp).format('HH:mm:ss')}
          </Text>
        </div>
      )
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (ip) => <Text copyable>{ip}</Text>
    },
    {
      title: 'Crítico',
      dataIndex: 'is_critical',
      key: 'is_critical',
      render: (isCritical) => (
        <Badge 
          status={isCritical ? 'error' : 'default'} 
          text={isCritical ? 'Sí' : 'No'} 
        />
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  if (!canViewAuditLogs) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <AuditOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
          <Title level={3} style={{ color: '#ff4d4f' }}>
            Acceso Denegado
          </Title>
          <Text type="secondary">
            No tienes permisos para ver los logs de auditoría del sistema.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#2E8B57' }}>
          <AuditOutlined style={{ marginRight: '12px' }} />
          Auditoría y Trazabilidad
        </Title>
        <Text type="secondary">
          Registro completo de todas las actividades del sistema GPCONES.
        </Text>
      </div>

      {/* Estadísticas */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total de Logs"
              value={stats.total}
              prefix={<AuditOutlined style={{ color: '#2E8B57' }} />}
              valueStyle={{ color: '#2E8B57' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Eventos Críticos"
              value={stats.critical}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hoy"
              value={stats.today}
              prefix={<ClockCircleOutlined style={{ color: '#FFD700' }} />}
              valueStyle={{ color: '#FFD700' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Módulos Activos"
              value={Object.keys(stats.byModule || {}).length}
              prefix={<SafetyCertificateOutlined style={{ color: '#32CD32' }} />}
              valueStyle={{ color: '#32CD32' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Card 
        title={
          <Space>
            <FilterOutlined />
            Filtros de Búsqueda
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Form
          form={form}
          layout="inline"
          onFinish={handleFilter}
          style={{ marginBottom: '16px' }}
        >
          <Form.Item name="dateRange" label="Rango de Fechas">
            <RangePicker 
              format="DD/MM/YYYY"
              placeholder={['Fecha Inicio', 'Fecha Fin']}
            />
          </Form.Item>
          
          <Form.Item name="module" label="Módulo">
            <Select 
              placeholder="Todos los módulos" 
              style={{ width: 200 }}
              allowClear
            >
              <Option value="GESTION_CATASTRAL">Gestión Catastral</Option>
              <Option value="AUTH">Autenticación</Option>
              <Option value="XTF">Carga XTF</Option>
              <Option value="AUDIT">Auditoría</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="action" label="Acción">
            <Select 
              placeholder="Todas las acciones" 
              style={{ width: 200 }}
              allowClear
            >
              <Option value="CREACION_PREDIO">Creación de Predio</Option>
              <Option value="CAMBIO_ESTADO_PREDIO">Cambio de Estado</Option>
              <Option value="LOGIN_EXITOSO">Inicio de Sesión</Option>
              <Option value="CAMBIO_ROL_USUARIO">Cambio de Rol</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="user" label="Usuario">
            <Input 
              placeholder="Buscar por usuario" 
              prefix={<UserOutlined />}
              style={{ width: 200 }}
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SearchOutlined />}
              >
                Filtrar
              </Button>
              <Button 
                onClick={() => {
                  form.resetFields();
                  setFilters({});
                  loadAuditLogs();
                }}
                icon={<ReloadOutlined />}
              >
                Limpiar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Tabla de Logs */}
      <Card
        title="Logs de Auditoría"
        extra={
          <Space>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => handleExport('CSV')}
            >
              Exportar CSV
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => handleExport('JSON')}
            >
              Exportar JSON
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={auditLogs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} de ${total} logs`
          }}
          rowClassName={(record) => 
            record.is_critical ? 'critical-log-row' : ''
          }
        />
      </Card>

      {/* Modal de Detalles */}
      <Modal
        title="Detalles del Log de Auditoría"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedLog && (
          <div>
            <Descriptions title="Información General" bordered column={2}>
              <Descriptions.Item label="ID del Log" span={1}>
                {selectedLog.id}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha y Hora" span={1}>
                {moment(selectedLog.timestamp).format('DD/MM/YYYY HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="Usuario" span={1}>
                {selectedLog.user_full_name} (@{selectedLog.user_name})
              </Descriptions.Item>
              <Descriptions.Item label="IP Address" span={1}>
                {selectedLog.ip_address}
              </Descriptions.Item>
              <Descriptions.Item label="Acción" span={1}>
                <Tag color={getActionColor(selectedLog.action)}>
                  {getActionLabel(selectedLog.action)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Módulo" span={1}>
                <Tag icon={getModuleIcon(selectedLog.module)} color="blue">
                  {selectedLog.module}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Crítico" span={1}>
                <Badge 
                  status={selectedLog.is_critical ? 'error' : 'default'} 
                  text={selectedLog.is_critical ? 'Sí' : 'No'} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="User Agent" span={2}>
                <Text ellipsis={{ tooltip: selectedLog.user_agent }}>
                  {selectedLog.user_agent}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="Detalles de la Acción" bordered>
              <Descriptions.Item label="Descripción" span={3}>
                {selectedLog.details}
              </Descriptions.Item>
            </Descriptions>

            {(selectedLog.previous_state || selectedLog.new_state) && (
              <>
                <Divider />
                <Title level={4}>Cambios Realizados</Title>
                <Timeline>
                  {selectedLog.previous_state && (
                    <Timeline.Item color="red">
                      <Text strong>Estado Anterior:</Text>
                      <br />
                      <Text code>
                        {JSON.stringify(selectedLog.previous_state, null, 2)}
                      </Text>
                    </Timeline.Item>
                  )}
                  {selectedLog.new_state && (
                    <Timeline.Item color="green">
                      <Text strong>Nuevo Estado:</Text>
                      <br />
                      <Text code>
                        {JSON.stringify(selectedLog.new_state, null, 2)}
                      </Text>
                    </Timeline.Item>
                  )}
                </Timeline>
              </>
            )}
                     </div>
         )}
       </Modal>
       
       {/* Footer con BY CONESTUDIOS */}
       <div style={{ 
         textAlign: 'center', 
         marginTop: '32px', 
         padding: '16px',
         borderTop: '1px solid #f0f0f0'
       }}>
         <Text type="secondary" style={{ fontSize: '12px', marginRight: '8px' }}>
           Desarrollado por
         </Text>
         <Text strong style={{ fontSize: '14px', color: '#2E8B57' }}>
           BY CONESTUDIOS
         </Text>
       </div>
     </div>
   );
 };

export default AuditLogs;
