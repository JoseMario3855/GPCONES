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
  Row,
  Col,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  UserOutlined,
  HomeOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import PredioModal from '../predios/PredioModal';
import { mapPredio, mapPropietario, mapConstruccion } from '../predios/predioMapper';

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
  const [calificacionesDetalle, setCalificacionesDetalle] = useState([]);
  const [construccionesGenerales, setConstruccionesGenerales] = useState([]);
  const [colindantes, setColindantes] = useState([]);
  const [cartografia, setCartografia] = useState([]);

  // Estados para visualizar detalles en PredioModal (parte geográfica)
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPredio, setSelectedPredio] = useState(null);
  const [propietariosDetalle, setPropietariosDetalle] = useState([]);
  const [loadingPropietarios, setLoadingPropietarios] = useState(false);
  const [construccionesDetalle, setConstruccionesDetalle] = useState([]);
  const [loadingConstrucciones, setLoadingConstrucciones] = useState(false);
  const [calificacionesDetalleModal, setCalificacionesDetalleModal] = useState([]);
  const [loadingCalificaciones, setLoadingCalificaciones] = useState(false);
  const [typeOptions, setTypeOptions] = useState({
    condiciones: [],
    destinaciones: [],
    tipos: [],
    documentoTypes: [],
    derechoTypes: [],
    fuenteTypes: [],
    disponibilidadTypes: [],
    ucTipos: [],
    ucUsos: [],
    ucPlantas: [],
    ucTradicionales: []
  });
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  const consultarCalificaciones = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...getFilterParams()
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

  const consultarCalificacionesDetalle = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...getFilterParams()
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('/api/consulta-alfanumerico/calificaciones-detalle', { params });
      
      if (response.data.success) {
        setCalificacionesDetalle(response.data.data);
        message.success(`${response.data.data.length} detalles de calificaciones encontrados`);
      }
    } catch (error) {
      console.error('Error consultando detalle de calificaciones:', error);
      throw error;
    }
  };

  const consultarConstruccionesGenerales = async () => {
    try {
      const params = {
        schema_name: selectedSchema,
        ...getFilterParams()
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
        ...getFilterParams()
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
        ...getFilterParams()
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
  
  // Filtros de búsqueda unificados
  const [searchType, setSearchType] = useState('ficha'); // 'npn', 'ficha', 'matricula', 'documento'
  const [searchValue, setSearchValue] = useState('');

  const getFilterParams = () => {
    const filterParams = {};
    if (searchValue && searchValue.trim() !== '') {
      const val = searchValue.trim();
      switch (searchType) {
        case 'ficha':
          filterParams.nroFicha = val;
          break;
        case 'npn':
          filterParams.npn = val;
          break;
        case 'matricula':
          filterParams.matriculaInmobiliaria = val;
          break;
        case 'documento':
          filterParams.documento = val;
          break;
        default:
          break;
      }
    }
    return filterParams;
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'ficha':
        return 'Ej: 1027261';
      case 'npn':
        return 'Ej: 0588701000015000100579';
      case 'matricula':
        return 'Ej: 58227';
      case 'documento':
        return 'Ej: 10452345 o 800192834 (NIT/Cédula)';
      default:
        return 'Buscar...';
    }
  };

  useEffect(() => {
    loadSchemas();
  }, []);

  useEffect(() => {
    // Si hay municipio seleccionado, usar su schema automáticamente
    if (municipioSeleccionado && municipioSeleccionado.schema_name) {
      setSelectedSchema(municipioSeleccionado.schema_name);
    }
  }, [municipioSeleccionado]);

  // Cargar typeOptions al cambiar de schema para que estén disponibles en el PredioModal
  const loadTypeOptions = async (schema) => {
    if (!schema) return;
    setLoadingOptions(true);
    try {
      const response = await axios.get(`/api/predios/type-options?schema=${schema}`);
      if (response.data.success) {
        setTypeOptions(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando opciones de tipo:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (selectedSchema) {
      loadTypeOptions(selectedSchema);
    } else {
      setTypeOptions({
        condiciones: [],
        destinaciones: [],
        tipos: [],
        documentoTypes: [],
        derechoTypes: [],
        fuenteTypes: [],
        disponibilidadTypes: [],
        ucTipos: [],
        ucUsos: [],
        ucPlantas: [],
        ucTradicionales: []
      });
    }
  }, [selectedSchema]);

  const handleViewDetails = async (record) => {
    const mappedPredio = mapPredio(record);
    setSelectedPredio(mappedPredio);
    setDetailModalVisible(true);
    
    const predioId = record.predio_t_id || record.t_id || record.id;
    const npn = mappedPredio.npn;
    
    if (predioId) {
      await reloadDetails(predioId, npn);
    }
  };

  const reloadDetails = async (predioId, npn) => {
    setLoadingPropietarios(true);
    setLoadingConstrucciones(true);
    setLoadingCalificaciones(true);
    
    try {
      // 1. Cargar ficha detallada desde el API de consulta alfanumérica
      try {
        const response = await axios.get('/api/consulta-alfanumerico/fichas', {
          params: { schema_name: selectedSchema, predio_id: predioId }
        });
        if (response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
          const detailedMapped = mapPredio(response.data.data[0]);
          setSelectedPredio(detailedMapped);
        }
      } catch (err) {
        console.error('Error cargando ficha detallada:', err);
      }

      const schemaParam = selectedSchema ? `?schema=${selectedSchema}` : '';
      
      // Propietarios
      const ownersResponse = await axios.get(`/api/predios/${predioId}/propietarios${schemaParam}`);
      if (ownersResponse.data.success) {
        setPropietariosDetalle(ownersResponse.data.data.map(mapPropietario));
      }
      
      // Construcciones
      const constResponse = await axios.get(`/api/predios/${predioId}/construcciones${schemaParam}`);
      if (constResponse.data.success) {
        setConstruccionesDetalle(constResponse.data.data.map((c, index) => mapConstruccion(c, index)));
      }
      
      // Calificaciones
      const calResponse = await axios.get(`/api/predios/calificaciones?predioId=${predioId}&schema=${selectedSchema || ''}`);
      if (calResponse.data.success) {
        setCalificacionesDetalleModal(calResponse.data.data);
      }
    } catch (error) {
      console.error('Error cargando detalles del predio:', error);
      message.error('Error al cargar la información detallada del predio');
    } finally {
      setLoadingPropietarios(false);
      setLoadingConstrucciones(false);
      setLoadingCalificaciones(false);
    }
  };

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
        case 'calificaciones-detalle':
          await consultarCalificacionesDetalle();
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
        ...getFilterParams()
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
        ...getFilterParams()
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
        ...getFilterParams()
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

  // Generar columnas dinámicas basadas en los datos, excluyendo campos de geometría/internos
  const getDynamicColumns = (data) => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    const excludedKeys = ['predio_t_id', 'geometry', 'construction_geometries', 'constructionGeometries', 'geometry_geojson'];
    
    const cols = Object.keys(firstRow)
      .filter(key => !excludedKeys.includes(key))
      .map(key => ({
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

    if (activeTab === 'fichas') {
      cols.push({
        title: 'Acciones',
        key: 'actions',
        fixed: 'right',
        width: 100,
        render: (_, record) => (
          <Space>
            <Tooltip title="Ver detalles y mapa">
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
          </Space>
        )
      });
    }

    return cols;
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
      <Card style={{ marginTop: '24px' }} size="small" title={<Text strong>Filtros de Búsqueda</Text>}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Buscar por:</Text>
            <Select
              style={{ width: '100%' }}
              value={searchType}
              onChange={(value) => {
                setSearchType(value);
                setSearchValue(''); // Limpiar valor al cambiar tipo
              }}
            >
              <Option value="ficha">Número de Ficha</Option>
              <Option value="npn">NPN (Predial Nacional)</Option>
              <Option value="matricula">Matrícula Inmobiliaria</Option>
              <Option value="documento">Documento de Propietario (NIT/Cédula)</Option>
            </Select>
          </Col>
          <Col xs={24} sm={16} md={18}>
            <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Valor de búsqueda:</Text>
            <Input.Search
              placeholder={getPlaceholder()}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={handleConsultar}
              enterButton="Buscar"
              loading={loading}
              allowClear
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
                  rowKey={(record) => record.predio_t_id || record.t_id || record.id || record.NroFicha}
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
              key: 'calificaciones-detalle',
              label: (
                <span>
                  <FileTextOutlined />
                  Detalle Calificaciones
                </span>
              ),
              children: (
                <Table
                  columns={getDynamicColumns(calificacionesDetalle)}
                  dataSource={calificacionesDetalle}
                  rowKey="caracteristica"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} registros`
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

      {/* Modal de Detalles y Mapa Geográfico */}
      {detailModalVisible && selectedPredio && (
        <PredioModal
          predio={selectedPredio}
          propietarios={propietariosDetalle}
          construcciones={construccionesDetalle}
          calificaciones={calificacionesDetalleModal}
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedPredio(null);
          }}
          canManagePredios={false}
          handleEditPredio={null}
          handleDeletePredio={null}
          loadingPropietarios={loadingPropietarios}
          loadingConstrucciones={loadingConstrucciones}
          loadingCalificaciones={loadingCalificaciones}
          typeOptions={typeOptions}
          selectedSchema={selectedSchema}
          onRefresh={() => reloadDetails(selectedPredio.t_id || selectedPredio.id, selectedPredio.npn)}
        />
      )}
    </div>
  );
};

export default ConsultaAlfanumerico;

