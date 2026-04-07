import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Spin,
  Alert,
  Empty,
  Tag
} from 'antd';
import {
  EnvironmentOutlined,
  DatabaseOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const MunicipioSelector = () => {
  const { seleccionarMunicipio } = useAuth();
  const [municipios, setMunicipios] = useState([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [schemasAsociados, setSchemasAsociados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadMunicipiosConSchemas();
  }, []);

  const loadMunicipiosConSchemas = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/municipios', {
        params: { activo: true }
      });
      
      if (response.data.success) {
        // Filtrar solo municipios que tienen schemas asociados
        const municipiosConSchemas = response.data.data.filter(
          m => m.total_schemas > 0
        );
        setMunicipios(municipiosConSchemas);
      }
    } catch (error) {
      console.error('Error cargando municipios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMunicipioChange = async (municipioId) => {
    try {
      setLoadingSchemas(true);
      const municipio = municipios.find(m => m.id === municipioId);
      setSelectedMunicipio(municipio);

      // Cargar schemas asociados al municipio
      const response = await axios.get(`/api/municipios/${municipioId}`);
      if (response.data.success && response.data.data.schemas) {
        const schemasActivos = response.data.data.schemas.filter(s => s.activo);
        setSchemasAsociados(schemasActivos);
      }
    } catch (error) {
      console.error('Error cargando schemas:', error);
      setSchemasAsociados([]);
    } finally {
      setLoadingSchemas(false);
    }
  };

  const handleConfirm = () => {
    if (selectedMunicipio && schemasAsociados.length > 0) {
      // Si hay múltiples schemas, usar el primero (o se puede mejorar para seleccionar)
      const schemaSeleccionado = schemasAsociados[0].schema_name;
      
      // Guardar en el contexto de autenticación
      const municipioData = {
        municipio_id: selectedMunicipio.id,
        municipio_nombre: selectedMunicipio.nombre,
        municipio_codigo_dane: selectedMunicipio.codigo_dane,
        schema_name: schemaSeleccionado
      };
      
      seleccionarMunicipio(municipioData);

      // Redirigir al dashboard
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" tip="Cargando municipios..." />
      </div>
    );
  }

  if (municipios.length === 0) {
    return (
      <div style={{ padding: '50px' }}>
        <Card>
          <Empty
            description="No hay municipios con schemas asociados"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Text type="secondary">
              Contacta al administrador para asociar schemas a municipios.
            </Text>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: '600px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <EnvironmentOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
            <Title level={2}>Seleccionar Municipio</Title>
            <Text type="secondary">
              Selecciona el municipio con el que deseas trabajar
            </Text>
          </div>

          <Alert
            message="Municipios disponibles"
            description={`${municipios.length} municipio(s) con schemas asociados`}
            type="info"
            showIcon
          />

          <div>
            <Text strong>Municipio:</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="Selecciona un municipio"
              size="large"
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase()?.indexOf(input.toLowerCase()) >= 0
              }
              onChange={handleMunicipioChange}
              loading={loadingSchemas}
            >
              {municipios.map(municipio => (
                <Option key={municipio.id} value={municipio.id}>
                  <Space>
                    <EnvironmentOutlined />
                    <Text strong>{municipio.nombre}</Text>
                    <Text type="secondary">({municipio.departamento})</Text>
                    <Text code>{municipio.codigo_dane}</Text>
                    <Tag color="blue">{municipio.total_schemas} schema(s)</Tag>
                  </Space>
                </Option>
              ))}
            </Select>
          </div>

          {selectedMunicipio && (
            <Card size="small" style={{ background: '#f0f2f5' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">Municipio:</Text>
                  <div>
                    <Text strong>{selectedMunicipio.nombre}</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Código DANE:</Text>
                  <div>
                    <Text code>{selectedMunicipio.codigo_dane}</Text>
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          {loadingSchemas ? (
            <div style={{ textAlign: 'center' }}>
              <Spin tip="Cargando schemas..." />
            </div>
          ) : schemasAsociados.length > 0 ? (
            <div>
              <Text strong>Schema(s) disponible(s):</Text>
              <div style={{ marginTop: '8px' }}>
                {schemasAsociados.map((schema, index) => (
                  <Card 
                    key={schema.id} 
                    size="small" 
                    style={{ 
                      marginTop: index > 0 ? '8px' : 0,
                      background: index === 0 ? '#e6f7ff' : '#fff'
                    }}
                  >
                    <Space>
                      <DatabaseOutlined style={{ color: '#1890ff' }} />
                      <Text code strong={index === 0}>{schema.schema_name}</Text>
                      {index === 0 && (
                        <Tag color="blue" icon={<CheckCircleOutlined />}>
                          Se usará este schema
                        </Tag>
                      )}
                    </Space>
                    {schema.descripcion && (
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {schema.descripcion}
                        </Text>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : selectedMunicipio ? (
            <Alert
              message="Sin schemas"
              description="Este municipio no tiene schemas asociados activos"
              type="warning"
              showIcon
            />
          ) : null}

          <Button
            type="primary"
            size="large"
            block
            icon={<CheckCircleOutlined />}
            onClick={handleConfirm}
            disabled={!selectedMunicipio || schemasAsociados.length === 0}
          >
            Continuar con este Municipio
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default MunicipioSelector;

