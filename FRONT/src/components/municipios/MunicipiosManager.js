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
  Modal,
  Form,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Divider,
  Tooltip,
  Checkbox
} from 'antd';
import {
  DatabaseOutlined,
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  DisconnectOutlined,
  FileExcelOutlined,
  FileProtectOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const MunicipiosManager = () => {
  const [municipios, setMunicipios] = useState([]);
  const [soloConSchemas, setSoloConSchemas] = useState(false);
  const [departamentos, setDepartamentos] = useState([]);
  const [schemasDisponibles, setSchemasDisponibles] = useState([]);
  const [schemasAsociados, setSchemasAsociados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [form] = Form.useForm();
  const [formCrear] = Form.useForm();

  useEffect(() => {
    loadMunicipios();
    loadDepartamentos();
    loadSchemasDisponibles();
  }, []);

  const loadMunicipios = async (filters = {}) => {
    try {
      setLoading(true);
      const params = { ...filters };
      const response = await axios.get('/api/municipios', { params });
      
      if (response.data.success) {
        // Ordenar: primero los que tienen schemas asociados (total_schemas > 0)
        const sorted = [...response.data.data].sort((a, b) => {
          const countA = parseInt(a.total_schemas || 0, 10);
          const countB = parseInt(b.total_schemas || 0, 10);
          
          if (countA > 0 && countB === 0) return -1;
          if (countA === 0 && countB > 0) return 1;
          
          // Mantener orden alfabético secundario
          const deptCompare = (a.departamento || '').localeCompare(b.departamento || '');
          if (deptCompare !== 0) return deptCompare;
          return (a.nombre || '').localeCompare(b.nombre || '');
        });
        setMunicipios(sorted);
      }
    } catch (error) {
      console.error('Error cargando municipios:', error);
      message.error('Error cargando la lista de municipios');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartamentos = async () => {
    try {
      const response = await axios.get('/api/municipios/departamentos');
      if (response.data.success) {
        setDepartamentos(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando departamentos:', error);
    }
  };

  const loadSchemasDisponibles = async (municipioId = null) => {
    try {
      const params = municipioId ? { municipio_id: municipioId } : {};
      const response = await axios.get('/api/municipios/schemas-disponibles', { params });
      if (response.data.success) {
        setSchemasDisponibles(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando schemas:', error);
    }
  };

  const loadSchemasAsociados = async (municipioId) => {
    try {
      setLoadingSchemas(true);
      const response = await axios.get(`/api/municipios/${municipioId}`);
      if (response.data.success && response.data.data.schemas) {
        setSchemasAsociados(response.data.data.schemas || []);
      }
    } catch (error) {
      console.error('Error cargando schemas asociados:', error);
      setSchemasAsociados([]);
    } finally {
      setLoadingSchemas(false);
    }
  };

  const handleAsociarSchema = async (values) => {
    try {
      const response = await axios.post('/api/municipios/asociar-schema', {
        municipio_id: selectedMunicipio.id,
        schema_name: values.schema_name,
        descripcion: values.descripcion
      });

      if (response.data.success) {
        message.success('Schema asociado exitosamente');
        form.resetFields();
        loadMunicipios();
        await loadSchemasAsociados(selectedMunicipio.id);
        await loadSchemasDisponibles(selectedMunicipio.id);
      }
    } catch (error) {
      console.error('Error asociando schema:', error);
      message.error(error.response?.data?.message || 'Error asociando schema');
    }
  };

  const handleDesasociarSchema = async (asociacionId) => {
    try {
      const response = await axios.delete(`/api/municipios/desasociar-schema/${asociacionId}`);
      
      if (response.data.success) {
        message.success('Schema desasociado exitosamente');
        loadMunicipios();
        loadSchemasDisponibles();
      }
    } catch (error) {
      console.error('Error desasociando schema:', error);
      message.error('Error desasociando schema');
    }
  };

  const handleExportarConsolidado = async (municipio) => {
    try {
      message.loading({ content: 'Generando consolidado de Excel...', key: 'exportExcel', duration: 0 });
      const response = await axios.get(`/api/municipios/${municipio.id}/exportar-consolidado`, {
        responseType: 'blob'
      });

      // Crear enlace temporal para descargar
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = `consolidado_${municipio.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_')}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Limpieza
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success({ content: 'Consolidado exportado exitosamente', key: 'exportExcel' });
    } catch (error) {
      console.error('Error exportando consolidado:', error);
      
      // Tratar de decodificar el error si vino como blob
      if (error.response && error.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errData = JSON.parse(reader.result);
            message.error({ content: errData.message || 'Error exportando consolidado', key: 'exportExcel' });
          } catch (e) {
            message.error({ content: 'Error exportando consolidado', key: 'exportExcel' });
          }
        };
        reader.readAsText(error.response.data);
      } else {
        message.error({ content: error.response?.data?.message || 'Error exportando consolidado', key: 'exportExcel' });
      }
    }
  };

  const openModal = async (municipio) => {
    setSelectedMunicipio(municipio);
    setModalVisible(true);
    form.resetFields();
    await loadSchemasAsociados(municipio.id);
    await loadSchemasDisponibles(municipio.id);
  };

  const columns = [
    {
      title: 'Código DANE',
      dataIndex: 'codigo_dane',
      key: 'codigo_dane',
      width: 120,
      render: (codigo) => <Text code>{codigo}</Text>
    },
    {
      title: 'Municipio',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre, record) => (
        <div>
          <Text strong>{nombre}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.departamento}
          </Text>
        </div>
      )
    },
    {
      title: 'Schemas Asociados',
      key: 'schemas',
      render: (_, record) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {record.total_schemas > 0 ? (
            <>
              <Tag color="blue">{record.total_schemas} schema(s)</Tag>
              <Button
                type="link"
                size="small"
                onClick={() => openModal(record)}
                icon={<LinkOutlined />}
              >
                Ver/Agregar
              </Button>
            </>
          ) : (
            <>
              <Tag color="default">Sin schemas</Tag>
              <Button
                type="link"
                size="small"
                onClick={() => openModal(record)}
                icon={<PlusOutlined />}
              >
                Asociar Schema
              </Button>
            </>
          )}
        </Space>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            size="small"
            onClick={() => openModal(record)}
            icon={<LinkOutlined />}
          >
            Gestionar Schemas
          </Button>
          <Button
            type="default"
            size="small"
            style={{ borderColor: '#52c41a', color: '#52c41a' }}
            onClick={() => handleExportarConsolidado(record)}
            icon={<FileExcelOutlined />}
            disabled={parseInt(record.total_schemas) === 0}
          >
            Exportar Excel
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>
          <EnvironmentOutlined /> Gestión de Municipios y Schemas
        </Title>
        <Text type="secondary">
          Asocia schemas de base de datos (XTF/ILI) a municipios de Colombia
        </Text>
      </Card>

      <Card style={{ marginTop: '24px' }}>
        <Row gutter={16} style={{ marginBottom: '16px' }} align="middle">
          <Col span={8}>
            <Input
              placeholder="Buscar municipio o código DANE..."
              prefix={<SearchOutlined />}
              allowClear
              onChange={(e) => {
                if (e.target.value) {
                  loadMunicipios({ search: e.target.value });
                } else {
                  loadMunicipios();
                }
              }}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="Filtrar por departamento"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => {
                if (value) {
                  loadMunicipios({ departamento: value });
                } else {
                  loadMunicipios();
                }
              }}
            >
              {departamentos.map(dept => (
                <Option key={dept.codigo_departamento} value={dept.departamento}>
                  {dept.departamento}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8} style={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={soloConSchemas}
              onChange={(e) => setSoloConSchemas(e.target.checked)}
            >
              Mostrar solo con schemas asociados
            </Checkbox>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={soloConSchemas ? municipios.filter(m => parseInt(m.total_schemas || 0, 10) > 0) : municipios}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `${total} municipios`
          }}
        />
      </Card>

      {/* Modal para asociar schemas */}
      <Modal
        title={
          <Space>
            <DatabaseOutlined />
            <span>Gestionar Schemas - {selectedMunicipio?.nombre}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        {selectedMunicipio && (
          <>
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Statistic
                    title="Municipio"
                    value={selectedMunicipio.nombre}
                    prefix={<EnvironmentOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Código DANE"
                    value={selectedMunicipio.codigo_dane}
                    prefix={<Text code />}
                  />
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                    onClick={() => handleExportarConsolidado(selectedMunicipio)}
                    icon={<FileExcelOutlined />}
                    disabled={parseInt(selectedMunicipio.total_schemas) === 0}
                  >
                    Exportar Excel Consolidado
                  </Button>
                </Col>
              </Row>
            </Card>

            <Divider>Schemas Asociados</Divider>

            {loadingSchemas ? (
              <Text type="secondary">Cargando schemas asociados...</Text>
            ) : schemasAsociados && schemasAsociados.length > 0 ? (
              <Table
                dataSource={schemasAsociados}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Schema',
                    dataIndex: 'schema_name',
                    key: 'schema_name',
                    render: (name) => <Text code>{name}</Text>
                  },
                  {
                    title: 'Descripción',
                    dataIndex: 'descripcion',
                    key: 'descripcion',
                    render: (desc) => desc || <Text type="secondary">-</Text>
                  },
                  {
                    title: 'Estado',
                    dataIndex: 'activo',
                    key: 'activo',
                    render: (activo) => (
                      <Tag color={activo ? 'green' : 'red'}>
                        {activo ? 'Activo' : 'Inactivo'}
                      </Tag>
                    )
                  },
                  {
                    title: 'Acciones',
                    key: 'actions',
                    render: (_, record) => (
                      <Space size="middle">
                        <Button
                          type="link"
                          icon={<FileProtectOutlined />}
                          size="small"
                          onClick={async () => {
                            const hide = message.loading('Exportando base de datos a archivo XTF...', 0);
                            try {
                              const response = await axios({
                                url: '/api/xtf/export',
                                method: 'GET',
                                params: {
                                  schema: record.schema_name
                                },
                                responseType: 'blob',
                              });
                              
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `${record.schema_name}_export.xtf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                              message.success('Exportación de archivo XTF iniciada con éxito');
                            } catch (error) {
                              console.error('Error al exportar XTF:', error);
                              message.error('Error al exportar y descargar el archivo XTF.');
                            } finally {
                              hide();
                            }
                          }}
                        >
                          Exportar XTF
                        </Button>
                        <Popconfirm
                          title="¿Desasociar este schema?"
                          onConfirm={() => handleDesasociarSchema(record.id)}
                          okText="Sí"
                          cancelText="No"
                        >
                          <Button
                            type="link"
                            danger
                            size="small"
                            icon={<DisconnectOutlined />}
                          >
                            Desasociar
                          </Button>
                        </Popconfirm>
                      </Space>
                    )
                  }
                ]}
              />
            ) : (
              <Text type="secondary">No hay schemas asociados a este municipio</Text>
            )}

            <Divider>Asociar Nuevo Schema</Divider>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleAsociarSchema}
            >
              <Form.Item
                name="schema_name"
                label="Schema"
                rules={[{ required: true, message: 'Selecciona un schema' }]}
              >
                <Select
                  placeholder="Selecciona un schema disponible"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toLowerCase()?.indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {schemasDisponibles
                    .filter(s => !s.asociado)
                    .map(schema => (
                      <Option key={schema.schema_name} value={schema.schema_name}>
                        <Space>
                          <DatabaseOutlined />
                          <Text strong>{schema.schema_name}</Text>
                          <Text type="secondary">({schema.total_tables} tablas)</Text>
                        </Space>
                      </Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="descripcion"
                label="Descripción (opcional)"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Descripción del schema o notas adicionales"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<LinkOutlined />}>
                  Asociar Schema
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default MunicipiosManager;

