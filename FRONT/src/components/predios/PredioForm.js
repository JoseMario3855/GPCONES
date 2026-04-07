import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Space,
  Alert,
  Steps,
  Upload,
  Modal
} from 'antd';
import {
  SaveOutlined,
  EnvironmentOutlined,
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

const PredioForm = ({ predioId = null, onSuccess = null }) => {
  const { user, canManagePredios } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [geometry, setGeometry] = useState(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  // Verificar permisos
  useEffect(() => {
    if (!canManagePredios) {
      message.error('No tienes permisos para gestionar predios');
      navigate('/predios');
    }
  }, [canManagePredios, navigate]);

  // Cargar datos del predio si es edición
  useEffect(() => {
    if (predioId) {
      loadPredioData();
    }
  }, [predioId]);

  const loadPredioData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/predios/${predioId}`);
      if (response.data.success) {
        const predio = response.data.data;
        form.setFieldsValue({
          npn: predio.npn,
          municipio: predio.municipio,
          zona: predio.zona,
          sector: predio.sector,
          numero_ficha: predio.numero_ficha,
          area_hectareas: predio.area_hectareas,
          tipo_predio: predio.tipo_predio,
          uso_predio: predio.uso_predio,
          propietario_nombre: predio.propietario_nombre,
          propietario_documento: predio.propietario_documento,
          propietario_tipo_documento: predio.propietario_tipo_documento,
          observaciones: predio.observaciones
        });
        setGeometry(predio.geometry);
      }
    } catch (error) {
      console.error('Error cargando predio:', error);
      message.error('Error cargando los datos del predio');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);

      // Validar que se haya definido geometría
      if (!geometry) {
        message.error('Debe definir la geometría del predio');
        setCurrentStep(2); // Ir al paso de geometría
        return;
      }

      const predioData = {
        ...values,
        geometry: geometry
      };

      let response;
      if (predioId) {
        // Actualizar predio existente
        response = await axios.put(`/api/predios/${predioId}`, predioData);
      } else {
        // Crear nuevo predio
        response = await axios.post('/api/predios', predioData);
      }

      if (response.data.success) {
        message.success(
          predioId 
            ? 'Predio actualizado exitosamente' 
            : 'Predio registrado exitosamente'
        );
        
        if (onSuccess) {
          onSuccess(response.data.data);
        } else {
          navigate('/predios');
        }
      }
    } catch (error) {
      console.error('Error guardando predio:', error);
      if (error.response?.data?.error === 'NPN duplicado') {
        message.error('El NPN ya existe en el sistema');
        form.setFields([{
          name: 'npn',
          errors: ['Este NPN ya está registrado']
        }]);
      } else {
        message.error(
          error.response?.data?.message || 
          'Error guardando el predio'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Datos Básicos',
      description: 'Información catastral básica',
      icon: <FileTextOutlined />
    },
    {
      title: 'Información Física',
      description: 'Características del predio',
      icon: <HomeOutlined />
    },
    {
      title: 'Propietario',
      description: 'Datos del propietario',
      icon: <UserOutlined />
    },
    {
      title: 'Geometría',
      description: 'Ubicación espacial',
      icon: <EnvironmentOutlined />
    }
  ];

  const nextStep = () => {
    form.validateFields().then(() => {
      setCurrentStep(currentStep + 1);
    }).catch((errorInfo) => {
      console.log('Validation failed:', errorInfo);
    });
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="npn"
                label="NPN (Número de Predio Nacional)"
                rules={[
                  { required: true, message: 'El NPN es obligatorio' },
                  { min: 1, max: 50, message: 'El NPN debe tener entre 1 y 50 caracteres' }
                ]}
              >
                <Input 
                  placeholder="Ej: 12345-67890"
                  prefix={<FileTextOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="municipio"
                label="Municipio"
                rules={[
                  { required: true, message: 'El municipio es obligatorio' },
                  { min: 1, max: 100, message: 'El municipio debe tener entre 1 y 100 caracteres' }
                ]}
              >
                <Select placeholder="Seleccione el municipio" showSearch>
                  <Option value="Medellín">Medellín</Option>
                  <Option value="Bello">Bello</Option>
                  <Option value="Envigado">Envigado</Option>
                  <Option value="Itagüí">Itagüí</Option>
                  <Option value="Sabaneta">Sabaneta</Option>
                  <Option value="La Estrella">La Estrella</Option>
                  <Option value="Caldas">Caldas</Option>
                  <Option value="Copacabana">Copacabana</Option>
                  <Option value="Girardota">Girardota</Option>
                  <Option value="Barbosa">Barbosa</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="zona"
                label="Zona"
                rules={[
                  { max: 100, message: 'La zona no puede exceder 100 caracteres' }
                ]}
              >
                <Input placeholder="Ej: Zona Norte, Zona Sur" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="sector"
                label="Sector"
                rules={[
                  { max: 100, message: 'El sector no puede exceder 100 caracteres' }
                ]}
              >
                <Input placeholder="Ej: Centro, Comercial, Residencial" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="numero_ficha"
                label="Número de Ficha"
                rules={[
                  { max: 50, message: 'El número de ficha no puede exceder 50 caracteres' }
                ]}
              >
                <Input placeholder="Ej: F-001-2024" />
              </Form.Item>
            </Col>
          </Row>
        );

      case 1:
        return (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="area_hectareas"
                label="Área (Hectáreas)"
                rules={[
                  { type: 'number', min: 0, message: 'El área debe ser un número positivo' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.0000"
                  precision={4}
                  min={0}
                  step={0.0001}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="tipo_predio"
                label="Tipo de Predio"
                rules={[
                  { required: true, message: 'El tipo de predio es obligatorio' }
                ]}
              >
                <Select placeholder="Seleccione el tipo de predio">
                  <Option value="URBANO">Urbano</Option>
                  <Option value="RURAL">Rural</Option>
                  <Option value="MIXTO">Mixto</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="uso_predio"
                label="Uso del Predio"
                rules={[
                  { required: true, message: 'El uso del predio es obligatorio' }
                ]}
              >
                <Select placeholder="Seleccione el uso del predio">
                  <Option value="RESIDENCIAL">Residencial</Option>
                  <Option value="COMERCIAL">Comercial</Option>
                  <Option value="INDUSTRIAL">Industrial</Option>
                  <Option value="AGRICOLA">Agrícola</Option>
                  <Option value="PECUARIO">Pecuario</Option>
                  <Option value="FORESTAL">Forestal</Option>
                  <Option value="MINERO">Minero</Option>
                  <Option value="ESPECIAL">Especial</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                name="observaciones"
                label="Observaciones"
              >
                <TextArea
                  rows={4}
                  placeholder="Observaciones adicionales sobre el predio..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        );

      case 2:
        return (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="propietario_nombre"
                label="Nombre del Propietario"
                rules={[
                  { required: true, message: 'El nombre del propietario es obligatorio' },
                  { max: 200, message: 'El nombre no puede exceder 200 caracteres' }
                ]}
              >
                <Input 
                  placeholder="Nombre completo del propietario"
                  prefix={<UserOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="propietario_tipo_documento"
                label="Tipo de Documento"
                rules={[
                  { required: true, message: 'El tipo de documento es obligatorio' }
                ]}
              >
                <Select placeholder="Seleccione el tipo de documento">
                  <Option value="CC">Cédula de Ciudadanía</Option>
                  <Option value="CE">Cédula de Extranjería</Option>
                  <Option value="NIT">NIT</Option>
                  <Option value="RUT">RUT</Option>
                  <Option value="TI">Tarjeta de Identidad</Option>
                  <Option value="RC">Registro Civil</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="propietario_documento"
                label="Número de Documento"
                rules={[
                  { required: true, message: 'El número de documento es obligatorio' },
                  { max: 20, message: 'El documento no puede exceder 20 caracteres' }
                ]}
              >
                <Input placeholder="Número de documento del propietario" />
              </Form.Item>
            </Col>
          </Row>
        );

      case 3:
        return (
          <div>
            <Alert
              message="Definición de Geometría"
              description="Para completar el registro del predio, debe definir su geometría (ubicación espacial). Puede dibujar el polígono en el mapa o cargar un archivo GeoJSON."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="Dibujar en Mapa" size="small">
                  <Button 
                    type="primary" 
                    icon={<EnvironmentOutlined />}
                    onClick={() => setMapModalVisible(true)}
                    style={{ width: '100%' }}
                  >
                    Abrir Mapa
                  </Button>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Cargar GeoJSON" size="small">
                  <Upload
                    accept=".json,.geojson"
                    beforeUpload={(file) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        try {
                          const geoJson = JSON.parse(e.target.result);
                          if (geoJson.type === 'Feature' || geoJson.type === 'FeatureCollection') {
                            setGeometry(geoJson);
                            message.success('Geometría cargada exitosamente');
                          } else {
                            message.error('El archivo no es un GeoJSON válido');
                          }
                        } catch (error) {
                          message.error('Error leyendo el archivo GeoJSON');
                        }
                      };
                      reader.readAsText(file);
                      return false; // Prevenir upload automático
                    }}
                  >
                    <Button icon={<PlusOutlined />} style={{ width: '100%' }}>
                      Cargar Archivo
                    </Button>
                  </Upload>
                </Card>
              </Col>
            </Row>

            {geometry && (
              <Alert
                message="Geometría Definida"
                description="El predio tiene geometría asignada. Puede continuar con el registro."
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/predios')}
            >
              Volver
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {predioId ? 'Editar Predio' : 'Registrar Nuevo Predio'}
            </Title>
          </Space>
        </div>

        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={step.icon}
            />
          ))}
        </Steps>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          {renderStepContent()}

          <Divider />

          <Row justify="space-between">
            <Col>
              {currentStep > 0 && (
                <Button onClick={prevStep}>
                  Anterior
                </Button>
              )}
            </Col>
            <Col>
              <Space>
                {currentStep < steps.length - 1 ? (
                  <Button type="primary" onClick={nextStep}>
                    Siguiente
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<SaveOutlined />}
                  >
                    {predioId ? 'Actualizar Predio' : 'Registrar Predio'}
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Modal del Mapa - Placeholder para implementación futura */}
      <Modal
        title="Definir Geometría del Predio"
        open={mapModalVisible}
        onCancel={() => setMapModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setMapModalVisible(false)}>
            Cancelar
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            onClick={() => {
              // TODO: Implementar guardado de geometría desde mapa
              setMapModalVisible(false);
              message.info('Funcionalidad de mapa en desarrollo');
            }}
          >
            Guardar Geometría
          </Button>
        ]}
      >
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
          <div style={{ textAlign: 'center' }}>
            <EnvironmentOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <Title level={4}>Mapa Interactivo</Title>
            <Text type="secondary">
              La funcionalidad de mapa interactivo estará disponible en la próxima versión.
              Por ahora, puede cargar un archivo GeoJSON con la geometría del predio.
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PredioForm;
