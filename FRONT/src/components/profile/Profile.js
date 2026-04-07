import React, { useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Avatar, 
  Typography, 
  Button, 
  Space, 
  Divider, 
  Form, 
  Input, 
  Modal, 
  message, 
  Descriptions, 
  Tag,
  Statistic,
  Timeline
} from 'antd';
import { 
  UserOutlined, 
  EditOutlined, 
  LockOutlined, 
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  MailOutlined,
  CrownOutlined,
  FieldTimeOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const Profile = () => {
  const { user, changePassword } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleEditProfile = () => {
    editForm.setFieldsValue({
      full_name: user?.full_name,
      email: user?.email
    });
    setEditModalVisible(true);
  };

  const handleChangePassword = () => {
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handleEditSubmit = async (values) => {
    try {
      setLoading(true);
      // TODO: Implementar endpoint real de actualización de perfil
      message.success('Perfil actualizado exitosamente');
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      message.error('Error actualizando el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (values) => {
    try {
      setLoading(true);
      const result = await changePassword(values.currentPassword, values.newPassword);
      if (result.success) {
        setPasswordModalVisible(false);
        passwordForm.resetFields();
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      message.error('Error cambiando la contraseña');
    } finally {
      setLoading(false);
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

  const getRoleDescription = (role) => {
    const descriptions = {
      'Administrador del Sistema': 'Acceso completo a todas las funcionalidades del sistema, gestión de usuarios y configuración.',
      'Revisión de Calidad': 'Validación y aprobación de predios, carga de archivos XTF, revisión de datos.',
      'Reconocedor Predial': 'Captura de información en campo, creación y edición de predios.',
      'Digitador Alfanumérico': 'Ingreso y corrección de datos catastrales, validación de información.'
    };
    return descriptions[role] || 'Rol del sistema con permisos específicos.';
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
          <UserOutlined style={{ marginRight: '12px' }} />
          Mi Perfil
        </Title>
        <Text type="secondary">
          Gestiona tu información personal y configuración de cuenta.
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Información del Usuario */}
        <Col xs={24} lg={16}>
          <Card title="Información Personal">
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                <Avatar 
                  size={120} 
                  icon={getRoleIcon(user?.role)}
                  style={{ 
                    backgroundColor: getRoleColor(user?.role),
                    marginBottom: '16px'
                  }}
                />
                <div>
                  <Title level={4} style={{ margin: '8px 0' }}>
                    {user?.full_name}
                  </Title>
                  <Tag 
                    color={getRoleColor(user?.role)} 
                    icon={getRoleIcon(user?.role)}
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                  >
                    {user?.role}
                  </Tag>
                </div>
              </Col>
              
              <Col xs={24} sm={16}>
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="Nombre de Usuario">
                    <Text strong>@{user?.username}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Nombre Completo">
                    {user?.full_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    <Text copyable>{user?.email}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Rol del Sistema">
                    <Tag 
                      color={getRoleColor(user?.role)} 
                      icon={getRoleIcon(user?.role)}
                    >
                      {user?.role}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Estado">
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      Activo
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Descripción del Rol">
                    {getRoleDescription(user?.role)}
                  </Descriptions.Item>
                </Descriptions>

                <div style={{ marginTop: '24px' }}>
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<EditOutlined />}
                      onClick={handleEditProfile}
                    >
                      Editar Perfil
                    </Button>
                    <Button 
                      icon={<LockOutlined />}
                      onClick={handleChangePassword}
                    >
                      Cambiar Contraseña
                    </Button>
                  </Space>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Estadísticas y Actividad */}
        <Col xs={24} lg={8}>
          <Row gutter={[0, 24]}>
            {/* Estadísticas Rápidas */}
            <Col span={24}>
              <Card title="Estadísticas Rápidas">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic
                      title="Sesiones"
                      value={12}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Predios"
                      value={45}
                      prefix={<GlobalOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* Actividad Reciente */}
            <Col span={24}>
              <Card title="Actividad Reciente">
                <Timeline size="small">
                  <Timeline.Item color="green">
                    <Text>Inicio de sesión exitoso</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Hoy 09:30
                    </Text>
                  </Timeline.Item>
                  <Timeline.Item color="blue">
                    <Text>Predio NPN 12345 creado</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Ayer 15:45
                    </Text>
                  </Timeline.Item>
                  <Timeline.Item color="blue">
                    <Text>Predio NPN 12346 editado</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Hace 2 días
                    </Text>
                  </Timeline.Item>
                </Timeline>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Modal de Edición de Perfil */}
      <Modal
        title="Editar Perfil"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="full_name"
            label="Nombre Completo"
            rules={[
              { required: true, message: 'El nombre completo es obligatorio' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Ingrese su nombre completo" 
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'El email es obligatorio' },
              { type: 'email', message: 'Email inválido' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="usuario@ejemplo.com" 
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditModalVisible(false)}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Actualizar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Cambio de Contraseña */}
      <Modal
        title="Cambiar Contraseña"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordSubmit}
        >
          <Form.Item
            name="currentPassword"
            label="Contraseña Actual"
            rules={[
              { required: true, message: 'La contraseña actual es obligatoria' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Ingrese su contraseña actual" 
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Nueva Contraseña"
            rules={[
              { required: true, message: 'La nueva contraseña es obligatoria' },
              { min: 6, message: 'La contraseña debe tener al menos 6 caracteres' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Ingrese la nueva contraseña" 
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirmar Nueva Contraseña"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Confirme la nueva contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Confirme la nueva contraseña" 
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setPasswordModalVisible(false)}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Cambiar Contraseña
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
