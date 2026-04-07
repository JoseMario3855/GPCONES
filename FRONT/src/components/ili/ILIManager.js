import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Steps, 
  Upload, 
  Form, 
  Input, 
  Button, 
  Select, 
  message, 
  Progress, 
  Table, 
  Tag, 
  Typography, 
  Divider,
  Alert,
  Space,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  UploadOutlined, 
  FileTextOutlined, 
  DatabaseOutlined, 
  CheckCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  FileZipOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;

const ILIManager = () => {
  const { user, canLoadXTF } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle');

  // Estados para el formulario del Paso 1 (ILI)
  const [iliForm] = Form.useForm();
  const [iliFile, setIliFile] = useState(null);
  const [iliFiles, setIliFiles] = useState([]); // Para múltiples archivos

  // Estados para el formulario del Paso 2 (XTF)
  const [xtfForm] = Form.useForm();
  const [xtfFile, setXtfFile] = useState(null);

  // Cargar schemas disponibles
  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = async () => {
    try {
      const response = await axios.get('/api/ili/schemas');
      if (response.data.success) {
        setSchemas(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando schemas:', error);
    }
  };

  // Verificar permisos
  if (!canLoadXTF()) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Acceso Denegado"
          description="Solo el Administrador del Sistema puede cargar archivos ILI y XTF."
          type="error"
          showIcon
        />
      </div>
    );
  }

  // Configuración de upload para archivos ILI (múltiples archivos)
  const iliUploadProps = {
    multiple: true, // Permitir selección múltiple
    beforeUpload: (file, fileList) => {
      const isValidType = file.type === 'text/plain' || file.name.endsWith('.ili') || file.name.endsWith('.zip');
      if (!isValidType) {
        message.error(`El archivo ${file.name} no es válido. Solo se permiten archivos .ili o .zip`);
        return false;
      }
      // Actualizar lista de archivos
      setIliFiles(fileList.filter(f => f.type === 'text/plain' || f.name.endsWith('.ili') || f.name.endsWith('.zip')));
      return false; // No subir automáticamente
    },
    fileList: iliFiles,
    onRemove: (file) => {
      const newFiles = iliFiles.filter(f => f.uid !== file.uid);
      setIliFiles(newFiles);
      if (newFiles.length === 0) {
        setIliFile(null);
      }
    }
  };

  // Configuración de upload para archivos XTF
  const xtfUploadProps = {
    beforeUpload: (file) => {
      const isValidType = file.type === 'text/xml' || file.name.endsWith('.xtf');
      if (!isValidType) {
        message.error('Solo se permiten archivos .xtf');
        return false;
      }
      setXtfFile(file);
      return false; // No subir automáticamente
    },
    fileList: xtfFile ? [xtfFile] : [],
    onRemove: () => setXtfFile(null)
  };

  // Manejar carga de archivos ILI (Paso 1) - Múltiples archivos
  const handleILIUpload = async (values) => {
    const filesToUpload = iliFiles.length > 0 ? iliFiles : (iliFile ? [iliFile] : []);
    
    if (filesToUpload.length === 0) {
      message.error('Debe seleccionar al menos un archivo ILI');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');

    try {
      const formData = new FormData();
      
      // Agregar todos los archivos ILI
      filesToUpload.forEach((file, index) => {
        const fileToAppend = file.originFileObj || file;
        formData.append('iliFiles', fileToAppend);
      });
      
      formData.append('municipio', values.municipio);
      formData.append('modelName', values.modelName);
      formData.append('fileCount', filesToUpload.length.toString());

      // Simular progreso de carga
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await axios.post('/api/ili/upload-ili-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('completed');

      if (response.data.success) {
        message.success(`${filesToUpload.length} archivo(s) ILI cargado(s) exitosamente`);
        setCurrentStep(1);
        loadSchemas(); // Recargar schemas
        iliForm.resetFields();
        setIliFile(null);
        setIliFiles([]);
      }
    } catch (error) {
      setUploadStatus('error');
      message.error(error.response?.data?.error || 'Error cargando archivo ILI');
    } finally {
      setLoading(false);
    }
  };

  // Manejar carga de archivo XTF (Paso 2)
  const handleXTFUpload = async (values) => {
    if (!xtfFile) {
      message.error('Debe seleccionar un archivo XTF');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('xtfFile', xtfFile);
      formData.append('schemaName', values.schemaName);
      formData.append('modelName', values.modelName);
      formData.append('datasetName', values.datasetName);

      // Simular progreso de carga
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);

      const response = await axios.post('/api/ili/upload-xtf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('completed');

      if (response.data.success) {
        message.success('Archivo XTF cargado exitosamente');
        xtfForm.resetFields();
        setXtfFile(null);
        setCurrentStep(0); // Volver al paso 1
      }
    } catch (error) {
      setUploadStatus('error');
      message.error(error.response?.data?.error || 'Error cargando archivo XTF');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Cargar Carpeta ILI',
      icon: <FileZipOutlined />,
      description: 'Crear schema en BD con nombre del municipio'
    },
    {
      title: 'Cargar Archivo XTF',
      icon: <FileTextOutlined />,
      description: 'Importar datos al schema creado'
    }
  ];

  const renderStep1 = () => (
    <Card title="Paso 1: Cargar Carpeta ILI" style={{ marginBottom: '24px' }}>
      <Alert
        message="Información del Proceso"
        description="En este paso se creará un schema en la base de datos con el nombre del municipio. Se crearán aproximadamente 193 tablas según el modelo ILI seleccionado."
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Form
        form={iliForm}
        layout="vertical"
        onFinish={handleILIUpload}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="municipio"
              label="Municipio"
              rules={[{ required: true, message: 'Ingrese el nombre del municipio' }]}
            >
              <Input placeholder="Ej: Medellín" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="modelName"
              label="Modelo ILI"
              rules={[{ required: true, message: 'Seleccione el modelo ILI' }]}
            >
              <Select placeholder="Seleccionar modelo">
                <Option value="LADM_COL_ExtAntioquia">LADM_COL_ExtAntioquia</Option>
                <Option value="LADM_COL_IGAC_1_0">LADM_COL_IGAC_1_0</Option>
                <Option value="LADM_COL_IGAC_2_0">LADM_COL_IGAC_2_0</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Archivos ILI"
          required
          help="Puede seleccionar múltiples archivos ILI de la carpeta del modelo"
        >
          <Upload {...iliUploadProps}>
            <Button icon={<UploadOutlined />}>Seleccionar archivos ILI (múltiples)</Button>
          </Upload>
          <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
            Formatos permitidos: .ili, .zip (máximo 100MB por archivo, hasta 20 archivos)
          </Text>
          {iliFiles.length > 0 && (
            <Alert
              message={`${iliFiles.length} archivo(s) seleccionado(s)`}
              description={
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {iliFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              }
              type="info"
              showIcon
              style={{ marginTop: '12px' }}
            />
          )}
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            disabled={iliFiles.length === 0 && !iliFile}
            icon={<DatabaseOutlined />}
          >
            Crear Schema desde ILI {iliFiles.length > 0 && `(${iliFiles.length} archivo(s))`}
          </Button>
        </Form.Item>
      </Form>

      {uploadStatus === 'uploading' && (
        <div style={{ marginTop: '16px' }}>
          <Progress percent={uploadProgress} status="active" />
          <Text type="secondary">Creando schema y tablas...</Text>
        </div>
      )}

      {uploadStatus === 'completed' && (
        <Alert
          message="Schema creado exitosamente"
          description="El schema ha sido creado con todas las tablas necesarias."
          type="success"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
    </Card>
  );

  const renderStep2 = () => (
    <Card title="Paso 2: Cargar Archivo XTF" style={{ marginBottom: '24px' }}>
      <Alert
        message="Información del Proceso"
        description="En este paso se importarán los datos del archivo XTF al schema creado en el paso anterior. Asegúrese de que el schema existe antes de continuar."
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Form
        form={xtfForm}
        layout="vertical"
        onFinish={handleXTFUpload}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="schemaName"
              label="Schema de Destino"
              rules={[{ required: true, message: 'Seleccione el schema' }]}
            >
              <Select 
                placeholder="Seleccionar schema"
                onChange={setSelectedSchema}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {schemas.map(schema => (
                  <Option key={schema.schema_name} value={schema.schema_name}>
                    {schema.schema_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="modelName"
              label="Modelo ILI"
              rules={[{ required: true, message: 'Seleccione el modelo ILI' }]}
            >
              <Select placeholder="Seleccionar modelo">
                <Option value="LADM_COL_ExtAntioquia">LADM_COL_ExtAntioquia</Option>
                <Option value="LADM_COL_IGAC_1_0">LADM_COL_IGAC_1_0</Option>
                <Option value="LADM_COL_IGAC_2_0">LADM_COL_IGAC_2_0</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="datasetName"
              label="Nombre del Dataset"
              rules={[{ required: true, message: 'Ingrese el nombre del dataset' }]}
            >
              <Input placeholder="Ej: lote_2025_01_15" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Archivo XTF"
          required
        >
          <Upload {...xtfUploadProps}>
            <Button icon={<UploadOutlined />}>Seleccionar archivo XTF</Button>
          </Upload>
          <Text type="secondary">
            Formato permitido: .xtf (máximo 100MB)
          </Text>
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            disabled={!xtfFile}
            icon={<FileTextOutlined />}
          >
            Importar Datos XTF
          </Button>
        </Form.Item>
      </Form>

      {uploadStatus === 'uploading' && (
        <div style={{ marginTop: '16px' }}>
          <Progress percent={uploadProgress} status="active" />
          <Text type="secondary">Importando datos al schema...</Text>
        </div>
      )}

      {uploadStatus === 'completed' && (
        <Alert
          message="Datos importados exitosamente"
          description="Los datos del archivo XTF han sido importados al schema seleccionado."
          type="success"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px', color: '#2E8B57' }}>
        <DatabaseOutlined style={{ marginRight: '12px' }} />
        Gestión ILI/XTF
      </Title>

      <Alert
        message="Proceso de Carga ILI/XTF"
        description="Este módulo permite cargar archivos ILI y XTF siguiendo los estándares IGAC y Antioquia. El proceso consta de dos pasos: primero cargar la carpeta ILI para crear el schema, luego cargar el archivo XTF para importar los datos."
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Steps current={currentStep} style={{ marginBottom: '32px' }}>
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            description={step.description}
            icon={step.icon}
          />
        ))}
      </Steps>

      {currentStep === 0 && renderStep1()}
      {currentStep === 1 && renderStep2()}

      <Card title="Schemas Disponibles" style={{ marginTop: '24px' }}>
        <Table
          dataSource={schemas}
          columns={[
            {
              title: 'Schema',
              dataIndex: 'schema_name',
              key: 'schema_name',
              render: (text) => <Tag color="blue">{text}</Tag>
            },
            {
              title: 'Propietario',
              dataIndex: 'schema_owner',
              key: 'schema_owner'
            },
            {
              title: 'Acciones',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button 
                    size="small" 
                    icon={<InfoCircleOutlined />}
                    onClick={() => setSelectedSchema(record.schema_name)}
                  >
                    Ver Stats
                  </Button>
                </Space>
              )
            }
          ]}
          pagination={false}
          size="small"
        />
      </Card>

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

export default ILIManager;
