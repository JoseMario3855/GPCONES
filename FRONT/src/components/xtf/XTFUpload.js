import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Upload,
  Button,
  Select,
  Input,
  message,
  Progress,
  Steps,
  Alert,
  Descriptions,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Tag,
  List,
  Modal
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { Step } = Steps;

const XTFUpload = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResult, setValidationResult] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [schemas, setSchemas] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedModelType, setSelectedModelType] = useState('antioquia');

  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = async () => {
    try {
      const response = await axios.get('/api/xtf/schemas');
      if (response.data.success) {
        setSchemas(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando schemas:', error);
    }
  };

  const handleFileChange = (info) => {
    const { file, fileList } = info;
    
    // Cuando se selecciona un archivo (antes de cargar)
    if (file.status === 'uploading') {
      setLoading(true);
      setUploadProgress(0);
    } else if (file.status === 'done') {
      setLoading(false);
      setUploadProgress(100);
      setSelectedFile(file);
      message.success(`${file.name} cargado exitosamente`);
    } else if (file.status === 'error') {
      setLoading(false);
      message.error(`${file.name} falló al cargar`);
    } else {
      // Cuando el archivo se selecciona pero aún no se carga (status undefined o 'removed')
      // Establecer el archivo seleccionado para habilitar el botón de validación
      if (fileList.length > 0) {
        // Si hay un archivo en la lista, establecerlo como seleccionado
        const fileToSet = fileList[0];
        if (fileToSet.originFileObj) {
          setSelectedFile(fileToSet);
        } else {
          setSelectedFile(fileToSet);
        }
      } else {
        // Si no hay archivos, limpiar la selección
        setSelectedFile(null);
      }
    }
  };

  const handleValidation = async (values) => {
    try {
      setLoading(true);
      setCurrentStep(1);
      
      setSelectedModelType(values.model_type);

      const formData = new FormData();
      formData.append('xtf_file', selectedFile.originFileObj);
      formData.append('model_type', values.model_type);

      const response = await axios.post('/api/xtf/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setValidationResult(response.data.data);
        setCurrentStep(2);
        message.success('Validación completada exitosamente');
      } else {
        message.error('Error en la validación');
        setCurrentStep(0);
      }
    } catch (error) {
      console.error('Error en validación:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Error en la validación del archivo';
      message.error(errorMessage);
      
      // Mostrar detalles del error si están disponibles
      if (error.response?.data?.errors) {
        console.error('Errores de validación:', error.response.data.errors);
      }
      
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (values) => {
    try {
      setLoading(true);
      setCurrentStep(3);

      const formData = new FormData();
      formData.append('xtf_file', selectedFile.originFileObj);
      formData.append('model_type', selectedModelType);
      if (values.schema_name) {
        formData.append('schema_name', values.schema_name);
      }

      const response = await axios.post('/api/xtf/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setUploadResult(response.data.data);
        setCurrentStep(4);
        message.success('Archivo XTF cargado exitosamente');
        loadSchemas(); // Recargar lista de schemas
      } else {
        message.error('Error en la carga del archivo');
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Error en carga:', error);
      message.error('Error cargando el archivo XTF');
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setValidationResult(null);
    setUploadResult(null);
    setSelectedFile(null);
    setUploadProgress(0);
    form.resetFields();
  };

  const getStepStatus = (step) => {
    if (step < currentStep) return 'finish';
    if (step === currentStep) return 'process';
    return 'wait';
  };

  const renderValidationResults = () => {
    if (!validationResult) return null;

    return (
      <Card title="Resultados de Validación" style={{ marginTop: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Archivo">
                {validationResult.filename}
              </Descriptions.Item>
              <Descriptions.Item label="Modelo">
                {validationResult.model_type}
              </Descriptions.Item>
              <Descriptions.Item label="Total Entidades">
                {validationResult.total_entities}
              </Descriptions.Item>
              <Descriptions.Item label="Entidades Válidas">
                {validationResult.valid_entities}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Estado">
                <Tag color={validationResult.is_valid ? 'success' : 'error'}>
                  {validationResult.is_valid ? 'Válido' : 'Inválido'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Datasets">
                {validationResult.file_info?.datasets || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Tipos de Objeto">
                {validationResult.file_info?.object_types?.length || 0}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        {validationResult.warnings && validationResult.warnings.length > 0 && (
          <Alert
            message="Advertencias"
            description={
              <List
                size="small"
                dataSource={validationResult.warnings}
                renderItem={item => <List.Item>{item}</List.Item>}
              />
            }
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}

        {validationResult.errors && validationResult.errors.length > 0 && (
          <Alert
            message="Errores"
            description={
              <List
                size="small"
                dataSource={validationResult.errors}
                renderItem={item => <List.Item>{item}</List.Item>}
              />
            }
            type="error"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </Card>
    );
  };

  const renderUploadResults = () => {
    if (!uploadResult) return null;

    return (
      <Card title="Resultados de Carga" style={{ marginTop: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Archivo">
                {uploadResult.filename}
              </Descriptions.Item>
              <Descriptions.Item label="Schema">
                {uploadResult.schema_name}
              </Descriptions.Item>
              <Descriptions.Item label="Entidades Importadas">
                {uploadResult.entities_imported}
              </Descriptions.Item>
              <Descriptions.Item label="Tiempo de Procesamiento">
                {uploadResult.processing_time}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Tamaño del Archivo">
                {(uploadResult.file_size / 1024 / 1024).toFixed(2)} MB
              </Descriptions.Item>
              <Descriptions.Item label="Modelo">
                {uploadResult.model_type}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        {uploadResult.details && uploadResult.details.length > 0 && (
          <Alert
            message="Detalles del Procesamiento"
            description={
              <List
                size="small"
                dataSource={uploadResult.details}
                renderItem={item => <List.Item>{item}</List.Item>}
              />
            }
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}

        {uploadResult.integration && (
          <Alert
            message="Integración Automática Completada"
            description={
              <div>
                <p><strong>Datos integrados al schema principal:</strong></p>
                <List
                  size="small"
                  dataSource={[
                    `Predios: ${uploadResult.integration.predios?.imported || 0}`,
                    `Terrenos: ${uploadResult.integration.terrenos?.imported || 0}`,
                    `Construcciones: ${uploadResult.integration.construcciones?.imported || 0}`,
                    `Total: ${uploadResult.integration.total_imported || 0} entidades`
                  ]}
                  renderItem={item => <List.Item>{item}</List.Item>}
                />
                <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  Los datos XTF ahora están disponibles en la aplicación principal
                </p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <FileTextOutlined /> Carga de Archivos XTF
      </Title>
      
      <Text type="secondary">
        Cargue archivos XTF según los modelos ILI para importar datos catastrales al sistema.
      </Text>

      <Divider />

      <Steps current={currentStep} style={{ marginBottom: '32px' }}>
        <Step title="Seleccionar Archivo" status={getStepStatus(0)} />
        <Step title="Validar" status={getStepStatus(1)} />
        <Step title="Revisar" status={getStepStatus(2)} />
        <Step title="Cargar" status={getStepStatus(3)} />
        <Step title="Completado" status={getStepStatus(4)} />
      </Steps>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={currentStep === 0 ? handleValidation : handleUpload}
        >
          {currentStep === 0 && (
            <>
              <Form.Item
                name="xtf_file"
                label="Archivo XTF"
                rules={[{ required: true, message: 'Seleccione un archivo XTF' }]}
              >
                <Upload
                  name="xtf_file"
                  accept=".xtf,.xml"
                  maxCount={1}
                  onChange={handleFileChange}
                  beforeUpload={() => false}
                  fileList={selectedFile ? [selectedFile] : []}
                >
                  <Button icon={<UploadOutlined />}>
                    Seleccionar Archivo XTF
                  </Button>
                </Upload>
                {selectedFile && (
                  <div style={{ marginTop: '8px' }}>
                    <Text type="secondary">
                      <FileTextOutlined /> {selectedFile.name || selectedFile.originFileObj?.name}
                    </Text>
                  </div>
                )}
              </Form.Item>

              <Form.Item
                name="model_type"
                label="Modelo ILI"
                rules={[{ required: true, message: 'Seleccione un modelo ILI' }]}
                initialValue="antioquia"
              >
                <Select placeholder="Seleccione el modelo ILI">
                  <Option value="antioquia">LADM-COL Antioquia</Option>
                  <Option value="igac">LADM-COL IGAC</Option>
                  <Option value="ladm-col">LADM-COL Base</Option>
                  <Option value="modelo-interno">Modelo Interno Levantamiento Catastral V 1.0.1</Option>
                </Select>
              </Form.Item>
            </>
          )}

          {currentStep === 2 && validationResult && (
            <>
              <Form.Item
                name="schema_name"
                label="Nombre del Schema (Opcional)"
                help="Si no se especifica, se generará automáticamente"
              >
                <Input placeholder="ej: medellin_2024" />
              </Form.Item>

              <Alert
                message="Archivo Validado"
                description="El archivo XTF ha sido validado exitosamente contra el modelo ILI. Puede proceder con la carga."
                type="success"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            </>
          )}

          <Form.Item>
            <Space>
              {currentStep === 0 && (
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={!selectedFile || loading}
                >
                  Validar Archivo
                </Button>
              )}

              {currentStep === 2 && (
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={!validationResult?.is_valid}
                >
                  Cargar Archivo
                </Button>
              )}

              {currentStep > 0 && (
                <Button onClick={handleReset}>
                  Nuevo Archivo
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>

        {loading && (
          <Progress
            percent={uploadProgress}
            status={uploadProgress === 100 ? 'success' : 'active'}
            style={{ marginTop: '16px' }}
          />
        )}
      </Card>

      {renderValidationResults()}
      {renderUploadResults()}

      {/* Lista de Schemas Existentes */}
      {schemas.length > 0 && (
        <Card title="Schemas Existentes" style={{ marginTop: '24px' }}>
          <List
            dataSource={schemas}
            renderItem={schema => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={async () => {
                      try {
                        const response = await axios.get(`/api/xtf/schemas/${schema.schema_name}/stats`);
                        if (response.data.success) {
                          Modal.info({
                            title: `Estadísticas del Schema: ${schema.schema_name}`,
                            content: (
                              <div>
                                <p><strong>Total de tablas:</strong> {response.data.data.totals.total_tables}</p>
                                <p><strong>Total de registros:</strong> {response.data.data.totals.total_records}</p>
                                <p><strong>Tablas espaciales:</strong> {response.data.data.totals.total_spatial_tables}</p>
                              </div>
                            ),
                            width: 600
                          });
                        }
                      } catch (error) {
                        message.error('Error obteniendo estadísticas');
                      }
                    }}
                  >
                    Ver
                  </Button>,
                  <Button
                    type="link"
                    icon={<CheckCircleOutlined />}
                    onClick={async () => {
                      try {
                        const response = await axios.post(`/api/xtf/schemas/${schema.schema_name}/integrate`);
                        if (response.data.success) {
                          message.success('Schema integrado exitosamente');
                          loadSchemas();
                        }
                      } catch (error) {
                        message.error('Error integrando schema');
                      }
                    }}
                  >
                    Integrar
                  </Button>,
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: '¿Eliminar schema?',
                        content: `¿Está seguro de eliminar el schema ${schema.schema_name}? Esta acción no se puede deshacer.`,
                        onOk: async () => {
                          try {
                            await axios.delete(`/api/xtf/schemas/${schema.schema_name}`);
                            message.success('Schema eliminado exitosamente');
                            loadSchemas();
                          } catch (error) {
                            message.error('Error eliminando schema');
                          }
                        }
                      });
                    }}
                  >
                    Eliminar
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={schema.schema_name}
                  description={
                    <Space>
                      <Tag>{schema.total_tables} tablas</Tag>
                      <Tag>{schema.total_records} registros</Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default XTFUpload;