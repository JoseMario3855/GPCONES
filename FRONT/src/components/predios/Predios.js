import React, { useState, useEffect, useRef } from 'react';
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
  Tabs,
  Spin
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
  DatabaseOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import PredioForm from './PredioForm';
import PredioModal from './PredioModal';
import { mapPredio, mapPropietario, mapConstruccion, getOripName } from './predioMapper';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Predios = () => {
  const { user, canManagePredios, canApprovePredios, municipioSeleccionado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [predios, setPredios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [selectedSchema, setSelectedSchema] = useState(municipioSeleccionado?.schema_name || null);
  const selectedSchemaRef = useRef(selectedSchema);

  // Mantener la referencia actualizada con el schema seleccionado
  useEffect(() => {
    selectedSchemaRef.current = selectedSchema;
  }, [selectedSchema]);
  const [schemas, setSchemas] = useState([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [propietarios, setPropietarios] = useState([]);
  const [loadingPropietarios, setLoadingPropietarios] = useState(false);
  const [construcciones, setConstrucciones] = useState([]);
  const [loadingConstrucciones, setLoadingConstrucciones] = useState(false);
  const [calificaciones, setCalificaciones] = useState([]);
  const [loadingCalificaciones, setLoadingCalificaciones] = useState(false);
  const [typeOptions, setTypeOptions] = useState({ condiciones: [], destinaciones: [], tipos: [] });
  const [loadingOptions, setLoadingOptions] = useState(false);
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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingPredio, setEditingPredio] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [municipiosFilterList, setMunicipiosFilterList] = useState([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  useEffect(() => {
    loadSchemas();
    loadMunicipiosFilter();
  }, []);

  // Efecto para establecer el schema desde el URL o desde el municipio seleccionado automáticamente
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const schemaParam = queryParams.get('schema');
    
    if (schemaParam) {
      console.log('📡 Schema detectado desde URL:', schemaParam);
      setSelectedSchema(schemaParam);
    } else if (municipioSeleccionado && municipioSeleccionado.schema_name) {
      // Si hay municipio seleccionado, usar su schema automáticamente
      console.log('🏙️ Municipio seleccionado detectado:', municipioSeleccionado);
      setSelectedSchema(municipioSeleccionado.schema_name);
    } else {
      // Si no hay municipio seleccionado ni URL param, limpiar el schema seleccionado
      setSelectedSchema(null);
    }
  }, [municipioSeleccionado, location.search]);

  useEffect(() => {
    // Cargar predios cuando cambia el schema (incluyendo cuando se limpia)
    console.log('📊 Schema cambió, cargando predios. Schema:', selectedSchema);
    loadPredios();
    loadPrediosStats(selectedSchema);
    // Cargar opciones de los menús desplegables cuando hay un schema seleccionado
    if (selectedSchema) {
      loadTypeOptions(selectedSchema);
    } else {
      setTypeOptions({ condiciones: [], destinaciones: [], tipos: [], documentoTypes: [], derechoTypes: [], fuenteTypes: [], disponibilidadTypes: [], ucTipos: [], ucUsos: [], ucPlantas: [], ucTradicionales: [] });
    }
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

  const loadMunicipiosFilter = async () => {
    setLoadingMunicipios(true);
    try {
      const response = await axios.get('/api/municipios?activo=true');
      if (response.data.success) {
        const filtered = response.data.data.filter(m => parseInt(m.total_schemas, 10) > 0);
        setMunicipiosFilterList(filtered);
      }
    } catch (error) {
      console.error('Error cargando municipios para filtro:', error);
    } finally {
      setLoadingMunicipios(false);
    }
  };

  // Carga todas las opciones para los menús desplegables (selects) de los formularios de edición
  const loadTypeOptions = async (schema) => {
    if (!schema) return;
    setLoadingOptions(true);
    try {
      const response = await axios.get(`/api/predios/type-options?schema=${schema}`);
      if (response.data.success) {
        console.log('✅ Opciones de tipo cargadas desde la base de datos:', response.data.data);
        setTypeOptions(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando opciones de tipo:', error);
      // No mostrar error al usuario, sólo advertencia en consola
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadPredios = async (searchFilters = {}) => {
    const currentRequestSchema = selectedSchema;
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

      // Evitar condiciones de carrera: verificar que el schema de la petición sea el mismo que el activo actual
      if (currentRequestSchema !== selectedSchemaRef.current) {
        console.log(`🚫 Descartando respuesta de predios obsoleta para el schema "${currentRequestSchema}" (schema activo: "${selectedSchemaRef.current}")`);
        return;
      }

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

  const loadPrediosStats = async (schema) => {
    try {
      const params = {};
      if (schema) {
        params.schema_name = schema;
      }
      const response = await axios.get('/api/predios/stats', { params });
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
    console.log('🔍 Filtros de Formulario aplicados:', values);
    
    // Mapear los filtros de búsqueda unificados a los parámetros correspondientes
    const { search_type, search_value, ...otherFilters } = values;
    const mappedFilters = { ...otherFilters };
    
    if (search_value && search_value.trim() !== '') {
      const val = search_value.trim();
      if (search_type === 'npn') {
        mappedFilters.npn = val;
      } else if (search_type === 'ficha') {
        mappedFilters.n_ficha = val;
      } else if (search_type === 'matricula') {
        mappedFilters.matricula_inmobiliaria = val;
      } else if (search_type.startsWith('doc_')) {
        mappedFilters.propietario_documento = val;
        // Tipo de documento en mayúsculas (CC, NIT, CE, TI, RC, PASAPORTE)
        mappedFilters.propietario_tipo_documento = search_type.substring(4).toUpperCase();
      }
    }
    
    setFilters(mappedFilters);
    loadPredios(mappedFilters);
  };

  const reloadDetails = async (predioId, npn) => {
    if (!selectedSchema) return;
    
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

    // 2. Cargar propietarios
    setLoadingPropietarios(true);
    try {
      let ownersList = [];
      try {
        const response = await axios.get('/api/consulta-alfanumerico/propietarios', {
          params: { schema_name: selectedSchema, predio_id: predioId, npn: npn }
        });
        if (response.data.success && Array.isArray(response.data.data)) {
          ownersList = response.data.data;
        }
      } catch (err) {
        console.error('Error cargando propietarios desde consulta-alfanumerico:', err);
      }
      
      // Fallback a propietarios por predio_id si no se obtuvo nada
      if (ownersList.length === 0 && predioId) {
        try {
          const response = await axios.get('/api/propietarios', {
            params: { schema_name: selectedSchema, predio_id: predioId, limit: 100 }
          });
          if (response.data.success) {
            ownersList = response.data.data.propietarios || [];
          }
        } catch (err) {
          console.error('Error cargando propietarios fallback:', err);
        }
      }
      
      setPropietarios(ownersList.map(mapPropietario));
    } catch (error) {
      console.error('Error general cargando propietarios:', error);
    } finally {
      setLoadingPropietarios(false);
    }

    // 3. Cargar construcciones
    setLoadingConstrucciones(true);
    try {
      const response = await axios.get('/api/consulta-alfanumerico/construcciones', {
        params: { schema_name: selectedSchema, predio_id: predioId, npn: npn }
      });
      if (response.data.success && Array.isArray(response.data.data)) {
        setConstrucciones(response.data.data.map((c, index) => mapConstruccion(c, index)));
      }
    } catch (error) {
      console.error('Error cargando construcciones:', error);
    } finally {
      setLoadingConstrucciones(false);
    }

    // 4. Cargar calificaciones
    setLoadingCalificaciones(true);
    try {
      const response = await axios.get('/api/consulta-alfanumerico/calificaciones-detalle', {
        params: { schema_name: selectedSchema, predio_id: predioId, npn: npn }
      });
      if (response.data.success && Array.isArray(response.data.data)) {
        setCalificaciones(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando calificaciones:', error);
    } finally {
      setLoadingCalificaciones(false);
    }
  };

  const handleViewDetails = async (predio) => {
    const mappedPredio = mapPredio(predio);
    setSelectedPredio(mappedPredio);
    setDetailModalVisible(true);
    setPropietarios([]);
    setConstrucciones([]);
    setCalificaciones([]);
    
    const predioId = predio.t_id || predio.id;
    const npn = mappedPredio.npn;
    
    if (selectedSchema) {
      await reloadDetails(predioId, npn);
    }
  };

  const handleEditPredio = (predio) => {
    // Si hay schema LADM activo, abrir modal inline; si no, navegar al formulario
    if (selectedSchema) {
      handleOpenEditModal(predio);
    } else {
      const predioId = predio.id || predio.t_id;
      navigate(`/predios/${predioId}/editar`);
    }
  };

  const handleOpenEditModal = async (predio) => {
    setEditingPredio(predio);
    setEditModalVisible(true);
    
    // Set initial values
    editForm.setFieldsValue({
      numero_predial_nacional: predio.Npn || predio.npn || predio.numero_predial_nacional || '',
      matricula_inmobiliaria:  predio.matricula_inmobiliaria || '',
      espacio_de_nombres:      predio.NumeroFicha || predio.espacio_de_nombres || '',
      departamento:            predio.departamento || '',
      municipio:               predio.municipio || '',
      codigo_orip:             predio.codigo_orip || '',
      nombre:                  predio.nombre || '',
      condicion_predio:        predio.condicion_predio || undefined,
      tipo_predio:             predio.tipo || undefined,
      uso_predio:              predio.destinacion_economica || undefined
    });

    if (selectedSchema) {
      setLoadingOptions(true);
      try {
        const response = await axios.get('/api/predios/type-options', {
          params: { schema: selectedSchema }
        });
        if (response.data.success) {
          setTypeOptions(response.data.data);
        }
      } catch (err) {
        console.error('Error cargando opciones de tipo:', err);
        message.error('No se pudieron cargar las opciones para Condición, Tipo y Destino');
      } finally {
        setLoadingOptions(false);
      }
    }
  };

  const handleSaveEdit = async (values) => {
    if (!editingPredio || !selectedSchema) return;
    const predioId = editingPredio.t_id || editingPredio.id;
    if (!predioId || predioId === 'undefined') {
      message.error("ID del predio no válido o no definido");
      return;
    }
    try {
      setEditLoading(true);
      const payload = {
        numero_predial_nacional: values.numero_predial_nacional,
        matricula_inmobiliaria:  values.matricula_inmobiliaria === '' ? null : values.matricula_inmobiliaria,
        espacio_de_nombres:      values.espacio_de_nombres,
        departamento:            values.departamento,
        municipio:               values.municipio,
        codigo_orip:             values.codigo_orip,
        nombre:                  values.nombre,
        condicion_predio:        values.condicion_predio,
        tipo_predio:             values.tipo_predio,
        uso_predio:              values.uso_predio
      };
      const response = await axios.put(
        `/api/predios/${predioId}?schema=${selectedSchema}`,
        payload
      );
      if (response.data.success !== false) {
        message.success('Predio actualizado exitosamente');
        setEditModalVisible(false);
        setEditingPredio(null);
        loadPredios(filters);
      }
    } catch (error) {
      console.error('Error actualizando predio:', error);
      message.error(error.response?.data?.message || 'Error al actualizar el predio');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeletePredio = async (predioId, predio = null) => {
    if (!predioId || predioId === 'undefined') {
      message.error("ID del predio no válido o no definido");
      return;
    }
    const npn = predio?.Npn || predio?.npn || predioId;
    try {
      Modal.confirm({
        title: '¿Eliminar este predio?',
        content: (
          <div>
            <p>
              Se eliminará el predio{' '}
              <strong style={{ fontFamily: 'monospace' }}>{npn}</strong>{' '}
              y <strong>todos sus registros asociados</strong>:
            </p>
            <ul style={{ paddingLeft: 20, color: '#ff4d4f', marginBottom: 0 }}>
              <li>Derechos catastrales</li>
              <li>Propietarios / Interesados</li>
              <li>Fuentes administrativas</li>
              <li>Direcciones</li>
            </ul>
            <p style={{ marginTop: 8, color: '#ff4d4f', fontWeight: 'bold' }}>
              ⚠️ Esta acción es irreversible.
            </p>
          </div>
        ),
        okText: 'Sí, eliminar todo',
        okType: 'danger',
        cancelText: 'Cancelar',
        width: 420,
        onOk: async () => {
          try {
            setLoading(true);
            const schemaParam = selectedSchema ? `?schema=${selectedSchema}` : '';
            const response = await axios.delete(`/api/predios/${predioId}${schemaParam}`);
            const { deleted } = response.data;
            if (deleted) {
              message.success(
                `Predio eliminado. Cascada: ${deleted.derechos || 0} derecho(s), ` +
                `${deleted.interesados || 0} interesado(s), ` +
                `${deleted.fuentes || 0} fuente(s), ` +
                `${deleted.direcciones || 0} dirección(es), ` +
                `${deleted.uebaunit || 0} unidad(es) espacial(es)`,
                5
              );
            } else {
              message.success('Predio eliminado exitosamente');
            }
            // Cerrar modal de detalles si estaba abierto
            setDetailModalVisible(false);
            setSelectedPredio(null);
            loadPredios(filters);
            loadPrediosStats();
          } catch (error) {
            console.error('Error eliminando predio:', error);
            message.error(error.response?.data?.message || error.response?.data?.error || 'Error al eliminar el predio');
          } finally {
            setLoading(false);
          }
        }
      });
    } catch (error) {
      console.error('Error in handleDeletePredio:', error);
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
        width: 80,
        render: (val) => <Text code>{val || '-'}</Text>
      },
      // ── Columnas nuevas de la query actualizada ──────────────────────
      'NumeroFicha': {
        title: 'Número Ficha',
        render: (val) => <Text>{val || '-'}</Text>
      },
      'Npn': {
        title: 'NPN',
        render: (val) => <Text strong style={{ fontFamily: 'monospace' }}>{val || '-'}</Text>
      },
      'matricula_inmobiliaria': {
        title: 'Matrícula Inmobiliaria',
        render: (val) => <Text>{val || '-'}</Text>
      },
      'area_hectareas': {
        title: 'Área (ha)',
        render: (val) => {
          if (val === null || val === undefined || val === '') return <Text strong>-</Text>;
          const numArea = typeof val === 'number' ? val : parseFloat(val);
          if (isNaN(numArea)) return <Text strong>-</Text>;
          return <Text strong>{numArea.toFixed(4)}</Text>;
        }
      },
      'Condicion': {
        title: 'Condición',
        render: (val) => <Tag color="orange">{val || '-'}</Tag>
      },
      'Tipo': {
        title: 'Tipo',
        render: (val) => <Tag color="blue">{val || '-'}</Tag>
      },
      'DestinoEconomico': {
        title: 'Destino Económico',
        render: (val) => <Tag color="green">{val || '-'}</Tag>
      },
      'Direccion': {
        title: 'Dirección',
        render: (val) => <Text>{val || '-'}</Text>
      },
      // ── Columnas legacy (predios del sistema / otros schemas) ────────
      'numero_predial': {
        title: 'Número Predial',
        render: (val) => <Text strong style={{ fontFamily: 'monospace' }}>{val || '-'}</Text>
      },
      'codigo_orip': {
        title: 'Código ORIP',
        render: (val) => {
          if (!val) return <Text>-</Text>;
          const name = getOripName(val);
          return <Text>{val}{name ? ` (${name})` : ''}</Text>;
        }
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
      'avaluo_catastral': {
        title: 'Avalúo Catastral',
        render: (val) => {
          if (!val) return <Text>-</Text>;
          const numVal = typeof val === 'number' ? val : parseFloat(val);
          if (isNaN(numVal)) return <Text>-</Text>;
          return <Text strong>${numVal.toLocaleString('es-CO')}</Text>;
        }
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
      'espacio_de_nombres': {
        title: 'Espacio de Nombres',
        render: (val) => <Text type="secondary" style={{ fontSize: '11px' }}>{val || '-'}</Text>
      }
    };

    // Obtener todas las columnas disponibles
    const allColumns = availableColumns.length > 0 
      ? [...availableColumns, 'area_hectareas'] 
      : (predios.length > 0 ? [...Object.keys(predios[0]), 'area_hectareas'] : ['area_hectareas']);

    // Orden de columnas alineado con la query actualizada
    const requestedOrder = [
      'NumeroFicha',
      'Npn',
      'matricula_inmobiliaria',
      'area_hectareas',
      'Condicion',
      'Tipo',
      'DestinoEconomico',
      'Direccion'
    ];

    // Filtrar las columnas que existen en los datos y respetar el orden solicitado
    const orderedColumns = requestedOrder.filter(col => allColumns.includes(col));
    
    // Solo mostrar las columnas solicitadas
    const finalColumnOrder = [...orderedColumns];

    // Generar columnas dinámicamente
    const dynamicColumns = finalColumnOrder.map(columnName => {
      const template = columnTemplates[columnName] || columnTemplates[columnName.toLowerCase()];
      
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
            if (val === null || val === undefined || val === '') return <Text type="secondary">-</Text>;
            if (typeof val === 'boolean') return <Tag color={val ? 'green' : 'red'}>{val ? 'Sí' : 'No'}</Tag>;
            if (typeof val === 'number') return <Text>{val.toLocaleString('es-CO')}</Text>;
            if (typeof val === 'object') return <Text code style={{ fontSize: '11px' }}>{JSON.stringify(val).substring(0, 50)}...</Text>;
            return <Text>{String(val)}</Text>;
          }
        };
      }
    });

    // Agregar columna de acciones al final
    dynamicColumns.push({
      title: 'Acciones',
      key: 'actions',
      fixed: 'right',
      width: 120,
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
            <Tooltip title="Eliminar predio">
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                size="small"
                danger
                onClick={() => handleDeletePredio(record.t_id || record.id, record)}
              />
            </Tooltip>
          )}
        </Space>
      )
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
          
          {canManagePredios && (record.estado === 'Borrador' || selectedSchema) && (
            <Tooltip title="Eliminar predio">
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                size="small"
                danger
                onClick={() => handleDeletePredio(record.id || record.t_id, record)}
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
            children: <PredioForm schema={selectedSchema} onSuccess={() => {
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
          <Form.Item name="search_type" label="Buscar por" initialValue="npn">
            <Select style={{ width: 230 }}>
              <Option value="npn">NPN</Option>
              <Option value="ficha">Número de Ficha</Option>
              <Option value="matricula">Matrícula Inmobiliaria</Option>
              <Option value="doc_cc">Propietario: Cédula (CC)</Option>
              <Option value="doc_nit">Propietario: NIT</Option>
              <Option value="doc_ce">Propietario: Céd. Extranjería (CE)</Option>
              <Option value="doc_ti">Propietario: Tarjeta Identidad (TI)</Option>
              <Option value="doc_rc">Propietario: Registro Civil (RC)</Option>
              <Option value="doc_pasaporte">Propietario: Pasaporte</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="search_value" label="Valor">
            <Input 
              placeholder="Ej: Ingrese valor..." 
              style={{ width: 220 }}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Form.Item>
          
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
              style={{ width: 180 }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase()?.indexOf(input.toLowerCase()) >= 0
              }
              loading={loadingMunicipios}
            >
              {municipiosFilterList.map(m => (
                <Option key={m.id} value={m.nombre}>{m.nombre}</Option>
              ))}
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
                onClick={() => navigate(selectedSchema ? `/predios/nuevo?schema=${selectedSchema}` : '/predios/nuevo')}
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
      {detailModalVisible && selectedPredio && (
        <PredioModal
          predio={selectedPredio}
          propietarios={propietarios}
          construcciones={construcciones}
          calificaciones={calificaciones}
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedPredio(null);
          }}
          canManagePredios={canManagePredios}
          handleEditPredio={handleEditPredio}
          handleDeletePredio={handleDeletePredio}
          loadingPropietarios={loadingPropietarios}
          loadingConstrucciones={loadingConstrucciones}
          loadingCalificaciones={loadingCalificaciones}
          typeOptions={typeOptions}
          selectedSchema={selectedSchema}
          onRefresh={() => reloadDetails(selectedPredio.t_id || selectedPredio.id, selectedPredio.npn)}
          allPredios={predios}
        />
      )}

      {/* ── Modal de Edición Inline (predios LADM-COL) ── */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#2E8B57' }} />
            <span>
              Editar Predio —{' '}
              <Text code style={{ fontSize: 13 }}>
                {editingPredio?.Npn || editingPredio?.t_id}
              </Text>
            </span>
          </Space>
        }
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); setEditingPredio(null); }}
        footer={null}
        width={600}
        destroyOnClose
      >
        {editingPredio && (
          <Spin spinning={editLoading}>
            {/* Info de solo lectura */}
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="t_id" span={1}>
                <Text code>{editingPredio.t_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Condición" span={1}>
                <Tag color="orange">{editingPredio.Condicion || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tipo" span={1}>
                <Tag color="blue">{editingPredio.Tipo || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Destino Económico" span={1}>
                <Tag color="green">{editingPredio.DestinoEconomico || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Dirección" span={2}>
                <Text type="secondary">{editingPredio.Direccion || '-'}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0' }}>Campos editables</Divider>

            <Form
              form={editForm}
              layout="vertical"
              onFinish={handleSaveEdit}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="numero_predial_nacional"
                    label="NPN (Número Predial Nacional)"
                    rules={[
                      { required: true, message: 'El NPN es obligatorio' },
                      { pattern: /^[0-9]{30}$/, message: 'El NPN debe ser de exactamente 30 dígitos numéricos' }
                    ]}
                  >
                    <Input placeholder="Ej: 250010100000000170999000000000" maxLength={30} showCount />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="matricula_inmobiliaria"
                    label="Matrícula Inmobiliaria"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value && value !== 0) return Promise.resolve();
                          const num = parseInt(value, 10);
                          if (isNaN(num)) return Promise.reject('Debe ser un número entero');
                          if (num > 2147483647) return Promise.reject('Valor muy grande (máx 2,147,483,647)');
                          if (num < 0) return Promise.reject('Debe ser un número positivo');
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <Input
                      type="number"
                      placeholder="Ej: 12345"
                      style={{ width: '100%' }}
                      min={0}
                      max={2147483647}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="espacio_de_nombres"
                    label="Número de Ficha"
                  >
                    <Input placeholder="Ej: CO.ANT...." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="nombre"
                    label="Nombre / Descripción"
                  >
                    <Input placeholder="Ej: LOTE LA ESMERALDA" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="departamento"
                    label="Departamento"
                  >
                    <Input placeholder="Ej: ANTIOQUIA" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="municipio"
                    label="Municipio"
                  >
                    <Input placeholder="Ej: SOPETRAN" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="codigo_orip"
                    label="Círculo ORIP"
                  >
                    <Input placeholder="Ej: 001" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="condicion_predio"
                    label="Condición Predio"
                  >
                    <Select placeholder="Seleccionar" loading={loadingOptions} allowClear>
                      {typeOptions.condiciones.filter(opt => {
                        const code = (opt.ilicode || '').toLowerCase();
                        const name = (opt.dispname || '').toLowerCase();
                        return !code.includes('parque_cementerio') && !name.includes('parque cementerio');
                      }).map(opt => (
                        <Option key={opt.t_id} value={opt.t_id}>
                          {opt.dispname || opt.ilicode}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="tipo_predio"
                    label="Tipo Predio"
                  >
                    <Select placeholder="Seleccionar" loading={loadingOptions} allowClear>
                      {typeOptions.tipos.map(opt => (
                        <Option key={opt.t_id} value={opt.t_id}>
                          {opt.dispname || opt.ilicode}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="uso_predio"
                    label="Destino Económico"
                  >
                    <Select placeholder="Seleccionar" loading={loadingOptions} allowClear>
                      {typeOptions.destinaciones.map(opt => (
                        <Option key={opt.t_id} value={opt.t_id}>
                          {opt.dispname || opt.ilicode}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <Space>
                  <Button onClick={() => { setEditModalVisible(false); setEditingPredio(null); }}>
                    Cancelar
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={editLoading}
                  >
                    Guardar Cambios
                  </Button>
                </Space>
              </div>
            </Form>
          </Spin>
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
