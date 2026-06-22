import React, { useState } from 'react';
import {
  Card,
  Upload,
  Button,
  message,
  Progress,
  Alert,
  Typography,
  Divider,
  Row,
  Col,
  Space,
  Steps
} from 'antd';
import {
  InboxOutlined,
  FileExcelOutlined,
  SwapOutlined,
  FileProtectOutlined,
  DownloadOutlined,
  LoadingOutlined,
  CheckCircleFilled
} from '@ant-design/icons';
import axios from 'axios';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;

const ExcelToXTFConverter = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [resultFileName, setResultFileName] = useState('');

  const handleUploadChange = (info) => {
    let newFileList = [...info.fileList];
    // Limitar a 1 archivo
    newFileList = newFileList.slice(-1);
    setFileList(newFileList);
  };

  const handleConvert = async () => {
    if (fileList.length === 0) {
      message.warning('Por favor, seleccione un archivo de Excel primero.');
      return;
    }

    const file = fileList[0];
    setLoading(true);
    setSuccess(false);
    setCurrentStep(0);
    setProgress(10);
    setProgressMessage('Subiendo archivo de Excel al servidor...');

    const formData = new FormData();
    formData.append('excel_file', file.originFileObj || file);

    // Simular el progreso en el cliente para dar una experiencia fluida
    let progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 35) {
          setProgressMessage('Inicializando esquema catastral LADM-COL temporal...');
          setCurrentStep(1);
          return prev + 5;
        } else if (prev < 65) {
          setProgressMessage('Leyendo R1 (Propietarios) y R2 (Construcciones)...');
          setCurrentStep(2);
          return prev + 4;
        } else if (prev < 90) {
          setProgressMessage('Ejecutando exportación XTF mediante ili2pg...');
          setCurrentStep(3);
          return prev + 3;
        } else {
          return prev;
        }
      });
    }, 800);

    try {
      const response = await axios.post('/api/xtf/excel-to-xtf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob', // Esperamos un archivo blob (XML/XTF)
      });

      clearInterval(progressTimer);
      setProgress(100);
      setProgressMessage('¡XTF generado exitosamente!');
      setCurrentStep(4);
      setSuccess(true);
      message.success('Archivo XTF generado correctamente.');

      // Obtener el nombre de archivo de la cabecera content-disposition
      const contentDisposition = response.headers['content-disposition'];
      let downloadName = 'igac_ladmcol_export.xtf';
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          downloadName = matches[1];
        }
      }
      setResultFileName(downloadName);

      // Crear URL de descarga y disparar el navegador
      const blob = new Blob([response.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      clearInterval(progressTimer);
      setLoading(false);
      setProgress(0);
      setCurrentStep(0);
      console.error('Error durante la conversión:', error);

      // Tratar de decodificar el error si vino como JSON a pesar de responseType blob
      if (error.response?.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errJson = JSON.parse(reader.result);
            message.error(errJson.message || 'Error convirtiendo archivo.');
          } catch {
            message.error('Error convirtiendo el archivo Excel a XTF.');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        message.error(error.response?.data?.message || 'Error interno del servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFileList([]);
    setProgress(0);
    setProgressMessage('');
    setCurrentStep(0);
    setSuccess(false);
    setResultFileName('');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #2E8B57 0%, #1E90FF 100%)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(46,139,87,0.2)'
            }}>
              <SwapOutlined style={{ fontSize: '32px', color: '#fff' }} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Conversor Excel a XTF (LADM-COL)</Title>
              <Text type="secondary">
                Herramienta ágil para transformar hojas consolidadas IGAC (R1 y R2) directamente a un archivo XML/XTF estandarizado.
              </Text>
            </div>
          </div>
          <Divider />
        </Col>

        {/* Panel principal */}
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              background: '#ffffff',
              minHeight: '400px'
            }}
          >
            {!success ? (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={4}>Subir Archivo Excel</Title>
                  <Paragraph type="secondary">
                    Seleccione o arrastre el archivo .xlsx o .xls consolidado que contiene las pestañas <strong>R1_Datos</strong> y <strong>R2_Datos</strong>.
                  </Paragraph>
                </div>

                <Dragger
                  name="excel_file"
                  multiple={false}
                  accept=".xlsx,.xls"
                  fileList={fileList}
                  onChange={handleUploadChange}
                  beforeUpload={() => false}
                  style={{
                    border: '2px dashed #1E90FF',
                    borderRadius: '12px',
                    background: '#f8f9fa',
                    padding: '24px 0'
                  }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: '#1E90FF', fontSize: '48px' }} />
                  </p>
                  <p className="ant-upload-text" style={{ fontWeight: 500 }}>
                    Haga clic o arrastre el archivo aquí para cargarlo
                  </p>
                  <p className="ant-upload-hint">
                    Formatos soportados: Excel (.xlsx, .xls) hasta 100MB
                  </p>
                </Dragger>

                {fileList.length > 0 && (
                  <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space>
                        <FileExcelOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                        <Text strong>{fileList[0].name}</Text>
                        <Text type="secondary">({(fileList[0].size / 1024 / 1024).toFixed(2)} MB)</Text>
                      </Space>
                      <Button type="link" danger onClick={handleReset}>Eliminar</Button>
                    </div>
                  </Card>
                )}

                {loading && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Text strong>{progressMessage}</Text>
                      <Text type="secondary">{progress}%</Text>
                    </div>
                    <Progress
                      percent={progress}
                      status="active"
                      strokeColor={{
                        from: '#2E8B57',
                        to: '#1E90FF',
                      }}
                      strokeWidth={10}
                    />
                  </div>
                )}

                <Button
                  type="primary"
                  size="large"
                  icon={loading ? <LoadingOutlined /> : <SwapOutlined />}
                  onClick={handleConvert}
                  disabled={fileList.length === 0 || loading}
                  style={{
                    width: '100%',
                    height: '50px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #2E8B57 0%, #1E90FF 100%)',
                    border: 'none',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(30,144,255,0.15)'
                  }}
                >
                  {loading ? 'Convirtiendo...' : 'Iniciar Conversión a XTF'}
                </Button>
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: '64px', marginBottom: '24px' }} />
                <Title level={3}>Conversión Completada con Éxito</Title>
                <Paragraph style={{ maxWidth: '500px', margin: '0 auto 24px' }}>
                  El archivo Excel se estructuró correctamente de acuerdo al Modelo LADM-COL. El archivo XTF se ha generado y descargado automáticamente en su navegador.
                </Paragraph>

                <Alert
                  message="Detalles del Archivo Generado"
                  description={
                    <div style={{ textAlign: 'left', marginTop: '8px' }}>
                      <div><strong>Nombre de descarga:</strong> {resultFileName}</div>
                      <div><strong>Estándar:</strong> LADM-COL (Interno Levantamiento Catastral)</div>
                      <div><strong>Formato de salida:</strong> INTERLIS XML Transfer (.xtf)</div>
                    </div>
                  }
                  type="success"
                  style={{ maxWidth: '500px', margin: '0 auto 24px', borderRadius: '8px' }}
                />

                <Space>
                  <Button onClick={handleReset} size="large" style={{ borderRadius: '8px' }}>
                    Convertir otro archivo
                  </Button>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleConvert}
                    size="large"
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #2E8B57 0%, #1E90FF 100%)',
                      border: 'none'
                    }}
                  >
                    Descargar de nuevo
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        </Col>

        {/* Guía lateral */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card
              title={<span style={{ fontWeight: 'bold' }}><FileProtectOutlined /> Estructura del Proceso</span>}
              bordered={false}
              style={{
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
              }}
            >
              <Steps
                direction="vertical"
                size="small"
                current={currentStep}
                items={[
                  {
                    title: 'Subida del Archivo',
                    description: 'Lectura del Excel consolidado en servidor.',
                  },
                  {
                    title: 'Esquema LADM-COL',
                    description: 'Generación de estructura relacional en base de datos.',
                  },
                  {
                    title: 'Mapeo Catastral',
                    description: 'Inserción y vinculación de predios, linderos y propietarios.',
                  },
                  {
                    title: 'Generación XTF',
                    description: 'Exportación mediante herramientas ili2pg oficiales.',
                  },
                ]}
              />
            </Card>

            <Alert
              message="Importante"
              description="Este convertidor no altera la información catastral consolidada del municipio seleccionado. Todas las operaciones se realizan en un entorno aislado temporal y se destruyen inmediatamente al finalizar."
              type="info"
              showIcon
              style={{ borderRadius: '12px' }}
            />
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default ExcelToXTFConverter;
