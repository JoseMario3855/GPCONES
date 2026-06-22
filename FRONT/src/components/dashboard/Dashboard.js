import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Space, Button, Progress, List, Avatar, Tag } from 'antd';
import { 
  HomeOutlined, 
  UserOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  UploadOutlined,
  GlobalOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { user, permissions, municipioSeleccionado } = useAuth();
  const [stats, setStats] = useState({
    total: {
      total_predios: 0,
      area_total_ha: 0,
      area_promedio_ha: 0
    },
    por_estado: [],
    por_municipio: []
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [municipioSeleccionado]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar estadísticas de predios
      const params = {};
      if (municipioSeleccionado?.schema_name) {
        params.schema_name = municipioSeleccionado.schema_name;
      }
      
      const statsResponse = await axios.get('/api/predios/stats', { params });
      if (statsResponse.data.success && statsResponse.data.data) {
        const apiData = statsResponse.data.data;
        const general = apiData.general || {};
        
        // Transformar datos del API al formato esperado por el componente
        const transformedStats = {
          total: {
            total_predios: parseInt(general.total) || 0,
            area_total_ha: parseFloat(general.area_total) || 0,
            area_promedio_ha: parseFloat(general.area_promedio) || 0
          },
          por_estado: [
            { estado: 'Borrador', cantidad: parseInt(general.borrador) || 0 },
            { estado: 'En Revisión', cantidad: parseInt(general.en_revision) || 0 },
            { estado: 'Aprobado', cantidad: parseInt(general.aprobado) || 0 },
            { estado: 'Rechazado', cantidad: parseInt(general.rechazado) || 0 }
          ],
          por_municipio: (apiData.byMunicipio || []).map(item => ({
            municipio: item.municipio || 'Sin municipio',
            cantidad: parseInt(item.count_by_municipio) || 0,
            area_promedio_ha: parseFloat(item.area_promedio) || 0
          }))
        };
        
        setStats(transformedStats);
      }

      // TODO: Cargar actividad reciente desde audit_logs
      setRecentActivity([
        {
          id: 1,
          action: 'CREACION_PREDIO',
          user: 'Juan Pérez',
          details: 'Nuevo predio creado: NPN 12345 en Medellín',
          timestamp: new Date().toISOString(),
          module: 'GESTION_CATASTRAL'
        },
        {
          id: 2,
          action: 'CAMBIO_ESTADO_PREDIO',
          user: 'María García',
          details: 'Predio NPN 12345 aprobado',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          module: 'GESTION_CATASTRAL'
        }
      ]);

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Borrador': 'default',
      'En Revisión': 'processing',
      'Aprobado': 'success',
      'Rechazado': 'error'
    };
    return colors[status] || 'default';
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
      'CAMBIO_PASSWORD': 'Cambio de Contraseña'
    };
    return labels[action] || action;
  };

  return (
    <div>
      {/* Header del Dashboard */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#2E8B57' }}>
          <BarChartOutlined style={{ marginRight: '12px' }} />
          Dashboard GPCONES
        </Title>
        <Text type="secondary">
          Bienvenido, {user?.full_name}. Aquí tienes un resumen del sistema de catastro.
        </Text>
      </div>

      {/* Estadísticas Principales */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total de Predios"
              value={stats.total?.total_predios || 0}
              prefix={<HomeOutlined style={{ color: '#2E8B57' }} />}
              valueStyle={{ color: '#2E8B57' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Área Total (ha)"
              value={stats.total?.area_total_ha || 0}
              precision={2}
              prefix={<GlobalOutlined style={{ color: '#32CD32' }} />}
              valueStyle={{ color: '#32CD32' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Área Promedio (ha)"
              value={stats.total?.area_promedio_ha || 0}
              precision={2}
              prefix={<BarChartOutlined style={{ color: '#FFD700' }} />}
              valueStyle={{ color: '#FFD700' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Usuarios Activos"
              value={1} // TODO: Implementar contador real
              prefix={<UserOutlined style={{ color: '#1E90FF' }} />}
              valueStyle={{ color: '#1E90FF' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Contenido Principal */}
      <Row gutter={[24, 24]}>
        {/* Estado de Predios */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#2E8B57' }} />
                Estado de Predios
              </Space>
            }
            style={{ height: '100%' }}
          >
            {stats.por_estado?.map((item, index) => (
              <div key={index} style={{ marginBottom: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <Text strong>{item.estado}</Text>
                  <Text type="secondary">{item.cantidad} predios</Text>
                </div>
                <Progress
                  percent={stats.total?.total_predios > 0 ? 
                    Math.round((item.cantidad / stats.total.total_predios) * 100) : 0
                  }
                  strokeColor={{
                                '0%': '#2E8B57',
            '100%': '#2E8B57',
                  }}
                  showInfo={false}
                />
              </div>
            ))}
          </Card>
        </Col>

        {/* Top Municipios */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <GlobalOutlined style={{ color: '#32CD32' }} />
                Top Municipios
              </Space>
            }
            style={{ height: '100%' }}
          >
            <List
              dataSource={stats.por_municipio?.slice(0, 5) || []}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ 
                        backgroundColor: ['#2E8B57', '#32CD32', '#FFD700', '#1E90FF', '#DC143C'][index] 
                      }}>
                        {index + 1}
                      </Avatar>
                    }
                    title={item.municipio}
                    description={`${item.cantidad} predios - ${item.area_promedio_ha} ha promedio`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Actividad Reciente */}
      <Row style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#FFD700' }} />
                Actividad Reciente
              </Space>
            }
          >
            <List
              dataSource={recentActivity}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: '#2E8B57' }}>
                        {getModuleIcon(item.module)}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <Text strong>{getActionLabel(item.action)}</Text>
                        <Tag color="blue">{item.module}</Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <Text>{item.details}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Por: {item.user} • {new Date(item.timestamp).toLocaleString('es-ES')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Información del Sistema */}
      <Row style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                <SettingOutlined style={{ color: '#1E90FF' }} />
                Información del Sistema
              </Space>
            }
          >
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Versión:</Text> 1.0.0
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Base de Datos:</Text> PostgreSQL con PostGIS
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Autenticación:</Text> JWT
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Compliance:</Text> IGAC, Antioquia, LADM-COL
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Formato XTF:</Text> Soporte completo
                </div>
                                 <div style={{ marginBottom: '16px' }}>
                   <Text strong>Auditoría:</Text> Trazabilidad completa
                 </div>
               </Col>
             </Row>
           </Card>
         </Col>
       </Row>
       
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

export default Dashboard;
