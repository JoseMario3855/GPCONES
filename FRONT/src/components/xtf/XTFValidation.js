import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Space, 
  Alert, 
  Table, 
  Tag, 
  Row, 
  Col, 
  Statistic,
  Select,
  Upload,
  message,
  Divider,
  Timeline,
  Collapse
} from 'antd';
import { 
  FileTextOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  UploadOutlined,
  SafetyCertificateOutlined,
  BugOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Dragger } = Upload;
const { Panel } = Collapse;

const getModelDisplayName = (model) => {
  switch (model) {
    case 'antioquia':
      return 'Antioquia 2.0';
    case 'igac':
      return 'IGAC LADM-COL';
    case 'modelo-interno':
      return 'Modelo Interno V 1.0.1';
    default:
      return model;
  }
};

const getModelTagColor = (model) => {
  switch (model) {
    case 'antioquia':
      return 'green';
    case 'igac':
      return 'blue';
    case 'modelo-interno':
      return 'purple';
    default:
      return 'default';
  }
};

const XTFValidation = () => {
  const { permissions } = useAuth();
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [selectedModel, setSelectedModel] = useState('antioquia');
  const [fileList, setFileList] = useState([]);

  // Verificar permisos
  if (!permissions.can_load_xtf) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
          <Title level={3} style={{ color: '#ff4d4f' }}>
            Acceso Denegado
          </Title>
          <Text type="secondary">
            No tienes permisos para validar archivos XTF en el sistema.
          </Text>
        </div>
      </Card>
      );
  }

  const handleValidation = async (file) => {
    setValidating(true);
    setValidationResult(null);

    try {
      // TODO: Implementar endpoint real de validación ILI
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simular resultado de validación
      setValidationResult({
        success: true,
        model: selectedModel,
        filename: file.name,
        timestamp: new Date().toISOString(),
        summary: {
          total_entities: 245,
          valid_entities: 238,
          warnings: 5,
          errors: 2
        },
        details: {
          errors: [
            {
              line: 156,
              element: 'BAUNIT',
              field: 'area',
              message: 'Valor de área fuera del rango permitido (0.01 - 10000 ha)',
              severity: 'error'
            },
            {
              line: 203,
              element: 'BUILDING',
              field: 'geometry',
              message: 'Geometría de construcción no válida - polígono degenerado',
              severity: 'error'
            }
          ],
          warnings: [
            {
              line: 89,
              element: 'PERSON',
              field: 'document_type',
              message: 'Tipo de documento no estándar - verificar formato',
              severity: 'warning'
            },
            {
              line: 134,
              element: 'TERRACE',
              field: 'area',
              message: 'Área de terraza mayor al 20% del terreno - verificar',
              severity: 'warning'
            },
            {
              line: 178,
              element: 'SERVITUDE',
              field: 'geometry',
              message: 'Geometría de servidumbre muy pequeña - verificar escala',
              severity: 'warning'
            },
            {
              line: 201,
              element: 'BUILDING',
              field: 'height',
              message: 'Altura de construcción no especificada',
              severity: 'warning'
            },
            {
              line: 245,
              element: 'BAUNIT',
              field: 'municipality',
              message: 'Municipio no encontrado en catálogo oficial',
              severity: 'warning'
            }
          ]
        }
      });

      message.success('Validación completada exitosamente');
      
      // Agregar archivo a la lista
      setFileList(prev => [...prev, {
        uid: Date.now(),
        name: file.name,
        model: selectedModel,
        status: 'validated',
        validationTime: new Date().toISOString()
      }]);

    } catch (error) {
      setValidationResult({
        success: false,
        message: 'Error durante la validación',
        error: error.message
      });
      message.error('Error durante la validación del archivo');
    } finally {
      setValidating(false);
    }
  };

  const uploadProps = {
    name: 'xtf_file',
    multiple: false,
    accept: '.xtf,.xml',
    beforeUpload: (file) => {
      const isValidType = file.type === 'text/xml' || file.name.endsWith('.xtf');
      if (!isValidType) {
        message.error('Solo se permiten archivos XTF (.xtf) o XML (.xml)');
        return false;
      }
      
      handleValidation(file);
      return false; // Prevenir carga automática
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error':
        return '#ff4d4f';
      case 'warning':
        return '#faad14';
      case 'info':
        return '#1890ff';
      default:
        return '#52c41a';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

  const columns = [
    {
      title: 'Línea',
      dataIndex: 'line',
      key: 'line',
      width: 80,
      render: (line) => <Text strong style={{ fontFamily: 'monospace' }}>{line}</Text>
    },
    {
      title: 'Elemento',
      dataIndex: 'element',
      key: 'element',
      width: 120,
      render: (element) => <Tag color="blue">{element}</Tag>
    },
    {
      title: 'Campo',
      dataIndex: 'field',
      key: 'field',
      width: 120,
      render: (field) => <Text code>{field}</Text>
    },
    {
      title: 'Mensaje',
      dataIndex: 'message',
      key: 'message',
      render: (message) => <Text>{message}</Text>
    },
    {
      title: 'Severidad',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => (
        <Tag color={getSeverityColor(severity)} icon={getSeverityIcon(severity)}>
          {severity.toUpperCase()}
        </Tag>
      )
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#2E8B57' }}>
          <SafetyCertificateOutlined style={{ marginRight: '12px' }} />
          Validación de Modelos ILI
        </Title>
        <Text type="secondary">
          Valida archivos XTF contra los modelos ILI de IGAC y extensión Antioquia antes de la importación.
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Panel de Validación */}
        <Col xs={24} lg={12}>
          <Card title="Validar Archivo XTF">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Text strong>Modelo de Validación:</Text>
                <br />
                <Select
                  value={selectedModel}
                  onChange={setSelectedModel}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  <Option value="antioquia">XTF Modelo Extendido Antioquia 2.0</Option>
                  <Option value="igac">XTF 1.0 IGAC (LADM-COL)</Option>
                  <Option value="modelo-interno">Modelo Interno Levantamiento Catastral V 1.0.1</Option>
                </Select>
              </div>

              <Dragger {...uploadProps} disabled={validating}>
                <p className="ant-upload-drag-icon">
                  <UploadOutlined style={{ fontSize: '48px', color: '#2E8B57' }} />
                </p>
                <p className="ant-upload-text">
                  Arrastra el archivo XTF para validar
                </p>
                <p className="ant-upload-hint">
                  Se validará contra el modelo {getModelDisplayName(selectedModel)}
                </p>
              </Dragger>

              {validating && (
                <div style={{ textAlign: 'center' }}>
                  <ReloadOutlined spin style={{ fontSize: '24px', color: '#2E8B57', marginBottom: '8px' }} />
                  <br />
                  <Text>Validando archivo contra modelo ILI...</Text>
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* Información del Modelo */}
        <Col xs={24} lg={12}>
          <Card title="Información del Modelo">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Text strong>Modelo Seleccionado:</Text>
                <br />
                <Tag color={getModelTagColor(selectedModel)} style={{ marginTop: '8px' }}>
                  {getModelDisplayName(selectedModel)}
                </Tag>
              </div>
              
              <div>
                <Text strong>Validaciones Incluidas:</Text>
                <br />
                <Text type="secondary">• Estructura XML y sintaxis</Text>
                <br />
                <Text type="secondary">• Conformidad con modelo ILI</Text>
                <br />
                <Text type="secondary">• Reglas de negocio catastral</Text>
                <br />
                <Text type="secondary">• Validación geométrica PostGIS</Text>
              </div>

              <div>
                <Text strong>Reglas de Validación:</Text>
                <br />
                <Text type="secondary">• NPN único y formato válido</Text>
                <br />
                <Text type="secondary">• Áreas dentro de rangos permitidos</Text>
                <br />
                <Text type="secondary">• Geometrías válidas y no degeneradas</Text>
                <br />
                <Text type="secondary">• Referencias cruzadas consistentes</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Resultado de la Validación */}
      {validationResult && (
        <Card 
          title="Resultado de la Validación" 
          style={{ marginTop: '24px' }}
        >
          <Alert
            message={`Validación completada - ${validationResult.success ? 'Archivo válido' : 'Archivo con errores'}`}
            type={validationResult.success ? 'success' : 'error'}
            showIcon
            style={{ marginBottom: '16px' }}
            description={`Modelo: ${getModelDisplayName(validationResult.model)} • Archivo: ${validationResult.filename}`}
          />

          {validationResult.success && (
            <>
              {/* Resumen de Estadísticas */}
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Total Entidades"
                    value={validationResult.summary.total_entities}
                    prefix={<FileTextOutlined style={{ color: '#2E8B57' }} />}
                    valueStyle={{ color: '#2E8B57' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Entidades Válidas"
                    value={validationResult.summary.valid_entities}
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Advertencias"
                    value={validationResult.summary.warnings}
                    prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Errores"
                    value={validationResult.summary.errors}
                    prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
              </Row>

              {/* Detalles de Errores y Advertencias */}
              <Collapse defaultActiveKey={['errors', 'warnings']} style={{ marginBottom: '16px' }}>
                {validationResult.details.errors.length > 0 && (
                  <Panel 
                    header={
                      <Space>
                        <BugOutlined style={{ color: '#ff4d4f' }} />
                        Errores de Validación ({validationResult.details.errors.length})
                      </Space>
                    } 
                    key="errors"
                  >
                    <Table
                      columns={columns}
                      dataSource={validationResult.details.errors}
                      rowKey={(record, index) => `error-${index}`}
                      pagination={false}
                      size="small"
                    />
                  </Panel>
                )}

                {validationResult.details.warnings.length > 0 && (
                  <Panel 
                    header={
                      <Space>
                        <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                        Advertencias ({validationResult.details.warnings.length})
                      </Space>
                    } 
                    key="warnings"
                  >
                    <Table
                      columns={columns}
                      dataSource={validationResult.details.warnings}
                      rowKey={(record, index) => `warning-${index}`}
                      pagination={false}
                      size="small"
                    />
                  </Panel>
                )}
              </Collapse>

              {/* Acciones Post-Validación */}
              <div style={{ textAlign: 'center' }}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<UploadOutlined />}
                    disabled={validationResult.summary.errors > 0}
                  >
                    Proceder con Importación
                  </Button>
                  <Button icon={<FileTextOutlined />}>
                    Exportar Reporte
                  </Button>
                  <Button icon={<ReloadOutlined />}>
                    Nueva Validación
                  </Button>
                </Space>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Historial de Validaciones */}
      {fileList.length > 0 && (
        <Card title="Historial de Validaciones" style={{ marginTop: '24px' }}>
          <Table
            dataSource={fileList}
            columns={[
              {
                title: 'Archivo',
                dataIndex: 'name',
                key: 'name',
                render: (name) => <Text strong>{name}</Text>
              },
              {
                title: 'Modelo',
                dataIndex: 'model',
                key: 'model',
                render: (model) => (
                  <Tag color={getModelTagColor(model)}>
                    {getModelDisplayName(model)}
                  </Tag>
                )
              },
              {
                title: 'Estado',
                dataIndex: 'status',
                key: 'status',
                render: (status) => (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Validado
                  </Tag>
                )
              },
              {
                title: 'Fecha',
                dataIndex: 'validationTime',
                key: 'validationTime',
                render: (time) => new Date(time).toLocaleString('es-ES')
              },
              {
                title: 'Acciones',
                key: 'actions',
                render: () => (
                  <Space>
                    <Button size="small" icon={<FileTextOutlined />}>
                      Ver Reporte
                    </Button>
                    <Button size="small" icon={<ReloadOutlined />}>
                      Revalidar
                    </Button>
                  </Space>
                )
              }
            ]}
            rowKey="uid"
            pagination={false}
            size="small"
          />
        </Card>
      )}

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
};

export default XTFValidation;
