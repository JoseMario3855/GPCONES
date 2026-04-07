import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      if (result.success) {
        // La redirección se maneja automáticamente en el contexto
      }
    } catch (error) {
      console.error('Error en login:', error);
      message.error('Error inesperado en el inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: '500px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
        bodyStyle={{ padding: '40px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: '20px' 
          }}>
            <img 
              src="/logo.jpg" 
              alt="GPCONES Logo" 
              style={{ 
                width: '70px', 
                height: '70px', 
                marginRight: '16px',
                borderRadius: '10px'
              }} 
            />
            <Title level={1} style={{ margin: 0, color: '#2E8B57', fontSize: '32px' }}>
              GPCONES
            </Title>
          </div>
          <Text type="secondary" style={{ fontSize: '18px', fontWeight: '500' }}>
            Sistema de Catastro Integral
          </Text>
          <Divider style={{ margin: '20px 0' }}>
            <Text type="secondary" style={{ fontSize: '15px' }}>
              Cumplimiento con estándares IGAC y Antioquia
            </Text>
          </Divider>
        </div>

        {/* Formulario de Login */}
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            label="Usuario"
            rules={[
              { required: true, message: 'Por favor ingrese su nombre de usuario' },
              { min: 3, message: 'El usuario debe tener al menos 3 caracteres' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Ingrese su nombre de usuario"
              style={{ borderRadius: '6px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: 'Por favor ingrese su contraseña' },
              { min: 6, message: 'La contraseña debe tener al menos 6 caracteres' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Ingrese su contraseña"
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
              {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
                         <Link 
               to="/forgot-password"
               style={{ 
                 color: '#2E8B57',
                 textDecoration: 'none',
                 fontSize: '14px'
               }}
             >
              ¿Olvidó su contraseña?
            </Link>
          </Form.Item>
        </Form>

        {/* Información del sistema */}
        <Divider style={{ margin: '32px 0' }}>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            Información del Sistema
          </Text>
        </Divider>
        
                 <div style={{ textAlign: 'center' }}>
           <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
             Versión: 1.0.0
           </Text>
           <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
             Base de Datos: PostgreSQL con PostGIS
           </Text>
           <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>
             Autenticación: JWT
           </Text>
           <Divider style={{ margin: '20px 0' }}>
             <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
               Desarrollado por
             </Text>
           </Divider>
           <Text strong style={{ fontSize: '16px', color: '#2E8B57', display: 'block' }}>
             BY CONESTUDIOS
           </Text>
         </div>
      </Card>
    </div>
  );
};

export default Login;
