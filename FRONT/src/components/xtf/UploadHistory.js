import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Typography, 
  Tooltip,
  Popconfirm,
  message,
  List,
  Badge,
  Input,
  Select
} from 'antd';
import { 
  CloudUploadOutlined, 
  DownloadOutlined, 
  DeleteOutlined, 
  FileTextOutlined, 
  InfoCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const UploadHistory = () => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal de logs
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadUploads();
  }, [pagination.page, pagination.limit, statusFilter]);

  const loadUploads = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await axios.get('/api/xtf/uploads', { params });
      if (response.data.success) {
        setUploads(response.data.data.uploads || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination?.total || 0
        }));
      }
    } catch (error) {
      console.error('Error cargando historial de cargas:', error);
      message.error('No se pudo cargar el historial de cargas');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (upload) => {
    try {
      message.loading({ content: 'Preparando descarga...', key: 'download' });
      // Descargar el archivo directamente abriendo el endpoint en otra ventana o mediante blob
      const response = await axios({
        url: `/api/xtf/upload/${upload.id}/download`,
        method: 'GET',
        responseType: 'blob', // Importante para manejar archivos binarios/XML
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', upload.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      message.success({ content: 'Descarga iniciada', key: 'download', duration: 2 });
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      message.error({ content: 'Error al descargar el archivo', key: 'download', duration: 2 });
    }
  };

  const handleDelete = async (uploadId) => {
    try {
      const response = await axios.delete(`/api/xtf/upload/${uploadId}`);
      if (response.data.success) {
        message.success('Carga y archivos asociados eliminados exitosamente');
        loadUploads();
      }
    } catch (error) {
      console.error('Error eliminando carga:', error);
      message.error(error.response?.data?.message || 'Error eliminando el registro de carga');
    }
  };

  const handleViewLogs = async (upload) => {
    setSelectedUpload(upload);
    setLogsModalVisible(true);
    setLogs([]);
    
    try {
      setLoadingLogs(true);
      const response = await axios.get(`/api/xtf/upload/${upload.id}/logs`);
      if (response.data.success) {
        setLogs(response.data.data || []);
      }
    } catch (error) {
      console.error('Error cargando logs de procesamiento:', error);
      message.error('No se pudieron obtener los logs de procesamiento');
    } finally {
      setLoadingLogs(false);
    }
  };

  const getStatusTag = (status) => {
    const statuses = {
      'cargado': { color: 'success', text: 'Cargado' },
      'procesado': { color: 'success', text: 'Procesado' },
      'validando': { color: 'processing', text: 'Validando' },
      'procesando': { color: 'processing', text: 'Procesando' },
      'fallido': { color: 'error', text: 'Fallido' },
      'error': { color: 'error', text: 'Error' }
    };
    
    const s = statuses[status.toLowerCase()] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text.toUpperCase()}</Tag>;
  };

  const getLogLevelBadgeStatus = (level) => {
    const levels = {
      'INFO': 'success',
      'WARNING': 'warning',
      'ERROR': 'error',
      'CRITICAL': 'error'
    };
    return levels[level?.toUpperCase()] || 'default';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    {
      title: 'Nombre del Archivo',
      dataIndex: 'filename',
      key: 'filename',
      render: (text) => (
        <Space>
          <FileTextOutlined style={{ color: '#2E8B57', fontSize: '16px' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Tipo de Modelo / Versión',
      dataIndex: 'model_type',
      key: 'model_type',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Tag color="cyan">{text === 'antioquia' ? 'Antioquia Extendido' : text === 'modelo-interno' ? 'Modelo Interno' : 'IGAC 1.0'}</Tag>
          <Text type="secondary" style={{ fontSize: '11px' }}>Modelo LADM-COL</Text>
        </Space>
      )
    },
    {
      title: 'Tamaño',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => <Text>{formatBytes(size)}</Text>
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Cargado Por',
      dataIndex: 'uploaded_by',
      key: 'uploaded_by',
      render: (uploader, record) => (
        <Tooltip title={record.uploaded_by_name || uploader}>
          <Text>{uploader}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Fecha de Carga',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      render: (date) => <Text>{moment(date).format('DD/MM/YYYY HH:mm:ss')}</Text>
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Descargar XTF original">
            <Button 
              type="text" 
              icon={<DownloadOutlined />} 
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          
          <Tooltip title="Ver logs de procesamiento">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />} 
              onClick={() => handleViewLogs(record)}
            />
          </Tooltip>
          
          {user?.role === 'Administrador del Sistema' && (
            <Popconfirm
              title="¿Estás seguro de eliminar este registro de carga?"
              description="Se eliminarán los archivos y logs asociados de la base de datos."
              onConfirm={() => handleDelete(record.id)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
            >
              <Tooltip title="Eliminar registro">
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />} 
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#2E8B57' }}>
            <CloudUploadOutlined style={{ marginRight: '12px' }} />
            Registro de Cargas XTF
          </Title>
          <Text type="secondary">
            Historial de archivos XTF cargados, procesados y logs de validación en el sistema.
          </Text>
        </div>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={loadUploads}
          loading={loading}
        >
          Actualizar
        </Button>
      </div>

      <Card>
        {/* Filtros */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Text strong>Filtrar por Estado:</Text>
          <Select 
            defaultValue="" 
            style={{ width: 160 }} 
            onChange={(val) => {
              setStatusFilter(val);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <Option value="">Todos los estados</Option>
            <Option value="Cargado">Cargado</Option>
            <Option value="Procesado">Procesado</Option>
            <Option value="Validando">Validando</Option>
            <Option value="Fallido">Fallido</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={uploads}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, page, limit: pageSize }));
            },
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} de ${total} registros de carga`
          }}
        />
      </Card>

      {/* Modal de Logs de Procesamiento */}
      <Modal
        title={
          <Space>
            <DatabaseOutlined style={{ color: '#2E8B57' }} />
            <span>Logs de Procesamiento: {selectedUpload?.filename}</span>
          </Space>
        }
        open={logsModalVisible}
        onCancel={() => setLogsModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setLogsModalVisible(false)}>
            Cerrar
          </Button>
        ]}
        width={800}
      >
        <div style={{ maxHeight: '480px', overflowY: 'auto', padding: '10px 0' }}>
          <List
            loading={loadingLogs}
            dataSource={logs}
            locale={{ emptyText: 'No se encontraron registros de logs para esta carga' }}
            renderItem={(log) => (
              <List.Item style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <List.Item.Meta
                  title={
                    <Space>
                      <Badge status={getLogLevelBadgeStatus(log.log_level)} />
                      <Text strong>[{log.log_level}]</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {moment(log.created_at || log.timestamp).format('HH:mm:ss.SSS')}
                      </Text>
                    </Space>
                  }
                  description={
                    <div style={{ marginTop: '4px' }}>
                      <Text style={{ display: 'block', wordBreak: 'break-word', color: log.log_level === 'ERROR' ? '#ff4d4f' : 'inherit' }}>
                        {log.message}
                      </Text>
                      {log.details && (
                        <pre style={{ 
                          marginTop: '6px', 
                          padding: '8px', 
                          background: '#f5f5f5', 
                          borderRadius: '4px',
                          fontSize: '11px',
                          overflowX: 'auto',
                          fontFamily: 'monospace'
                        }}>
                          {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                        </pre>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Modal>

      {/* Footer BY CONESTUDIOS */}
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

export default UploadHistory;
