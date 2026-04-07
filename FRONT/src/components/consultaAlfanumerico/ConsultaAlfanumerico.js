import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Typography,
  Tag,
  Tabs,
  message,
  Spin,
  Row,
  Col,
  Divider,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  UserOutlined,
  HomeOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const ConsultaAlfanumerico = () => {
  const { municipioSeleccionado } = useAuth();
  const [loading, setLoading] = useState(false);
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [activeTab, setActiveTab] = useState('fichas');
  
  // Datos de cada pestaña
  const [fichas, setFichas] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [construcciones, setConstrucciones] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [construccionesGenerales, setConstruccionesGenerales] = useState([]);
  const [colindantes, setColindantes] = useState([]);
  const [cartografia, setCartografia] = useState([]);
  
  const consultarCalificaciones = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('/api/consulta-alfanumerico/calificaciones-construcciones', { params });
      
      if (response.data.success) {
        setCalificaciones(response.data.data);
        message.success(`${response.data.data.length} calificaciones encontradas`);
      }
    } catch (error) {
      console.error('Error consultando calificaciones:', error);
      throw error;
    }
  };

  const consultarConstruccionesGenerales = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('/api/consulta-alfanumerico/construcciones-generales', { params });
      
      if (response.data.success) {
        setConstruccionesGenerales(response.data.data);
        message.success(`${response.data.data.length} construcciones generales encontradas`);
      }
    } catch (error) {
      console.error('Error consultando construcciones generales:', error);
      throw error;
    }
  };

  const consultarColindantes = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('/api/consulta-alfanumerico/colindantes', { params });
      
      if (response.data.success) {
        setColindantes(response.data.data);
        message.success(`${response.data.data.length} colindantes encontrados`);
      }
    } catch (error) {
      console.error('Error consultando colindantes:', error);
      throw error;
    }
  };

  const consultarCartografia = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('/api/consulta-alfanumerico/cartografia', { params });
      
      if (response.data.success) {
        setCartografia(response.data.data);
        message.success(`${response.data.data.length} registros de cartografía encontrados`);
      }
    } catch (error) {
      console.error('Error consultando cartografía:', error);
      throw error;
    }
  };
  
  // Filtros
  const [filters, setFilters] = useState({
    nroFicha: '',
    npn: '',
    matriculaInmobiliaria: ''
  });

  useEffect(() => {
    loadSchemas();
  }, []);

  useEffect(() => {
    // Si hay municipio seleccionado, usar su schema automáticamente
    if (municipioSeleccionado && municipioSeleccionado.schema_name) {
      setSelectedSchema(municipioSeleccionado.schema_name);
    }
  }, [municipioSeleccionado]);

  const loadSchemas = async () => {
    try {
      const response = await axios.get('/api/ili/schemas/all');
      if (response.data.success) {
        setSchemas(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando schemas:', error);
    }
  };

  const handleConsultar = async () => {
    if (!selectedSchema) {
      message.warning('Por favor selecciona un schema');
      return;
    }

    setLoading(true);
    try {
      // Consultar según la pestaña activa
      switch (activeTab) {
        case 'fichas':
          await consultarFichas();
          break;
        case 'propietarios':
          await consultarPropietarios();
          break;
        case 'construcciones':
          await consultarConstrucciones();
          break;
        case 'calificaciones':
          await consultarCalificaciones();
          break;
        case 'construcciones-generales':
          await consultarConstruccionesGenerales();
          break;
        case 'colindantes':
          await consultarColindantes();
          break;
        case 'cartografia':
          await consultarCartografia();
          break;
        default:
          message.info('Consulta en desarrollo');
      }
    } catch (error) {
      console.error('Error en consulta:', error);
      message.error('Error ejecutando la consulta');
    } finally {
      setLoading(false);
    }
  };

  const consultarFichas = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...filters
      };
      
      // Limpiar filtros vacíos
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('/api/consulta-alfanumerico/fichas', { params });
      
      if (response.data.success) {
        setFichas(response.data.data);
        message.success(`${response.data.data.length} fichas encontradas`);
      }
    } catch (error) {
      console.error('Error consultando fichas:', error);
      throw error;
    }
  };

  const consultarPropietarios = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('/api/consulta-alfanumerico/propietarios', { params });
      
      if (response.data.success) {
        setPropietarios(response.data.data);
        message.success(`${response.data.data.length} propietarios encontrados`);
      }
    } catch (error) {
      console.error('Error consultando propietarios:', error);
      throw error;
    }
  };

  const consultarConstrucciones = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('/api/consulta-alfanumerico/construcciones', { params });
      
      if (response.data.success) {
        setConstrucciones(response.data.data);
        message.success(`${response.data.data.length} construcciones encontradas`);
      }
    } catch (error) {
      console.error('Error consultando construcciones:', error);
      throw error;
    }
  };

  // Generar columnas dinámicas basadas en los datos
  const getDynamicColumns = (data) => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      dataIndex: key,
      key: key,
      width: 150,
      ellipsis: true,
      render: (text) => {
        if (text === null || text === undefined || text === '') return <Text type="secondary">-</Text>;
        if (typeof text === 'boolean') return <Tag color={text ? 'green' : 'red'}>{text.toString()}</Tag>;
        if (typeof text === 'number') return <Text strong>{text.toLocaleString()}</Text>;
        return <Text>{String(text)}</Text>;
      }
    }));
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>
          <FileTextOutlined style={{ marginRight: '12px' }} />
          Consulta Alfanumérica
        </Title>
        <Text type="secondary">
          Consultas basadas en el modelo LADM-COL - Similar a CONSOLIDADO_YARUMAL
        </Text>
      </Card>

      {/* Selector de Schema */}
      <Card style={{ marginTop: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Text strong>Schema:</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="Selecciona un schema"
              value={selectedSchema}
              onChange={setSelectedSchema}
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase()?.indexOf(input.toLowerCase()) >= 0
              }
            >
              {schemas.map(schema => (
                <Option key={schema.schema_name} value={schema.schema_name}>
                  <Space>
                    <DatabaseOutlined />
                    <Text strong>{schema.schema_name}</Text>
                    <Text type="secondary">({schema.total_tables} tablas)</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          {municipioSeleccionado && (
            <Col span={8}>
              <Tag color="green" icon={<EnvironmentOutlined />}>
                Municipio: {municipioSeleccionado.municipio_nombre}
              </Tag>
            </Col>
          )}
          <Col span={8} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleConsultar}
              loading={loading}
              disabled={!selectedSchema}
            >
              Consultar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Filtros */}
      <Card style={{ marginTop: '24px' }} size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Text strong>Número de Ficha:</Text>
            <Input
              placeholder="Ej: 1027261"
              value={filters.nroFicha}
              onChange={(e) => setFilters({ ...filters, nroFicha: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          </Col>
          <Col span={8}>
            <Text strong>NPN:</Text>
            <Input
              placeholder="Ej: 0588701000015000100579"
              value={filters.npn}
              onChange={(e) => setFilters({ ...filters, npn: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          </Col>
          <Col span={8}>
            <Text strong>Matrícula Inmobiliaria:</Text>
            <Input
              placeholder="Ej: 58227"
              value={filters.matriculaInmobiliaria}
              onChange={(e) => setFilters({ ...filters, matriculaInmobiliaria: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Tabs con las diferentes consultas */}
      <Card style={{ marginTop: '24px' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'fichas',
              label: (
                <span>
                  <FileTextOutlined />
                  Fichas
                </span>
              ),
              children: (
                <Table
                  columns={getDynamicColumns(fichas)}
                  dataSource={fichas}
                  rowKey="t_id"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} fichas`
                  }}
                />
              )
            },
            {
              key: 'propietarios',
              label: (
                <span>
                  <UserOutlined />
                  Propietarios
                </span>
              ),
              children: (
                <Table
                  columns={getDynamicColumns(propietarios)}
                  dataSource={propietarios}
                  rowKey="d.t_id"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} propietarios`
                  }}
                />
              )
            },
            {
              key: 'construcciones',
              label: (
                <span>
                  <HomeOutlined />
                  Construcciones
                </span>
              ),
              children: (
                <Table
                  columns={getDynamicColumns(construcciones)}
                  dataSource={construcciones}
                  rowKey="t_id"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} construcciones`
                  }}
                />
              )
            },
            {
              key: 'calificaciones',
              label: (
                <span>
                  <FileTextOutlined />
                  Calificaciones
                </span>
              ),
              children: (
                <Table
                  columns={getDynamicColumns(calificaciones)}
                  dataSource={calificaciones}
                  rowKey="caracteristica"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} calificaciones`
                  }}
                />
              )
            },
            {
              key: 'construcciones-generales',
              label: (
                <span>
                  <FileTextOutlined />
                  Construcciones Generales
                </span>
              ),
              children: (
                <Table
                  columns={getDynamicColumns(construccionesGenerales)}
                  dataSource={construccionesGenerales}
                  rowKey="Secuencia"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} construcciones generales`
                  }}
                />
              )
            },
            {
              key: 'colindantes',
              label: (
                <span>
                  <EnvironmentOutlined />
                  Colindantes
                </span>
              ),
              children: (
                <Table
                  columns={getDynamicColumns(colindantes)}
                  dataSource={colindantes}
                  rowKey={(record, index) => `${record.NroFicha}-${index}`}
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} colindantes`
                  }}
                />
              )
            },
            {
              key: 'cartografia',
              label: (
                <span>
                  <FileTextOutlined />
                  Cartografía
                </span>
              ),
              children: (
                <Table
                  columns={getDynamicColumns(cartografia)}
                  dataSource={cartografia}
                  rowKey="NroFicha"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} registros`
                  }}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default ConsultaAlfanumerico;

