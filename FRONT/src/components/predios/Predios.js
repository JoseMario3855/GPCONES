import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Row, 
  Col, 
  Statistic, 
  Input, 
  Select, 
  DatePicker, 
  Form,
  Tooltip,
  Badge,
  Avatar,
  Modal,
  Descriptions,
  Divider,
  message,
  Tabs
} from 'antd';
import { 
  HomeOutlined, 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import PredioForm from './PredioForm';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Predios = () => {
  const { user, canManagePredios, canApprovePredios, municipioSeleccionado } = useAuth();
  const navigate = useNavigate();
  const [predios, setPredios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [schemas, setSchemas] = useState([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [availableColumns, setAvailableColumns] = useState([]); // Columnas disponibles del schema
  const [totalPredios, setTotalPredios] = useState(0); // Total de predios disponibles
  const [stats, setStats] = useState({
    total: 0,
    porEstado: [],
    porMunicipio: [],
    areaTotal: 0,
    areaPromedio: 0
  });
  const [selectedPredio, setSelectedPredio] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [form] = Form.useForm();

  useEffect(() => {
    loadSchemas();
    loadPrediosStats();
    // Cargar predios después de un pequeño delay para asegurar que el municipio esté disponible
    const timer = setTimeout(() => {
      loadPredios();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Efecto para establecer el schema del municipio seleccionado automáticamente
  useEffect(() => {
    if (municipioSeleccionado && municipioSeleccionado.schema_name) {
      // Si hay municipio seleccionado, usar su schema automáticamente
      console.log('🏙️ Municipio seleccionado detectado:', municipioSeleccionado);
      setSelectedSchema(municipioSeleccionado.schema_name);
    } else {
      // Si no hay municipio seleccionado, limpiar el schema seleccionado
      setSelectedSchema(null);
    }
  }, [municipioSeleccionado]);

  useEffect(() => {
    // Cargar predios cuando cambia el schema (incluyendo cuando se limpia)
    console.log('📊 Schema cambió, cargando predios. Schema:', selectedSchema);
    loadPredios();
  }, [selectedSchema]);

  const loadSchemas = async () => {
    setLoadingSchemas(true);
    try {
      const response = await axios.get('/api/ili/schemas/all');
      if (response.data.success) {
        setSchemas(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando schemas:', error);
    } finally {
      setLoadingSchemas(false);
    }
  };

  const loadPredios = async (searchFilters = {}) => {
    try {
      setLoading(true);
      // Limpiar valores vacíos o undefined de los filtros
      const cleanFilters = Object.keys(searchFilters).reduce((acc, key) => {
        const value = searchFilters[key];
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const params = {
        page: 1,
        limit: 1000, // Aumentar límite para traer más predios
        sort_by: selectedSchema ? 't_id' : 'created_at',
        sort_order: 'DESC',
        ...cleanFilters
      };

      // Si hay un schema seleccionado, agregarlo a los parámetros
      if (selectedSchema) {
        params.schema_name = selectedSchema;
      }

      console.log('📡 Parámetros enviados al backend:', params);
      console.log('📡 Schema seleccionado:', selectedSchema);
      console.log('📡 Municipio seleccionado:', municipioSeleccionado);
      console.log('📡 Filtros limpios:', cleanFilters);
      
      const response = await axios.get('/api/predios', { params });

      if (response.data.success) {
        const prediosData = response.data.data.predios || [];
        const total = response.data.data.pagination?.total || response.data.data.total || prediosData.length;
        
        console.log(`✅ Predios cargados: ${prediosData.length} de ${total} totales`);
        console.log(`📊 Datos recibidos:`, prediosData.length > 0 ? 'Sí' : 'No');
        if (prediosData.length > 0) {
          console.log(`📋 Primer predio:`, Object.keys(prediosData[0]).slice(0, 10).join(', '));
        }
        
        setPredios(prediosData);
        setTotalPredios(total);
        
        // Guardar columnas disponibles si vienen del backend
        if (response.data.data.available_columns) {
          setAvailableColumns(response.data.data.available_columns);
        } else if (response.data.data.columns) {
          setAvailableColumns(response.data.data.columns);
        }
        
        // Mostrar mensaje informativo solo si hay datos
        if (prediosData.length > 0) {
          if (selectedSchema) {
            message.success({
              content: `✅ ${prediosData.length} predio(s) cargado(s) desde ${selectedSchema} (Total: ${total})`,
              duration: 3
            });
          } else {
            message.success({
              content: `✅ ${prediosData.length} predio(s) cargado(s) (Total: ${total})`,
              duration: 2
            });
          }
        } else {
          message.info({
            content: `No se encontraron predios${selectedSchema ? ` en el schema ${selectedSchema}` : ''}`,
            duration: 3
          });
        }
      }
    } catch (error) {
      console.error('Error cargando predios:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error desconocido';
      message.error(`Error cargando la lista de predios: ${errorMessage}`);
      
      // Si hay un schema seleccionado y falla, limpiar la selección
      if (selectedSchema && error.response?.status === 404) {
        setSelectedSchema(null);
        message.warning('Schema no encontrado o sin tabla de predios. Mostrando predios del sistema.');
        // Intentar cargar predios del sistema
        setTimeout(() => loadPredios(), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPrediosStats = async () => {
    try {
      const response = await axios.get('/api/predios/stats');
      if (response.data.success) {
        const statsData = response.data.data;
        setStats({
          total: statsData.general.total,
          porEstado: [
            { estado: 'Borrador', cantidad: statsData.general.borrador },
            { estado: 'En Revisión', cantidad: statsData.general.en_revision },
            { estado: 'Aprobado', cantidad: statsData.general.aprobado },
            { estado: 'Rechazado', cantidad: statsData.general.rechazado }
          ],
          porMunicipio: statsData.byMunicipio,
          areaTotal: statsData.general.area_total,
          areaPromedio: statsData.general.area_promedio
        });
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleFilter = (values) => {
    console.log('🔍 Filtros aplicados:', values);
    setFilters(values);
    loadPredios(values);
  };

  const handleViewDetails = (predio) => {
    setSelectedPredio(predio);
    setDetailModalVisible(true);
  };

  const handleEditPredio = (predio) => {
    navigate(`/predios/${predio.id}/editar`);
  };

  const handleDeletePredio = async (predioId) => {
    try {
      // TODO: Implementar endpoint real de eliminación
      message.success('Predio eliminado exitosamente');
      loadPredios();
      loadPrediosStats();
    } catch (error) {
      console.error('Error eliminando predio:', error);
      message.error('Error eliminando el predio');
    }
  };

  const handleExport = async (format) => {
    try {
      const exportUrl = format === 'CSV' 
        ? '/api/predios/export/csv' 
        : '/api/predios/export/geojson';
      
      // Agregar filtros actuales a la URL de exportación
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });
      
      const url = `${exportUrl}?${params.toString()}`;
      
      // Crear enlace temporal para descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `predios.${format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success(`Exportando predios en formato ${format}...`);
    } catch (error) {
      console.error('Error exportando predios:', error);
      message.error('Error en la exportación');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Borrador': 'default',
      'En Revisión': 'processing',
      'Aprobado': 'success',
      'Rechazado': 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Borrador': <ClockCircleOutlined />,
      'En Revisión': <ExclamationCircleOutlined />,
      'Aprobado': <CheckCircleOutlined />,
      'Rechazado': <CloseCircleOutlined />
    };
    return icons[status] || <ClockCircleOutlined />;
  };

  // Función para generar columnas dinámicas basadas en los datos disponibles
  const getDynamicColumns = () => {
    // Plantillas de renderizado para columnas conocidas
    const columnTemplates = {
      't_id': {
        title: 't_id',
        width: 100,
        render: (val) => <Text code>{val || '-'}</Text>
      },
      't_ili_tid': {
        title: 't_ili_tid',
        width: 200,
        render: (val) => <Text code style={{ fontSize: '11px' }}>{val ? val.substring(0, 20) + '...' : '-'}</Text>
      },
      'numero_predial': {
        title: 'Número Predial',
        render: (val) => <Text strong style={{ fontFamily: 'monospace' }}>{val || '-'}</Text>
      },
      'matricula_inmobiliaria': {
        title: 'Matrícula Inmobiliaria',
        render: (val) => <Text>{val || '-'}</Text>
      },
      'codigo_orip': {
        title: 'Código ORIP',
        render: (val) => <Text>{val || '-'}</Text>
      },
      'codigo_homologado': {
        title: 'Código Homologado',
        render: (val) => <Text code>{val || '-'}</Text>
      },
      'departamento': {
        title: 'Departamento',
        render: (val) => <Tag color="blue">{val || '-'}</Tag>
      },
      'municipio': {
        title: 'Municipio',
        render: (val) => <Text strong>{val || '-'}</Text>
      },
      'id_operacion': {
        title: 'ID Operación',
        render: (val) => <Text code>{val || '-'}</Text>
      },
      'avaluo_catastral': {
        title: 'Avaluo Catastral',
        render: (val) => {
          if (!val) return <Text>-</Text>;
          const numVal = typeof val === 'number' ? val : parseFloat(val);
          if (isNaN(numVal)) return <Text>-</Text>;
          return <Text strong>${numVal.toLocaleString('es-CO')}</Text>;
        }
      },
      'tipo': {
        title: 'Tipo',
        render: (val) => <Tag color="blue">{val || '-'}</Tag>
      },
      'condicion_predio': {
        title: 'Condición Predio',
        render: (val) => <Tag color="orange">{val || '-'}</Tag>
      },
      'destinacion_economica': {
        title: 'Destinación Económica',
        render: (val) => <Tag color="green">{val || '-'}</Tag>
      },
      'n_ficha': {
        title: 'Número Ficha',
        render: (val) => <Text>{val || '-'}</Text>
      },
      'nombre': {
        title: 'Nombre',
        render: (val) => <Text>{val || '-'}</Text>
      },
      'local_id': {
        title: 'Local ID',
        render: (val) => <Text code>{val || '-'}</Text>
      },
      'espacio_de_nombres': {
        title: 'Espacio de Nombres',
        render: (val) => <Text type="secondary" style={{ fontSize: '11px' }}>{val || '-'}</Text>
      },
      'comienzo_vida_util_version': {
        title: 'Inicio Vida Útil',
        render: (val) => <Text type="secondary">{val || '-'}</Text>
      },
      'fin_vida_util_version': {
        title: 'Fin Vida Útil',
        render: (val) => <Text type="secondary">{val || '-'}</Text>
      }
    };

    // Obtener todas las columnas disponibles
    const allColumns = availableColumns.length > 0 
      ? availableColumns 
      : (predios.length > 0 ? Object.keys(predios[0]) : []);

    // Generar columnas dinámicamente para TODAS las columnas disponibles
    const dynamicColumns = allColumns.map(columnName => {
      const template = columnTemplates[columnName];
      
      if (template) {
        // Usar plantilla personalizada si existe
        return {
          title: template.title,
          dataIndex: columnName,
          key: columnName,
          width: template.width,
          render: template.render
        };
      } else {
        // Crear columna genérica para columnas sin plantilla
        return {
          title: columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          dataIndex: columnName,
          key: columnName,
          render: (val) => {
            if (val === null || val === undefined) return <Text type="secondary">-</Text>;
            if (typeof val === 'boolean') return <Tag color={val ? 'green' : 'red'}>{val ? 'Sí' : 'No'}</Tag>;
            if (typeof val === 'number') return <Text>{val.toLocaleString('es-CO')}</Text>;
            if (typeof val === 'object') return <Text code style={{ fontSize: '11px' }}>{JSON.stringify(val).substring(0, 50)}...</Text>;
            return <Text>{String(val)}</Text>;
          }
        };
      }
    });

    return dynamicColumns;
  };

  // Columnas estándar para predios del sistema
  const columns = [
      {
        title: 'NPN',
        dataIndex: 'npn',
        key: 'npn',
        render: (npn) => (
          <Text strong style={{ fontFamily: 'monospace' }}>
            {npn}
          </Text>
        )
      },
    {
      title: 'Ubicación',
      key: 'ubicacion',
      render: (_, record) => (
        <div>
          <Text strong>{record.municipio}</Text>
          {record.zona && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.zona}
              </Text>
            </>
          )}
          {record.sector && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.sector}
              </Text>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Área (ha)',
      dataIndex: 'area_hectareas',
      key: 'area_hectareas',
      render: (area) => {
        if (area === null || area === undefined) return <Text strong>-</Text>;
        const numArea = typeof area === 'number' ? area : parseFloat(area);
        if (isNaN(numArea)) return <Text strong>-</Text>;
        return <Text strong>{numArea.toFixed(2)}</Text>;
      }
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo_predio',
      key: 'tipo_predio',
      render: (tipo) => (
        <Tag color="blue">{tipo || '-'}</Tag>
      )
    },
    {
      title: 'Uso',
      dataIndex: 'uso_predio',
      key: 'uso_predio',
      render: (uso) => (
        <Tag color="green">{uso || '-'}</Tag>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag color={getStatusColor(estado)} icon={getStatusIcon(estado)}>
          {estado}
        </Tag>
      )
    },
    {
      title: 'Propietario',
      key: 'propietario',
      render: (_, record) => (
        <div>
          <Text strong>{record.propietario_nombre || '-'}</Text>
          {record.propietario_documento && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.propietario_tipo_documento}: {record.propietario_documento}
              </Text>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Creado Por',
      key: 'created_by',
      render: (_, record) => (
        <div>
          <Tag color="blue">@{record.created_by_username || record.created_by}</Tag>
          {record.created_by_name && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.created_by_name}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (createdAt) => (
        <Text type="secondary">
          {moment(createdAt).format('DD/MM/YYYY')}
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
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          
          {canManagePredios && (
            <Tooltip title="Editar predio">
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                size="small"
                onClick={() => handleEditPredio(record)}
              />
            </Tooltip>
          )}
          
          {canManagePredios && record.estado === 'Borrador' && (
            <Tooltip title="Eliminar predio">
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                size="small"
                danger
                onClick={() => handleDeletePredio(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#2E8B57' }}>
          <HomeOutlined style={{ marginRight: '12px' }} />
          Gestión Catastral
        </Title>
        <Text type="secondary">
          Administra y consulta los predios del sistema GPCONES.
        </Text>
      </div>

      {/* Tabs de Navegación */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'list',
            label: 'Lista de Predios',
            icon: <HomeOutlined />,
            children: renderPrediosList()
          },
          {
            key: 'create',
            label: 'Registrar Predio',
            icon: <PlusOutlined />,
            children: <PredioForm onSuccess={() => {
              setActiveTab('list');
              loadPredios();
              loadPrediosStats();
            }} />
          }
        ]}
      />
    </div>
  );

  function renderPrediosList() {
    return (
      <div>

      {/* Estadísticas */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total de Predios"
              value={stats.total}
              prefix={<HomeOutlined style={{ color: '#2E8B57' }} />}
              valueStyle={{ color: '#2E8B57' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Área Total (ha)"
              value={stats.areaTotal}
              precision={2}
              prefix={<GlobalOutlined style={{ color: '#32CD32' }} />}
              valueStyle={{ color: '#32CD32' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Área Promedio (ha)"
              value={stats.areaPromedio}
              precision={2}
              prefix={<CheckCircleOutlined style={{ color: '#FFD700' }} />}
              valueStyle={{ color: '#FFD700' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Municipios"
              value={stats.porMunicipio?.length || 0}
              prefix={<EnvironmentOutlined style={{ color: '#1E90FF' }} />}
              valueStyle={{ color: '#1E90FF' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Información del Municipio Seleccionado o Selector de Schema */}
      {municipioSeleccionado ? (
        <Card 
          title={
            <Space>
              <EnvironmentOutlined />
              Municipio de Trabajo
            </Space>
          }
          style={{ marginBottom: '24px' }}
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Space>
                  <Text strong>Municipio:</Text>
                  <Tag color="green" style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {municipioSeleccionado.municipio_nombre}
                  </Tag>
                </Space>
              </Col>
              <Col span={12}>
                <Space>
                  <Text strong>Código DANE:</Text>
                  <Text code>{municipioSeleccionado.municipio_codigo_dane}</Text>
                </Space>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Space>
                  <Text strong>Schema:</Text>
                  <Tag color="blue" icon={<DatabaseOutlined />} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {municipioSeleccionado.schema_name}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    (Los predios se cargan automáticamente desde este schema)
                  </Text>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>
      ) : (
        <Card 
          title={
            <Space>
              <DatabaseOutlined />
              Origen de Datos
            </Space>
          }
          style={{ marginBottom: '24px' }}
          size="small"
        >
          <Space>
            <Text strong>Schema:</Text>
            <Select
              style={{ width: 300 }}
              placeholder="Selecciona un schema (opcional)"
              value={selectedSchema}
              onChange={(value) => {
                setSelectedSchema(value || null);
                loadPredios();
              }}
              allowClear
              loading={loadingSchemas}
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase()?.indexOf(input.toLowerCase()) >= 0
              }
            >
              <Option value={null}>
                <Text type="secondary">Predios del sistema (public.predios)</Text>
              </Option>
              <Option value="">Predios del sistema</Option>
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
            {selectedSchema && (
              <Tag color="blue">
                Consultando desde: {selectedSchema}
              </Tag>
            )}
          </Space>
        </Card>
      )}

      {/* Filtros */}
      <Card 
        title={
          <Space>
            <FilterOutlined />
            Filtros de Búsqueda
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Form
          form={form}
          layout="inline"
          onFinish={handleFilter}
          style={{ marginBottom: '16px' }}
        >
          <Form.Item name="search" label="Buscar">
            <Input 
              placeholder={selectedSchema 
                ? "Número predial, número de ficha, matrícula inmobiliaria..." 
                : "NPN, propietario, municipio..."} 
              prefix={<SearchOutlined />}
              style={{ width: selectedSchema ? 300 : 250 }}
              allowClear
            />
          </Form.Item>
          
          {/* Campos específicos para schemas XTF/ILI */}
          {selectedSchema && (
            <>
              <Form.Item name="numero_predial" label="Número Predial">
                <Input 
                  placeholder="Ej: 123456789" 
                  style={{ width: 180 }}
                  allowClear
                />
              </Form.Item>
              
              <Form.Item name="n_ficha" label="Número de Ficha">
                <Input 
                  placeholder="Ej: 001234" 
                  style={{ width: 180 }}
                  allowClear
                />
              </Form.Item>
            </>
          )}
          
          <Form.Item name="estado" label="Estado">
            <Select 
              placeholder="Todos los estados" 
              style={{ width: 150 }}
              allowClear
            >
              <Option value="Borrador">Borrador</Option>
              <Option value="En Revisión">En Revisión</Option>
              <Option value="Aprobado">Aprobado</Option>
              <Option value="Rechazado">Rechazado</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="municipio" label="Municipio">
            <Select 
              placeholder="Todos los municipios" 
              style={{ width: 150 }}
              allowClear
            >
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
          
          <Form.Item name="tipo_predio" label="Tipo">
            <Select 
              placeholder="Todos los tipos" 
              style={{ width: 120 }}
              allowClear
            >
              <Option value="URBANO">Urbano</Option>
              <Option value="RURAL">Rural</Option>
              <Option value="MIXTO">Mixto</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="uso_predio" label="Uso">
            <Select 
              placeholder="Todos los usos" 
              style={{ width: 120 }}
              allowClear
            >
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
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SearchOutlined />}
              >
                Filtrar
              </Button>
              <Button 
                onClick={() => {
                  console.log('🧹 Limpiando filtros...');
                  form.resetFields();
                  setFilters({});
                  setSelectedSchema(null); // No limpiar el schema, solo los filtros
                  loadPredios({});
                }}
                icon={<ReloadOutlined />}
              >
                Limpiar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Tabla de Predios */}
      <Card
        title="Lista de Predios"
        extra={
          <Space>
            {canManagePredios && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => navigate('/predios/nuevo')}
              >
                Nuevo Predio
              </Button>
            )}
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => handleExport('CSV')}
            >
              Exportar CSV
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => handleExport('GeoJSON')}
            >
              Exportar GeoJSON
            </Button>
          </Space>
        }
      >
        <Table
          columns={selectedSchema ? getDynamicColumns() : columns}
          dataSource={predios}
          rowKey={selectedSchema ? (record) => record.t_id || record.id : "id"}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['15', '30', '50', '100', '200'],
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} de ${totalPredios || total} predios${totalPredios > total ? ` (mostrando ${total} de ${totalPredios})` : ''}`
          }}
          locale={{
            emptyText: predios.length === 0 && !loading ? (
              <div style={{ padding: '40px' }}>
                <Text type="secondary">
                  {selectedSchema 
                    ? `No se encontraron predios en el schema "${selectedSchema}"`
                    : 'No se encontraron predios'}
                </Text>
              </div>
            ) : undefined
          }}
        />
      </Card>

      {/* Modal de Detalles */}
      <Modal
        title="Detalles del Predio"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedPredio && (
          <div>
            <Descriptions title="Información General" bordered column={2}>
              <Descriptions.Item label="NPN" span={1}>
                <Text strong style={{ fontFamily: 'monospace' }}>
                  {selectedPredio.npn}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Estado" span={1}>
                <Tag 
                  color={getStatusColor(selectedPredio.estado)} 
                  icon={getStatusIcon(selectedPredio.estado)}
                >
                  {selectedPredio.estado}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Municipio" span={1}>
                {selectedPredio.municipio}
              </Descriptions.Item>
              <Descriptions.Item label="Vereda" span={1}>
                {selectedPredio.vereda}
              </Descriptions.Item>
              <Descriptions.Item label="Área (ha)" span={1}>
                <Text strong>{selectedPredio.area_ha.toFixed(2)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Propietario" span={1}>
                {selectedPredio.propietario}
              </Descriptions.Item>
              <Descriptions.Item label="Creado Por" span={1}>
                <Tag color="blue">@{selectedPredio.created_by}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Creación" span={1}>
                {moment(selectedPredio.created_at).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Space>
                {canManagePredios && (
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={() => {
                      setDetailModalVisible(false);
                      handleEditPredio(selectedPredio);
                    }}
                  >
                    Editar Predio
                  </Button>
                )}
                <Button onClick={() => setDetailModalVisible(false)}>
                  Cerrar
                </Button>
              </Space>
            </div>
                     </div>
         )}
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
  }
 };

export default Predios;
