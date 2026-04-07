import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Divider, message, Alert, Spin } from 'antd';
import { LockOutlined, HomeOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [passwordReset, setPasswordReset] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setTokenExpired(true);
      setVerifying(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(`/api/auth/verify-reset-token/${token}`);
      if (response.data.success && response.data.valid) {
        setTokenValid(true);
        setUserInfo(response.data.user);
      } else {
        setTokenExpired(true);
      }
    } catch (error) {
      console.error('Error verificando token:', error);
      setTokenExpired(true);
    } finally {
      setVerifying(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/reset-password', {
        token: token,
        newPassword: values.newPassword
      });

      if (response.data.success) {
        setPasswordReset(true);
        message.success('Contraseña restablecida exitosamente');
      }
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      if (error.response?.data?.error) {
        message.error(error.response.data.message || 'Error restableciendo la contraseña');
      } else {
        message.error('Error inesperado en el proceso de restablecimiento');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de verificación
  if (verifying) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card
          style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}
          bodyStyle={{ padding: '40px' }}
        >
          <Spin size="large" />
          <div style={{ marginTop: '20px' }}>
            <Text style={{ fontSize: '16px' }}>Verificando enlace de recuperación...</Text>
          </div>
        </Card>
      </div>
    );
  }

  // Pantalla de token expirado/inválido
  if (tokenExpired) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card
          style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
          bodyStyle={{ padding: '32px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '16px' 
            }}>
              <HomeOutlined style={{ 
                fontSize: '32px', 
                color: '#ff4d4f', 
                marginRight: '12px' 
              }} />
              <Title level={2} style={{ margin: 0, color: '#ff4d4f' }}>
                GPCONES
              </Title>
            </div>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Sistema de Catastro Integral
            </Text>
          </div>

          <Alert
            message="Enlace Inválido o Expirado"
            description="El enlace de recuperación de contraseña no es válido o ha expirado. Los enlaces de recuperación expiran en 30 minutos por seguridad."
            type="error"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
              Solicita un nuevo enlace de recuperación
            </Text>
            <Link to="/forgot-password">
              <Button 
                type="primary" 
                style={{
                  borderRadius: '6px',
                  height: '40px',
                  paddingLeft: '24px',
                  paddingRight: '24px'
                }}
              >
                Solicitar Nuevo Enlace
              </Button>
            </Link>
          </div>

          <Divider style={{ margin: '24px 0' }}>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Volver al inicio
            </Text>
          </Divider>
          
          <div style={{ textAlign: 'center' }}>
            <Link to="/login">
              <Button 
                type="default" 
                icon={<ArrowLeftOutlined />}
                style={{
                  borderRadius: '6px',
                  height: '40px',
                  paddingLeft: '24px',
                  paddingRight: '24px'
                }}
              >
                Volver al Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Pantalla de contraseña restablecida exitosamente
  if (passwordReset) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card
          style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
          bodyStyle={{ padding: '32px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '16px' 
            }}>
              <CheckCircleOutlined style={{ 
                fontSize: '48px', 
                color: '#52c41a', 
                marginRight: '12px' 
              }} />
              <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                ¡Éxito!
              </Title>
            </div>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Contraseña restablecida exitosamente
            </Text>
          </div>

          <Alert
            message="Contraseña Actualizada"
            description={`Tu contraseña ha sido restablecida exitosamente para la cuenta ${userInfo?.email}. Ya puedes iniciar sesión con tu nueva contraseña.`}
            type="success"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <div style={{ textAlign: 'center' }}>
            <Link to="/login">
              <Button 
                type="primary" 
                icon={<ArrowLeftOutlined />}
                style={{
                  borderRadius: '6px',
                  height: '40px',
                  paddingLeft: '24px',
                  paddingRight: '24px'
                }}
              >
                Ir al Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Formulario de restablecimiento de contraseña
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2E8B57 0%, #1E90FF 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
        bodyStyle={{ padding: '32px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: '16px' 
          }}>
            <img 
              src="/logo.jpg" 
              alt="GPCONES Logo" 
              style={{ 
                width: '60px', 
                height: '60px', 
                marginRight: '12px',
                borderRadius: '8px'
              }} 
            />
            <Title level={2} style={{ margin: 0, color: '#2E8B57' }}>
              GPCONES
            </Title>
          </div>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            Sistema de Catastro Integral
          </Text>
          <Divider style={{ margin: '16px 0' }}>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Restablecer Contraseña
            </Text>
          </Divider>
        </div>

        {/* Información del usuario */}
        {userInfo && (
          <Alert
            message={`Restableciendo contraseña para: ${userInfo.full_name}`}
            description={`Usuario: ${userInfo.username} | Email: ${userInfo.email}`}
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Formulario de Restablecimiento */}
        <Form
          name="resetPassword"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="newPassword"
            label="Nueva Contraseña"
            rules={[
              { required: true, message: 'Por favor ingrese la nueva contraseña' },
              { min: 8, message: 'La contraseña debe tener al menos 8 caracteres' },
              { 
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                message: 'Debe contener al menos una minúscula, una mayúscula, un número y un carácter especial'
              }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Ingrese su nueva contraseña"
              style={{ borderRadius: '6px' }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirmar Nueva Contraseña"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Por favor confirme la nueva contraseña' },
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
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Confirme su nueva contraseña"
              style={{ borderRadius: '6px' }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #2E8B57 0%, #1E90FF 100%)',
                border: 'none'
              }}
            >
              {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Link 
              to="/login"
              style={{ 
                color: '#2E8B57',
                textDecoration: 'none',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeftOutlined />
              Volver al Login
            </Link>
          </Form.Item>
        </Form>

        {/* Información del sistema */}
        <Divider style={{ margin: '24px 0' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Información del Sistema
          </Text>
        </Divider>
        
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
            Versión: 1.0.0
          </Text>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
            Base de Datos: PostgreSQL con PostGIS
          </Text>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
            Autenticación: JWT
          </Text>
          <Divider style={{ margin: '16px 0' }}>
            <Text type="secondary" style={{ fontSize: '11px', color: '#8c8c8c' }}>
              Desarrollado por
            </Text>
          </Divider>
          <Text strong style={{ fontSize: '14px', color: '#2E8B57', display: 'block' }}>
            BY CONESTUDIOS
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default ResetPassword;
