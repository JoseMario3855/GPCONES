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
  List,
  Checkbox,
  Tabs
} from 'antd';
import {
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  CompassOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const { Option } = Select;
const { Title, Text } = Typography;

const IGACExcelImport = () => {
  const { municipioSeleccionado } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [municipios, setMunicipios] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [gdbLoading, setGdbLoading] = useState(false);
  const [gdbResult, setGdbResult] = useState(null);
  const [gdbError, setGdbError] = useState(null);
  const [selectedGdbFile, setSelectedGdbFile] = useState(null);
  const [consolidarTerrenos, setConsolidarTerrenos] = useState(true);
  const [consolidarConstrucciones, setConsolidarConstrucciones] = useState(true);
  const [activeTab, setActiveTab] = useState('import');

  useEffect(() => {
    loadMunicipios();
  }, []);

  const loadMunicipios = async () => {
    try {
      const response = await axios.get('/api/municipios?activo=true');
      if (response.data.success) {
        // Filtrar municipios que tienen al menos un esquema asociado
        const filtered = response.data.data.filter(m => parseInt(m.total_schemas || 0, 10) > 0);
        setMunicipios(filtered);
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

  const handleGdbFileChange = (info) => {
    const { fileList } = info;
    if (fileList.length > 0) {
      setSelectedGdbFile(fileList[0]);
    } else {
      setSelectedGdbFile(null);
    }
  };

  const handleGdbConsolidate = async () => {
    const targetSchema = (importResult && importResult.schema_name) || municipioSeleccionado?.schema_name;
    if (!targetSchema) {
      message.warning('Por favor seleccione o genere un esquema de destino');
      return;
    }
    if (!selectedGdbFile) {
      message.warning('Por favor seleccione el archivo GDB (.zip)');
      return;
    }

    try {
      setGdbLoading(true);
      setGdbError(null);
      setGdbResult(null);

      const formData = new FormData();
      formData.append('gdb_file', selectedGdbFile.originFileObj || selectedGdbFile);
      formData.append('schema', targetSchema);
      formData.append('consolidar_terrenos', consolidarTerrenos);
      formData.append('consolidar_construcciones', consolidarConstrucciones);

      const response = await axios.post('/api/xtf/update-geometries-gdb', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setGdbResult(response.data.data);
        message.success('Geometrías consolidadas exitosamente');
      } else {
        setGdbError(response.data.error || 'Error en la consolidación');
      }
    } catch (error) {
      console.error('Error en consolidación GDB:', error);
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Error al procesar el archivo GDB';
      setGdbError(errMsg);
      message.error('Falló la consolidación espacial');
    } finally {
      setGdbLoading(false);
    }
  };

  const handleReset = () => {
    setImportResult(null);
    setSelectedFile(null);
    setSelectedGdbFile(null);
    setUploadProgress(0);
    setGdbResult(null);
    setGdbError(null);
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

        <Divider style={{ margin: '20px 0' }} />

        <div style={{ background: '#f7f9fc', padding: '20px', borderRadius: '8px', border: '1px solid #e1e8ed', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1a1a1a', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
            <CompassOutlined style={{ marginRight: '8px', color: '#1E90FF', fontSize: '18px' }} />
            Consolidación Geográfica desde GDB (.zip) <span style={{ color: '#888', fontWeight: 'normal', fontSize: '13px', marginLeft: '6px' }}>(Opcional)</span>
          </h4>
          <p style={{ fontSize: '13px', color: '#555', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            <strong>(Opcional)</strong> Suba el archivo comprimido <strong>.zip</strong> que contiene la carpeta de su Geodatabase (<code>.gdb</code>) con las capas de terrenos (<code>u_terreno</code> y/o <code>r_terreno</code>) para enlazarlas al esquema catastral <strong>{importResult.schema_name}</strong>. Si no cuenta con archivo geográfico (GDB), puede omitir este paso.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <Upload
              name="gdb_file"
              accept=".zip"
              maxCount={1}
              onChange={handleGdbFileChange}
              beforeUpload={() => false}
              fileList={selectedGdbFile ? [selectedGdbFile] : []}
            >
              <Button icon={<UploadOutlined />}>
                Seleccionar Archivo GDB ZIP
              </Button>
            </Upload>
            {selectedGdbFile && (
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary">
                  <DatabaseOutlined style={{ color: '#1E90FF' }} /> {selectedGdbFile.name || selectedGdbFile.originFileObj?.name}
                </Text>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#fff', borderRadius: '6px', border: '1px solid #e1e8ed' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '13px', color: '#333' }}>Opciones de Consolidación Geográfica:</p>
            <Space direction="horizontal" size="large">
              <Checkbox 
                checked={consolidarTerrenos} 
                onChange={(e) => setConsolidarTerrenos(e.target.checked)}
              >
                Consolidar Terrenos (U_TERRENO / R_TERRENO)
              </Checkbox>
              <Checkbox 
                checked={consolidarConstrucciones} 
                onChange={(e) => setConsolidarConstrucciones(e.target.checked)}
              >
                Consolidar Construcciones (U_CONSTRUCCION / R_CONSTRUCCION)
              </Checkbox>
            </Space>
          </div>

          {gdbResult && (
            <Alert
              message="Consolidación Geográfica Exitosa"
              description={
                <div style={{ fontSize: '13px' }}>
                  <p style={{ margin: '0 0 8px 0' }}>Las geometrías reales han sido mapeadas y vinculadas exitosamente:</p>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    <li>Total de terrenos actualizados con geometría real: <strong>{gdbResult.total_updated || 0}</strong></li>
                    {gdbResult.total_const_updated !== undefined && (
                      <li>Total de construcciones actualizadas con geometría real: <strong>{gdbResult.total_const_updated}</strong></li>
                    )}
                    {gdbResult.details && Object.entries(gdbResult.details).map(([layer, info]) => {
                      if (layer === 'limpieza_construcciones') return null;
                      const unitType = layer.toLowerCase().includes('construccion') ? 'construcciones' : 'terrenos';
                      return (
                        <li key={layer} style={{ marginTop: '4px' }}>
                          Capa <code>{layer}</code>: {info.status === 'success' ? (
                            <span style={{ color: 'green' }}>Actualizada con éxito ({info.updated} {unitType})</span>
                          ) : (
                            <span style={{ color: '#aaa' }}>{info.message || 'Omitida'}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              }
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          {gdbError && (
            <Alert
              message="Error en la Consolidación Geográfica"
              description={gdbError}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          <Space size="middle">
            <Button
              type="primary"
              onClick={handleGdbConsolidate}
              loading={gdbLoading}
              disabled={!selectedGdbFile || gdbLoading}
              icon={<CompassOutlined />}
              size="large"
              style={{ background: 'linear-gradient(135deg, #1E90FF 0%, #00BFFF 100%)', border: 'none' }}
            >
              Subir y Consolidar Geometrías
            </Button>
            
            {!selectedGdbFile && !gdbResult && (
              <Button
                onClick={handleReset}
                size="large"
                style={{ border: '1px dashed #d9d9d9', color: '#555' }}
              >
                Omitir y Finalizar sin Geometría
              </Button>
            )}
          </Space>
        </div>
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <Button type="primary" onClick={handleReset}>
            {gdbResult ? 'Comenzar Nueva Importación' : 'Importar Nuevo Archivo'}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <FileExcelOutlined style={{ color: '#2E8B57' }} /> Importador y Consolidador Catastral IGAC
      </Title>
      
      <Text type="secondary">
        Herramienta de importación alfanumérica y consolidación espacial LADM-COL para catastros municipales.
      </Text>

      <Divider />

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        style={{ marginBottom: '20px' }}
        items={[
          {
            key: 'import',
            label: (
              <span>
                <FileExcelOutlined /> 1. Importar Excel IGAC
              </span>
            ),
            children: (
              <>
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
                          initialValue={municipioSeleccionado?.municipio_id}
                          rules={[{ required: true, message: 'Seleccione el municipio correspondiente' }]}
                        >
                          <Select
                            showSearch
                            placeholder="Seleccione el municipio para asociar los datos"
                            optionFilterProp="label"
                            options={municipios.map(m => ({
                              value: m.id,
                              label: `${m.nombre} - DANE ${m.codigo_dane}`
                            }))}
                          />
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
              </>
            )
          },
          {
            key: 'gdb_only',
            label: (
              <span>
                <CompassOutlined /> 2. Consolidar Geometrías GDB
              </span>
            ),
            children: (
              <Card 
                title="Vincular Información Geográfica al Municipio Seleccionado" 
                style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              >
                <div style={{ background: '#f7f9fc', padding: '20px', borderRadius: '8px', border: '1px solid #e1e8ed', marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', color: '#555', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                    Utilice esta herramienta para asociar información espacial (GDB/Shp encapsulados en un <strong>.zip</strong>) directamente al esquema activo del municipio seleccionado en la cabecera.
                  </p>

                  <div style={{ marginBottom: '20px', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>MUNICIPIO SELECCIONADO</Text>
                        <Text strong style={{ fontSize: '16px', color: '#2E8B57' }}>
                          {municipioSeleccionado?.municipio_nombre} (DANE {municipioSeleccionado?.municipio_codigo_dane})
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>ESQUEMA ACTIVO DE DESTINO</Text>
                        <Text strong style={{ fontSize: '16px', color: '#1E90FF' }}>
                          {municipioSeleccionado?.schema_name}
                        </Text>
                      </Col>
                    </Row>
                  </div>

                  <Form layout="vertical">
                    <Form.Item
                      label="Archivo GDB ZIP (.zip)"
                      required
                    >
                      <Upload
                        name="gdb_file"
                        accept=".zip"
                        maxCount={1}
                        onChange={handleGdbFileChange}
                        beforeUpload={() => false}
                        fileList={selectedGdbFile ? [selectedGdbFile] : []}
                      >
                        <Button icon={<UploadOutlined />}>
                          Seleccionar Archivo GDB ZIP
                        </Button>
                      </Upload>
                      {selectedGdbFile && (
                        <div style={{ marginTop: '8px' }}>
                          <Text type="secondary">
                            <DatabaseOutlined style={{ color: '#1E90FF' }} /> {selectedGdbFile.name || selectedGdbFile.originFileObj?.name}
                          </Text>
                        </div>
                      )}
                    </Form.Item>

                    <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#fff', borderRadius: '6px', border: '1px solid #e1e8ed' }}>
                      <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '13px', color: '#333' }}>Opciones de Consolidación Geográfica:</p>
                      <Space direction="horizontal" size="large">
                        <Checkbox 
                          checked={consolidarTerrenos} 
                          onChange={(e) => setConsolidarTerrenos(e.target.checked)}
                        >
                          Consolidar Terrenos (U_TERRENO / R_TERRENO)
                        </Checkbox>
                        <Checkbox 
                          checked={consolidarConstrucciones} 
                          onChange={(e) => setConsolidarConstrucciones(e.target.checked)}
                        >
                          Consolidar Construcciones (U_CONSTRUCCION / R_CONSTRUCCION)
                        </Checkbox>
                      </Space>
                    </div>

                    {gdbResult && (
                      <Alert
                        message="Consolidación Geográfica Exitosa"
                        description={
                          <div style={{ fontSize: '13px' }}>
                            <p style={{ margin: '0 0 8px 0' }}>Las geometrías reales han sido mapeadas y vinculadas exitosamente:</p>
                            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                              <li>Total de terrenos actualizados: <strong>{gdbResult.total_updated || 0}</strong></li>
                              {gdbResult.total_const_updated !== undefined && (
                                <li>Total de construcciones actualizadas: <strong>{gdbResult.total_const_updated}</strong></li>
                              )}
                            </ul>
                          </div>
                        }
                        type="success"
                        showIcon
                        style={{ marginBottom: '20px' }}
                      />
                    )}

                    {gdbError && (
                      <Alert
                        message="Error en la Consolidación Geográfica"
                        description={gdbError}
                        type="error"
                        showIcon
                        style={{ marginBottom: '20px' }}
                      />
                    )}

                    <Button
                      type="primary"
                      onClick={handleGdbConsolidate}
                      loading={gdbLoading}
                      disabled={!selectedGdbFile || gdbLoading}
                      icon={<CompassOutlined />}
                      size="large"
                      style={{ background: 'linear-gradient(135deg, #1E90FF 0%, #00BFFF 100%)', border: 'none' }}
                    >
                      Subir y Vincular Geometrías a {municipioSeleccionado?.municipio_nombre}
                    </Button>
                  </Form>
                </div>
              </Card>
            )
          }
        ]}
      />
    </div>
  );
};

export default IGACExcelImport;
