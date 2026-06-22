import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Typography, 
  Avatar, 
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  FieldTimeOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const Users = () => {
  const { user: currentUser, canManageUsers } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byRole: {}
  });

  useEffect(() => {
    if (canManageUsers) {
      loadUsers();
      loadUserStats();
    }
  }, [canManageUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users', {
        params: {
          page: 1,
          limit: 100,
          sortBy: 'created_at',
          sortOrder: 'DESC'
        }
      });

      if (response.data.success) {
        setUsers(response.data.data.users);
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      message.error('Error cargando la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await axios.get('/api/users/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    });
    setModalVisible(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      // TODO: Implementar endpoint real de eliminación
      message.success('Usuario eliminado exitosamente');
      loadUsers();
      loadUserStats();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      message.error('Error eliminando el usuario');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      // TODO: Implementar endpoint real de cambio de estado
      const newStatus = !currentStatus;
      message.success(`Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
      loadUsers();
      loadUserStats();
    } catch (error) {
      console.error('Error cambiando estado del usuario:', error);
      message.error('Error cambiando el estado del usuario');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        const response = await axios.put(`/api/users/${editingUser.id}`, values);
        if (response.data.success) {
          message.success('Usuario actualizado exitosamente');
        }
      } else {
        const response = await axios.post('/api/users', values);
        if (response.data.success) {
          message.success('Usuario creado exitosamente');
        }
      }
      setModalVisible(false);
      loadUsers();
      loadUserStats();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      message.error(error.response?.data?.message || error.response?.data?.error || 'Error guardando el usuario');
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      'Administrador del Sistema': 'red',
      'Revisión de Calidad': 'blue',
      'Reconocedor Predial': 'green',
      'Digitador Alfanumérico': 'orange'
    };
    return colors[role] || 'default';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'Administrador del Sistema': <CrownOutlined />,
      'Revisión de Calidad': <SafetyCertificateOutlined />,
      'Reconocedor Predial': <FieldTimeOutlined />,
      'Digitador Alfanumérico': <CheckCircleOutlined />
    };
    return icons[role] || <UserOutlined />;
  };

  const columns = [
    {
      title: 'Usuario',
      dataIndex: 'username',
      key: 'username',
      render: (username, record) => (
        <Space>
          <Avatar 
            icon={getRoleIcon(record.role)}
            style={{ backgroundColor: getRoleColor(record.role) }}
          />
          <div>
            <Text strong>{username}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.full_name}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => <Text copyable>{email}</Text>
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={getRoleColor(role)} icon={getRoleIcon(role)}>
          {role}
        </Tag>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Tag>
      )
    },
    {
      title: 'Último Acceso',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (lastLogin) => (
        <Text type="secondary">
          {new Date(lastLogin).toLocaleString('es-ES')}
        </Text>
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
            />
          </Tooltip>
          
          <Tooltip title="Editar usuario">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          
          <Tooltip title={record.is_active ? 'Desactivar' : 'Activar'}>
            <Button 
              type="text" 
              icon={record.is_active ? <LockOutlined /> : <UnlockOutlined />}
              size="small"
              onClick={() => handleToggleStatus(record.id, record.is_active)}
            />
          </Tooltip>
          
          {record.role !== 'Administrador del Sistema' && (
            <Popconfirm
              title="¿Estás seguro de eliminar este usuario?"
              description="Esta acción no se puede deshacer."
              onConfirm={() => handleDeleteUser(record.id)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
            >
              <Tooltip title="Eliminar usuario">
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  if (!canManageUsers) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <LockOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
          <Title level={3} style={{ color: '#ff4d4f' }}>
            Acceso Denegado
          </Title>
          <Text type="secondary">
            No tienes permisos para gestionar usuarios en el sistema.
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
          <TeamOutlined style={{ marginRight: '12px' }} />
          Gestión de Usuarios
        </Title>
        <Text type="secondary">
          Administra los usuarios del sistema GPCONES y sus roles.
        </Text>
      </div>

      {/* Estadísticas */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total de Usuarios"
              value={stats.total}
              prefix={<TeamOutlined style={{ color: '#2E8B57' }} />}
              valueStyle={{ color: '#2E8B57' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Usuarios Activos"
              value={stats.active}
              prefix={<CheckCircleOutlined style={{ color: '#32CD32' }} />}
              valueStyle={{ color: '#32CD32' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Usuarios Inactivos"
              value={stats.inactive}
              prefix={<LockOutlined style={{ color: '#FFD700' }} />}
              valueStyle={{ color: '#FFD700' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Roles Diferentes"
              value={Object.keys(stats.byRole || {}).length}
              prefix={<CrownOutlined style={{ color: '#1E90FF' }} />}
              valueStyle={{ color: '#1E90FF' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabla de Usuarios */}
      <Card
        title="Lista de Usuarios"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreateUser}
          >
            Nuevo Usuario
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} de ${total} usuarios`
          }}
        />
      </Card>

      {/* Modal de Usuario */}
      <Modal
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Nombre de Usuario"
                rules={[
                  { required: true, message: 'El nombre de usuario es obligatorio' },
                  { min: 3, message: 'Mínimo 3 caracteres' }
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder="Ingrese el usuario" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'El email es obligatorio' },
                  { type: 'email', message: 'Email inválido' }
                ]}
              >
                <Input placeholder="usuario@ejemplo.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="full_name"
            label="Nombre Completo"
            rules={[
              { required: true, message: 'El nombre completo es obligatorio' }
            ]}
          >
            <Input placeholder="Ingrese el nombre completo" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Rol"
                rules={[
                  { required: true, message: 'El rol es obligatorio' }
                ]}
              >
                <Select placeholder="Seleccione un rol">
                  <Option value="Administrador del Sistema">
                    Administrador del Sistema
                  </Option>
                  <Option value="Revisión de Calidad">
                    Revisión de Calidad
                  </Option>
                  <Option value="Reconocedor Predial">
                    Reconocedor Predial
                  </Option>
                  <Option value="Digitador Alfanumérico">
                    Digitador Alfanumérico
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="Estado"
                rules={[
                  { required: true, message: 'El estado es obligatorio' }
                ]}
              >
                <Select placeholder="Seleccione el estado">
                  <Option value={true}>Activo</Option>
                  <Option value={false}>Inactivo</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Contraseña"
              rules={[
                { required: true, message: 'La contraseña es obligatoria' },
                { min: 8, message: 'Mínimo 8 caracteres' },
                { 
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                  message: 'Debe contener mayúscula, minúscula, número y carácter especial'
                }
              ]}
            >
              <Input.Password placeholder="Ingrese la contraseña" />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Actualizar' : 'Crear'}
              </Button>
            </Space>
          </Form.Item>
                 </Form>
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

export default Users;
