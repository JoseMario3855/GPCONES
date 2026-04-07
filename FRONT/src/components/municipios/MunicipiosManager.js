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
  Tooltip
} from 'antd';
import {
  DatabaseOutlined,
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  DisconnectOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const MunicipiosManager = () => {
  const [municipios, setMunicipios] = useState([]);
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
        setMunicipios(response.data.data);
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
      width: 150,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          onClick={() => openModal(record)}
          icon={<LinkOutlined />}
        >
          Gestionar Schemas
        </Button>
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
        <Row gutter={16} style={{ marginBottom: '16px' }}>
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
        </Row>

        <Table
          columns={columns}
          dataSource={municipios}
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
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Municipio"
                    value={selectedMunicipio.nombre}
                    prefix={<EnvironmentOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Código DANE"
                    value={selectedMunicipio.codigo_dane}
                    prefix={<Text code />}
                  />
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

