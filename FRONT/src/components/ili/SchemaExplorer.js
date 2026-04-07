import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Table,
  Button,
  Space,
  Input,
  Typography,
  Tag,
  Descriptions,
  Modal,
  Row,
  Col,
  Statistic,
  Divider,
  message,
  Spin,
  Empty,
  Tooltip,
  Alert
} from 'antd';
import {
  DatabaseOutlined,
  TableOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const { Option } = Select;
const { Title, Text } = Typography;
const { Search } = Input;

const SchemaExplorer = () => {
  const { user } = useAuth();
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0
  });
  const [searchText, setSearchText] = useState('');
  const [columnsInfo, setColumnsInfo] = useState([]);

  useEffect(() => {
    loadSchemas();
  }, []);

  useEffect(() => {
    if (selectedSchema) {
      loadTables(selectedSchema);
    }
  }, [selectedSchema]);

  useEffect(() => {
    if (selectedSchema && selectedTable) {
      loadTableColumns(selectedSchema, selectedTable);
      loadTableData(selectedSchema, selectedTable, 1, pagination.pageSize);
    }
  }, [selectedSchema, selectedTable]);

  const loadSchemas = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/ili/schemas/all');
      if (response.data.success) {
        setSchemas(response.data.data);
        if (response.data.data.length > 0) {
          message.success(`${response.data.data.length} schemas encontrados`);
        } else {
          message.warning('No se encontraron schemas en la base de datos');
        }
      }
    } catch (error) {
      console.error('Error cargando schemas:', error);
      message.error(`Error cargando schemas: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (schemaName) => {
    setTablesLoading(true);
    try {
      const response = await axios.get(`/api/ili/schemas/${schemaName}/tables`);
      if (response.data.success) {
        setTables(response.data.data.tables);
        message.success(`${response.data.data.tables.length} tablas encontradas`);
      }
    } catch (error) {
      console.error('Error cargando tablas:', error);
      message.error('Error cargando tablas');
    } finally {
      setTablesLoading(false);
    }
  };

  const loadTableColumns = async (schemaName, tableName) => {
    try {
      const response = await axios.get(`/api/ili/schemas/${schemaName}/tables/${tableName}/columns`);
      if (response.data.success) {
        setColumnsInfo(response.data.data.columns);
        // Crear columnas para la tabla de datos
        const columns = response.data.data.columns.map(col => ({
          title: col.column_name,
          dataIndex: col.column_name,
          key: col.column_name,
          width: 150,
          ellipsis: true,
          render: (text) => {
            if (text === null || text === undefined) return <Text type="secondary">null</Text>;
            if (typeof text === 'object') return <Text code>{JSON.stringify(text)}</Text>;
            if (typeof text === 'string' && text.length > 50) {
              return (
                <Tooltip title={text}>
                  <Text>{text.substring(0, 50)}...</Text>
                </Tooltip>
              );
            }
            return <Text>{String(text)}</Text>;
          }
        }));
        setTableColumns(columns);
      }
    } catch (error) {
      console.error('Error cargando columnas:', error);
      message.error('Error cargando columnas de la tabla');
    }
  };

  const loadTableData = async (schemaName, tableName, page = 1, limit = 50, search = '') => {
    setDataLoading(true);
    try {
      const params = {
        page,
        limit,
        ...(search && { search })
      };
      const response = await axios.get(
        `/api/ili/schemas/${schemaName}/tables/${tableName}/data`,
        { params }
      );
      if (response.data.success) {
        setTableData(response.data.data.records);
        setPagination({
          current: response.data.data.pagination.page,
          pageSize: response.data.data.pagination.limit,
          total: response.data.data.pagination.total
        });
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      message.error('Error cargando datos de la tabla');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSchemaChange = (schemaName) => {
    setSelectedSchema(schemaName);
    setSelectedTable(null);
    setTableData([]);
    setTableColumns([]);
    setSearchText('');
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    setSearchText('');
  };

  const handleSearch = (value) => {
    setSearchText(value);
    loadTableData(selectedSchema, selectedTable, 1, pagination.pageSize, value);
  };

  const handleTableChange = (pagination) => {
    loadTableData(selectedSchema, selectedTable, pagination.current, pagination.pageSize, searchText);
  };

  const showTableInfo = (table) => {
    Modal.info({
      title: `Información de la tabla: ${table.table_name}`,
      width: 600,
      content: (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Tipo">{table.table_type}</Descriptions.Item>
          <Descriptions.Item label="Registros">{table.record_count?.toLocaleString() || 0}</Descriptions.Item>
          <Descriptions.Item label="Columnas geométricas">{table.geometry_columns || 0}</Descriptions.Item>
          <Descriptions.Item label="Tamaño">{table.table_size || 'N/A'}</Descriptions.Item>
        </Descriptions>
      )
    });
  };

  const showColumnsInfo = () => {
    if (!columnsInfo.length) return;
    
    Modal.info({
      title: `Columnas de la tabla: ${selectedTable}`,
      width: 700,
      content: (
        <Table
          dataSource={columnsInfo}
          columns={[
            {
              title: 'Columna',
              dataIndex: 'column_name',
              key: 'column_name'
            },
            {
              title: 'Tipo',
              dataIndex: 'data_type',
              key: 'data_type',
              render: (text, record) => (
                <Space>
                  <Text>{text}</Text>
                  {record.udt_name && record.udt_name !== text && (
                    <Tag color="blue">{record.udt_name}</Tag>
                  )}
                </Space>
              )
            },
            {
              title: 'Nulo',
              dataIndex: 'is_nullable',
              key: 'is_nullable',
              render: (text) => (
                <Tag color={text === 'YES' ? 'orange' : 'green'}>
                  {text === 'YES' ? 'Sí' : 'No'}
                </Tag>
              )
            },
            {
              title: 'Default',
              dataIndex: 'column_default',
              key: 'column_default',
              render: (text) => text || <Text type="secondary">-</Text>
            }
          ]}
          pagination={false}
          size="small"
          rowKey="column_name"
        />
      )
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>
          <DatabaseOutlined /> Explorador de Schemas
        </Title>
        <Text type="secondary">
          Consulta y explora los datos de los schemas creados desde archivos XTF
        </Text>
      </Card>

      <Card style={{ marginTop: '16px' }}>
        <Row gutter={16}>
          <Col span={24}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* Selector de Schema */}
              <div>
                <Text strong>Seleccionar Schema:</Text>
                <Select
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder={loading ? "Cargando schemas..." : "Selecciona un schema para explorar"}
                  value={selectedSchema}
                  onChange={handleSchemaChange}
                  loading={loading}
                  showSearch
                  notFoundContent={loading ? <Spin size="small" /> : <Empty description="No hay schemas disponibles" />}
                  filterOption={(input, option) =>
                    option?.children?.props?.children?.some?.(
                      child => typeof child === 'string' && child.toLowerCase().includes(input.toLowerCase())
                    ) || false
                  }
                >
                  {schemas.length === 0 && !loading ? (
                    <Option disabled value="no-schemas">
                      <Text type="secondary">No hay schemas disponibles</Text>
                    </Option>
                  ) : (
                    schemas.map(schema => (
                      <Option key={schema.schema_name} value={schema.schema_name}>
                        <Space>
                          <DatabaseOutlined />
                          <Text strong>{schema.schema_name}</Text>
                          <Text type="secondary">({schema.total_tables || 0} tablas)</Text>
                        </Space>
                      </Option>
                    ))
                  )}
                </Select>
                {schemas.length === 0 && !loading && (
                  <Alert
                    message="No hay schemas disponibles"
                    description="Crea un schema cargando archivos ILI/XTF desde el menú 'Gestión ILI/XTF'"
                    type="info"
                    showIcon
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>

              {/* Estadísticas del Schema */}
              {selectedSchema && (
                <Card size="small" title={`Schema: ${selectedSchema}`}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="Total de Tablas"
                        value={tables.length}
                        prefix={<TableOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Tablas con Datos"
                        value={tables.filter(t => t.record_count > 0).length}
                        prefix={<FileTextOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Total Registros"
                        value={tables.reduce((sum, t) => sum + (t.record_count || 0), 0)}
                        prefix={<DatabaseOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Lista de Tablas */}
      {selectedSchema && (
        <Card
          title={
            <Space>
              <TableOutlined />
              <Text strong>Tablas del Schema</Text>
            </Space>
          }
          style={{ marginTop: '16px' }}
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadTables(selectedSchema)}
              loading={tablesLoading}
            >
              Actualizar
            </Button>
          }
        >
          <Spin spinning={tablesLoading}>
            {tables.length === 0 ? (
              <Empty description="No hay tablas en este schema" />
            ) : (
              <Table
                dataSource={tables}
                columns={[
                  {
                    title: 'Tabla',
                    dataIndex: 'table_name',
                    key: 'table_name',
                    render: (text) => <Text strong>{text}</Text>
                  },
                  {
                    title: 'Registros',
                    dataIndex: 'record_count',
                    key: 'record_count',
                    render: (count) => (
                      <Tag color={count > 0 ? 'green' : 'default'}>
                        {count?.toLocaleString() || 0}
                      </Tag>
                    ),
                    sorter: (a, b) => (a.record_count || 0) - (b.record_count || 0)
                  },
                  {
                    title: 'Geometrías',
                    dataIndex: 'geometry_columns',
                    key: 'geometry_columns',
                    render: (count) => count > 0 ? <Tag color="blue">{count}</Tag> : '-'
                  },
                  {
                    title: 'Tamaño',
                    dataIndex: 'table_size',
                    key: 'table_size'
                  },
                  {
                    title: 'Acciones',
                    key: 'actions',
                    render: (_, record) => (
                      <Space>
                        <Button
                          size="small"
                          icon={<InfoCircleOutlined />}
                          onClick={() => showTableInfo(record)}
                        >
                          Info
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          icon={<EyeOutlined />}
                          onClick={() => handleTableSelect(record.table_name)}
                        >
                          Ver Datos
                        </Button>
                      </Space>
                    )
                  }
                ]}
                rowKey="table_name"
                pagination={{ pageSize: 20 }}
                size="small"
              />
            )}
          </Spin>
        </Card>
      )}

      {/* Datos de la Tabla Seleccionada */}
      {selectedSchema && selectedTable && (
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <Text strong>Datos: {selectedTable}</Text>
            </Space>
          }
          style={{ marginTop: '16px' }}
          extra={
            <Space>
              <Button
                icon={<InfoCircleOutlined />}
                onClick={showColumnsInfo}
              >
                Ver Columnas
              </Button>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  setSelectedTable(null);
                  setTableData([]);
                  setTableColumns([]);
                }}
              >
                Volver
              </Button>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* Búsqueda */}
            <Search
              placeholder="Buscar en la tabla..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  setSearchText('');
                  loadTableData(selectedSchema, selectedTable, 1, pagination.pageSize, '');
                }
              }}
            />

            {/* Tabla de Datos */}
            <Spin spinning={dataLoading}>
              <Table
                dataSource={tableData}
                columns={tableColumns}
                rowKey={(record, index) => `row-${index}`}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showTotal: (total) => `Total: ${total.toLocaleString()} registros`,
                  pageSizeOptions: ['20', '50', '100', '200']
                }}
                onChange={handleTableChange}
                scroll={{ x: 'max-content', y: 600 }}
                size="small"
              />
            </Spin>
          </Space>
        </Card>
      )}

      {/* Footer */}
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
};

export default SchemaExplorer;

