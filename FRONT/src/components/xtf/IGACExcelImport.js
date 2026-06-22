import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Upload,
  Button,
  Select,
  message,
  Progress,
  Alert,
  Descriptions,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Tag,
  List
} from 'antd';
import {
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { Title, Text } = Typography;

const IGACExcelImport = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [municipios, setMunicipios] = useState([]);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    loadMunicipios();
  }, []);

  const loadMunicipios = async () => {
    try {
      const response = await axios.get('/api/municipios?activo=true');
      if (response.data.success) {
        setMunicipios(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando municipios:', error);
      message.error('Error cargando la lista de municipios');
    }
  };

  const handleFileChange = (info) => {
    const { file, fileList } = info;
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
      if (fileList.length > 0) {
        setSelectedFile(fileList[0]);
      } else {
        setSelectedFile(null);
      }
    }
  };

  const handleImport = async (values) => {
    try {
      setLoading(true);
      setUploadProgress(20);
      
      const formData = new FormData();
      formData.append('excel_file', selectedFile.originFileObj || selectedFile);
      formData.append('municipio_id', values.municipio_id);

      // Simulate step-by-step progress during processing
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 1500);

      const response = await axios.post('/api/xtf/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.data.success) {
        setImportResult(response.data.data);
        message.success('Archivo Excel importado e integrado exitosamente');
      } else {
        message.error('Error en la importación');
      }
    } catch (error) {
      console.error('Error en importación:', error);
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error importando el archivo Excel';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImportResult(null);
    setSelectedFile(null);
    setUploadProgress(0);
    form.resetFields();
  };

  const renderResults = () => {
    if (!importResult) return null;

    return (
      <Card title="Resultados de la Importación" style={{ marginTop: '24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Archivo">
                {importResult.filename}
              </Descriptions.Item>
              <Descriptions.Item label="Esquema Creado">
                <Tag color="blue">{importResult.schema_name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Predios Planos Procesados">
                {importResult.entities_imported}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Estado">
                <Tag color="success">
                  <CheckCircleOutlined /> Importado y Procesado
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Integración Automática">
                <Tag color={importResult.integration?.success ? 'success' : 'warning'}>
                  {importResult.integration?.success ? 'Completada' : 'Pendiente'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        <Alert
          message="Integración de Datos Catastrales"
          description={
            <div>
              <p><strong>Registros cargados e integrados al sistema principal:</strong></p>
              <List
                size="small"
                bordered
                dataSource={[
                  `Predios Catastrales: ${importResult.integration?.predios || 0}`,
                  `Terrenos Físicos: ${importResult.integration?.terrenos || 0}`,
                  `Unidades de Construcción: ${importResult.integration?.construcciones || 0}`,
                  `Total Relaciones: ${(importResult.integration?.predios || 0) + (importResult.integration?.terrenos || 0) + (importResult.integration?.construcciones || 0)}`
                ]}
                renderItem={item => <List.Item><Text code>{item}</Text></List.Item>}
              />
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#555' }}>
                Los datos catastrales importados de las fichas IGAC ya se encuentran consolidados y están disponibles para la <strong>Consulta Alfanumérica</strong>, el <strong>Visor de Predios</strong>, y pueden exportarse de nuevo a archivos <strong>XTF</strong>.
              </p>
            </div>
          }
          type="success"
          showIcon
          style={{ marginTop: '20px' }}
        />

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <Button type="primary" onClick={handleReset}>
            Importar Nuevo Archivo
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <FileExcelOutlined style={{ color: '#2E8B57' }} /> Importar Excel IGAC (R1/R2)
      </Title>
      
      <Text type="secondary">
        Suba archivos consolidados de Excel en formato IGAC R1 (Titulares/Avalúos) y R2 (Física/Construcción). El sistema estructurará la información en el modelo relacional catastral LADM-COL.
      </Text>

      <Divider />

      <Card style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleImport}
        >
          {!importResult && (
            <>
              <Form.Item
                name="municipio_id"
                label="Municipio Asociado"
                rules={[{ required: true, message: 'Seleccione el municipio correspondiente' }]}
              >
                <Select placeholder="Seleccione el municipio para asociar los datos">
                  {municipios.map(m => (
                    <Option key={m.id} value={m.id}>
                      {m.nombre} - DANE {m.codigo_dane}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="excel_file"
                label="Archivo Excel IGAC (.xlsx, .xls)"
                rules={[{ required: true, message: 'Seleccione un archivo de Excel' }]}
              >
                <Upload
                  name="excel_file"
                  accept=".xlsx,.xls"
                  maxCount={1}
                  onChange={handleFileChange}
                  beforeUpload={() => false}
                  fileList={selectedFile ? [selectedFile] : []}
                >
                  <Button icon={<UploadOutlined />}>
                    Seleccionar Archivo Excel
                  </Button>
                </Upload>
                {selectedFile && (
                  <div style={{ marginTop: '8px' }}>
                    <Text type="secondary">
                      <FileExcelOutlined style={{ color: 'green' }} /> {selectedFile.name || selectedFile.originFileObj?.name}
                    </Text>
                  </div>
                )}
              </Form.Item>

              <Alert
                message="Procesamiento Catastral"
                description={
                  <span>
                    <InfoCircleOutlined /> El sistema creará dinámicamente un esquema catastral, inicializará el diccionario de datos catastrales LADM-COL y mapeará la información de copropiedades y unidades constructivas detalladas de manera automática.
                  </span>
                }
                type="info"
                showIcon
                style={{ marginBottom: '20px' }}
              />

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={!selectedFile || loading}
                  icon={<DatabaseOutlined />}
                  size="large"
                  style={{ background: 'linear-gradient(135deg, #2E8B57 0%, #1E90FF 100%)', border: 'none' }}
                >
                  Iniciar Importación y Mapeo LADM-COL
                </Button>
              </Form.Item>
            </>
          )}
        </Form>

        {loading && (
          <div style={{ marginTop: '20px' }}>
            <Text>Procesando y poblando las tablas del esquema catastral...</Text>
            <Progress
              percent={uploadProgress}
              status={uploadProgress === 100 ? 'success' : 'active'}
              strokeColor={{
                from: '#108ee9',
                to: '#87d068',
              }}
              style={{ marginTop: '8px' }}
            />
          </div>
        )}
      </Card>

      {renderResults()}
    </div>
  );
};

export default IGACExcelImport;
