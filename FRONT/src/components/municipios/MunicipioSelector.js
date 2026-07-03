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
  Tag,
  message
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
  const [noSchemasSystemWide, setNoSchemasSystemWide] = useState(false);
  const [availableDbSchemas, setAvailableDbSchemas] = useState([]);
  const [selectedSchemaName, setSelectedSchemaName] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMunicipiosConSchemas();
  }, []);

  useEffect(() => {
    if (noSchemasSystemWide) {
      loadDbSchemas();
    }
  }, [noSchemasSystemWide]);

  const loadMunicipiosConSchemas = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/municipios', {
        params: { activo: true }
      });
      
      if (response.data.success) {
        // Filtrar solo municipios que tienen schemas asociados
        const municipiosConSchemas = response.data.data.filter(
          m => parseInt(m.total_schemas, 10) > 0
        );

        if (municipiosConSchemas.length === 0) {
          setNoSchemasSystemWide(true);
          setMunicipios(response.data.data); // Mostrar todos los municipios activos
        } else {
          setNoSchemasSystemWide(false);
          setMunicipios(municipiosConSchemas);
        }
      }
    } catch (error) {
      console.error('Error cargando municipios:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDbSchemas = async () => {
    try {
      const response = await axios.get('/api/municipios/schemas-disponibles');
      if (response.data.success) {
        setAvailableDbSchemas(response.data.data || []);
      }
    } catch (error) {
      console.error('Error cargando schemas en Selector:', error);
    }
  };

  const handleMunicipioChange = async (municipioId) => {
    try {
      setLoadingSchemas(true);
      const municipio = municipios.find(m => m.id === municipioId);
      setSelectedMunicipio(municipio);

      if (noSchemasSystemWide) {
        setSchemasAsociados([]);
        setSelectedSchemaName('public'); // Default a 'public'
      } else {
        // Cargar schemas asociados al municipio
        const response = await axios.get(`/api/municipios/${municipioId}`);
        if (response.data.success && response.data.data.schemas) {
          const schemasActivos = response.data.data.schemas.filter(s => s.activo);
          setSchemasAsociados(schemasActivos);
        }
      }
    } catch (error) {
      console.error('Error cargando schemas:', error);
      setSchemasAsociados([]);
    } finally {
      setLoadingSchemas(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedMunicipio) {
      let schemaSeleccionado = null;

      if (noSchemasSystemWide) {
        schemaSeleccionado = selectedSchemaName || 'public';
        
        // Intentar registrar la asociación en el backend
        try {
          await axios.post('/api/municipios/asociar-schema', {
            municipio_id: selectedMunicipio.id,
            schema_name: schemaSeleccionado,
            descripcion: 'Asociación inicial automática desde selector'
          });
        } catch (e) {
          console.warn('No se pudo guardar la asociación en BD (tal vez ya existe o no es admin), procediendo localmente:', e.message);
        }
      } else {
        if (schemasAsociados.length > 0) {
          schemaSeleccionado = schemasAsociados[0].schema_name;
        }
      }

      if (schemaSeleccionado) {
        const municipioData = {
          municipio_id: selectedMunicipio.id,
          municipio_nombre: selectedMunicipio.nombre,
          municipio_codigo_dane: selectedMunicipio.codigo_dane,
          schema_name: schemaSeleccionado
        };
        
        seleccionarMunicipio(municipioData);

        // Redirigir al dashboard y refrescar contexto
        navigate('/');
        window.location.reload();
      } else {
        message.warning('Por favor seleccione un esquema para continuar');
      }
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

          {noSchemasSystemWide ? (
            <Alert
              message="Configuración Inicial de Municipio"
              description="No hay municipios con esquemas de base de datos asociados todavía. Seleccione cualquier municipio de la lista y elija 'public' (o un esquema existente) para habilitar el acceso e iniciar la importación de datos."
              type="warning"
              showIcon
            />
          ) : (
            <Alert
              message="Municipios disponibles"
              description={`${municipios.length} municipio(s) con schemas asociados`}
              type="info"
              showIcon
            />
          )}

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
                  {`${municipio.nombre} (${municipio.departamento}) - ${municipio.codigo_dane}`}
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

          {noSchemasSystemWide && selectedMunicipio ? (
            <div>
              <Text strong>Esquema de Base de Datos:</Text>
              <Select
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Seleccione un esquema"
                size="large"
                value={selectedSchemaName}
                onChange={(val) => setSelectedSchemaName(val)}
              >
                <Option value="public">public (Esquema por defecto/vacío)</Option>
                {availableDbSchemas.map(s => (
                  <Option key={s.schema_name} value={s.schema_name}>
                    {s.schema_name} ({s.total_tables} tablas)
                  </Option>
                ))}
              </Select>
            </div>
          ) : loadingSchemas ? (
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
            disabled={!selectedMunicipio || (noSchemasSystemWide ? !selectedSchemaName : schemasAsociados.length === 0)}
          >
            Continuar con este Municipio
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default MunicipioSelector;

