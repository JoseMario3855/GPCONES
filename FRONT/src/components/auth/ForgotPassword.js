import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Divider, message, Alert } from 'antd';
import { MailOutlined, LockOutlined, HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { forgotPassword } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await forgotPassword(values.email);
      if (result.success) {
        setEmailSent(true);
      }
    } catch (error) {
      console.error('Error en forgot password:', error);
      message.error('Error inesperado en el proceso de recuperación');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
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
                color: '#1890ff', 
                marginRight: '12px' 
              }} />
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                GPCONES
              </Title>
            </div>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Sistema de Catastro Integral
            </Text>
          </div>

          <Alert
            message="Email Enviado Exitosamente"
            description="Si el email está registrado en nuestro sistema, recibirás un enlace de restablecimiento de contraseña en los próximos minutos."
            type="success"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
              ¿No recibiste el email? Verifica tu carpeta de spam o
            </Text>
            <Button 
              type="link" 
              onClick={() => setEmailSent(false)}
              style={{ padding: 0, height: 'auto' }}
            >
              intenta nuevamente
            </Button>
          </div>

          <Divider style={{ margin: '24px 0' }}>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Volver al inicio
            </Text>
          </Divider>
          
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
                Volver al Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

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
              Recuperación de Contraseña
            </Text>
          </Divider>
        </div>

        {/* Formulario de Recuperación */}
        <Form
          name="forgotPassword"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Por favor ingrese su email' },
              { type: 'email', message: 'Por favor ingrese un email válido' }
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Ingrese su email registrado"
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
              {loading ? 'Enviando...' : 'Enviar Email de Recuperación'}
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

export default ForgotPassword;
