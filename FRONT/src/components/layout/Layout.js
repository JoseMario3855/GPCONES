import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Button, Space, Typography, Select, message } from 'antd';
import axios from 'axios';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  HomeFilled,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  UploadOutlined,
  AuditOutlined,
  SettingOutlined,
  LogoutOutlined,
  ProfileOutlined,
  BarChartOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  SwapOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, permissions, municipioSeleccionado, seleccionarMunicipio, cambiarMunicipio } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [municipiosList, setMunicipiosList] = useState([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  useEffect(() => {
    if (user) {
      loadMunicipios();
    }
  }, [user]);

  const loadMunicipios = async () => {
    setLoadingMunicipios(true);
    try {
      const response = await axios.get('/api/municipios?activo=true');
      if (response.data.success) {
        const filtered = response.data.data.filter(m => parseInt(m.total_schemas, 10) > 0);
        setMunicipiosList(filtered);
      }
    } catch (error) {
      console.error('Error loading municipalities in Layout:', error);
    } finally {
      setLoadingMunicipios(false);
    }
  };

  const handleMunicipioChange = async (municipioId) => {
    try {
      const selectedM = municipiosList.find(m => m.id === municipioId);
      if (!selectedM) return;

      const response = await axios.get(`/api/municipios/${municipioId}`);
      if (response.data.success && response.data.data.schemas) {
        const schemasActivos = response.data.data.schemas.filter(s => s.activo);
        if (schemasActivos.length > 0) {
          const schemaSeleccionado = schemasActivos[0].schema_name;
          const municipioData = {
            municipio_id: selectedM.id,
            municipio_nombre: selectedM.nombre,
            municipio_codigo_dane: selectedM.codigo_dane,
            schema_name: schemaSeleccionado
          };
          seleccionarMunicipio(municipioData);
          navigate('/');
          window.location.reload();
        } else {
          message.warning('El municipio seleccionado no tiene esquemas activos');
        }
      }
    } catch (error) {
      console.error('Error changing municipality:', error);
      message.error('Error cambiando de municipio');
    }
  };

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: '/profile',
      icon: <ProfileOutlined />,
      label: 'Mi Perfil'
    },
    {
      key: 'change-password',
      icon: <SettingOutlined />,
      label: 'Cambiar Contraseña'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesión',
      onClick: handleLogout
    }
  ];

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: 'Dashboard',
      children: [
        {
          key: '/',
          icon: <BarChartOutlined />,
          label: 'Resumen General'
        }
      ]
    },
    // Gestión Catastral - Solo si puede ver predios
    ...(permissions.can_view_all_predios || permissions.can_create_predios ? [{
      key: '/predios',
      icon: <HomeFilled />,
      label: 'Gestión Catastral',
      children: [
        {
          key: '/predios',
          icon: <FileTextOutlined />,
          label: 'Lista de Predios'
        },

        ...(permissions.can_approve_predios || permissions.can_manage_users ? [{
          key: '/predios/revision',
          icon: <AuditOutlined />,
          label: 'Revisión Catastral'
        }] : []),
        ...(permissions.can_create_predios ? [{
          key: '/predios/nuevo',
          icon: <FileTextOutlined />,
          label: 'Nuevo Predio'
        }] : [])
      ]
    }] : []),
    // Carga de Archivos XTF - Solo si puede cargar XTF
    ...(permissions.can_load_xtf ? [{
      key: '/xtf',
      icon: <UploadOutlined />,
      label: 'Carga de Archivos',
      children: [
        {
          key: '/xtf/upload',
          icon: <UploadOutlined />,
          label: 'Cargar XTF'
        },
        {
          key: '/xtf/history',
          icon: <FileTextOutlined />,
          label: 'Registro de Cargas'
        },
        {
          key: '/xtf/validation',
          icon: <FileTextOutlined />,
          label: 'Validar Modelo'
        },
        {
          key: '/xtf/import-excel',
          icon: <FileExcelOutlined />,
          label: 'Importar IGAC Excel'
        }
      ]
    }] : []),
    // Gestión ILI/XTF - Solo si puede cargar XTF
    ...(permissions.can_load_xtf ? [{
      key: '/ili',
      icon: <DatabaseOutlined />,
      label: 'Gestión ILI/XTF',
      children: [
        {
          key: '/ili',
          icon: <DatabaseOutlined />,
          label: 'Cargar ILI/XTF'
        },
        {
          key: '/ili/explorer',
          icon: <EyeOutlined />,
          label: 'Explorar Schemas'
        }
      ]
    }] : []),
    // Consulta Alfanumérica - Disponible para todos los usuarios autenticados
    {
      key: '/consulta-alfanumerico',
      icon: <FileTextOutlined />,
      label: 'Consulta Alfanumérica'
    },
    // Gestión de Municipios - Solo administradores
    ...(permissions.can_manage_users ? [{
      key: '/municipios',
      icon: <EnvironmentOutlined />,
      label: 'Municipios y Schemas'
    }] : []),
    // Administración de Catálogos - Solo administradores
    ...(permissions.can_manage_users ? [{
      key: '/catalogos',
      icon: <DatabaseOutlined />,
      label: 'Catálogos y Dominios'
    }] : []),
    // Gestión de Usuarios - Solo administradores
    ...(permissions.can_manage_users ? [{
      key: '/users',
      icon: <TeamOutlined />,
      label: 'Gestión de Usuarios'
    }] : []),
    // Auditoría - Solo si puede ver logs de auditoría
    ...(permissions.can_view_audit_logs ? [{
      key: '/audit',
      icon: <AuditOutlined />,
      label: 'Auditoría y Trazabilidad'
    }] : [])
  ];

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === '/') return ['/'];
    if (path.startsWith('/predios')) return [path];
    if (path.startsWith('/propietarios')) return ['/propietarios'];
    if (path.startsWith('/xtf')) return [path];
    if (path.startsWith('/ili')) return ['/ili'];
    if (path.startsWith('/municipios')) return ['/municipios'];
    if (path.startsWith('/users')) return ['/users'];
    if (path.startsWith('/audit')) return ['/audit'];
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/predios') || path.startsWith('/propietarios')) return ['/predios'];
    if (path.startsWith('/xtf')) return ['/xtf'];
    return [];
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <GlobalOutlined style={{ 
              fontSize: collapsed ? '20px' : '24px', 
              color: '#2E8B57' 
            }} />
            {!collapsed && (
              <Text strong style={{ 
                color: '#2E8B57', 
                fontSize: '18px',
                margin: 0
              }}>
                GPCONES
              </Text>
            )}
          </div>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 'none',
            paddingTop: '16px'
          }}
        />
      </Sider>

      <AntLayout>
        <Header style={{
          padding: '0 24px',
          background: 'linear-gradient(135deg, #2E8B57 0%, #1E90FF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(46, 139, 87, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: '40px',
                height: '40px',
                color: 'white',
                marginRight: '16px'
              }}
            />
            <Text style={{ 
              color: 'white', 
              fontSize: '18px', 
              fontWeight: '600',
              margin: 0
            }}>
              Sistema de Catastro Integral
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Indicador de Municipio Seleccionado */}
            {municipioSeleccionado && (
              <Select
                value={municipioSeleccionado.municipio_id}
                onChange={handleMunicipioChange}
                loading={loadingMunicipios}
                style={{
                  width: '200px',
                }}
                dropdownStyle={{ zIndex: 10000 }}
                placeholder="Selecciona municipio"
                className="header-municipio-select"
                bordered={false}
              >
                {municipiosList.map(m => (
                  <Select.Option key={m.id} value={m.id}>
                    <Space>
                      <EnvironmentOutlined />
                      <span>{m.nombre}</span>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            )}
            
            <div style={{ textAlign: 'right' }}>
              <Text style={{ color: 'white', fontSize: '14px', display: 'block' }}>
                {user?.full_name}
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', display: 'block' }}>
                {user?.role}
              </Text>
            </div>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar 
                  size="large" 
                  icon={<UserOutlined />}
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}
                />
              </Space>
            </Dropdown>
          </div>
        </Header>

                 <Content style={{
           margin: '24px',
           padding: '24px',
           background: '#f5f5f5',
           borderRadius: '8px',
           minHeight: 'calc(100vh - 112px)',
           position: 'relative',
           overflow: 'hidden'
         }}>
                       {/* Logo de fondo */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.08,
              zIndex: 0,
              pointerEvents: 'none'
            }}>
              <img 
                src="/logo.jpg" 
                alt="GPCONES Background" 
                style={{ 
                  width: '500px', 
                  height: '500px',
                  objectFit: 'contain'
                }} 
              />
            </div>
           
           {/* Contenido principal */}
           <div style={{ position: 'relative', zIndex: 1 }}>
             <Outlet />
           </div>
           
           {/* Footer con BY CONESTUDIOS */}
           <div style={{
             position: 'absolute',
             bottom: '8px',
             right: '16px',
             zIndex: 2,
             opacity: 0.6
           }}>
             <Text type="secondary" style={{ fontSize: '11px' }}>
               BY CONESTUDIOS
             </Text>
           </div>
         </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
