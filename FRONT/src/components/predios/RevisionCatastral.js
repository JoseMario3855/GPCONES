import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Button, Modal, Form, Input, Tag, 
  message, Space, Typography, Row, Col, Select
} from 'antd';
import { 
  CheckCircleOutlined, CloseCircleOutlined, 
  EyeOutlined, AuditOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const RevisionCatastral = () => {
  const [predios, setPredios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPredio, setSelectedPredio] = useState(null);
  const [isRevisionModalVisible, setIsRevisionModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  const API_URL = '/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('gpcones_token');
    return {
      headers: { Authorization: `Bearer ${token}` }
    };
  };

  const fetchPrediosParaRevision = async () => {
    try {
      setLoading(true);
      // Traer todos los predios que están en Borrador o En Revisión
      // Dependiendo del backend, tal vez debamos usar el endpoint /api/predios/revision/por-revisar
      const response = await axios.get(`${API_URL}/predios/revision/por-revisar`, getAuthHeaders());
      if (response.data.success) {
        setPredios(response.data.data.predios || []);
      }
    } catch (error) {
      message.error('Error al cargar los predios para revisión');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediosParaRevision();
  }, []);

  const handleOpenRevision = (predio) => {
    setSelectedPredio(predio);
    form.resetFields();
    setIsRevisionModalVisible(true);
  };

  const handleRevisionSubmit = async (values) => {
    try {
      setLoading(true);
      await axios.patch(
        `${API_URL}/predios/${selectedPredio.id}/status`, 
        {
          estado: values.estado,
          observaciones: values.observaciones
        },
        getAuthHeaders()
      );
      
      message.success(`Predio marcado como ${values.estado}`);
      setIsRevisionModalVisible(false);
      fetchPrediosParaRevision();
    } catch (error) {
      message.error(error.response?.data?.error || 'Error al actualizar el estado del predio');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Borrador': 'default',
      'En Revisión': 'processing',
      'Aprobado': 'success',
      'Rechazado': 'error'
    };
    return colors[status] || 'default';
  };

  const columns = [
    { title: 'NPN', dataIndex: 'npn', key: 'npn', render: text => <Text strong>{text}</Text> },
    { title: 'Municipio', dataIndex: 'municipio', key: 'municipio' },
    { title: 'Área (ha)', dataIndex: 'area_hectareas', key: 'area_hectareas' },
    { 
      title: 'Propietario', 
      key: 'propietario',
      render: (_, record) => record.propietario_nombre || '-'
    },
    { 
      title: 'Estado', 
      dataIndex: 'estado', 
      key: 'estado',
      render: estado => <Tag color={getStatusColor(estado)}>{estado}</Tag>
    },
    { 
      title: 'Fecha', 
      dataIndex: 'created_at', 
      key: 'created_at',
      render: date => moment(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<AuditOutlined />}
            onClick={() => handleOpenRevision(record)}
          >
            Revisar
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="revision-container" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#2E8B57' }}>
          <AuditOutlined style={{ marginRight: '12px' }} />
          Bandeja de Revisión Catastral
        </Title>
        <Text type="secondary">
          Revisa y aprueba o rechaza los predios registrados en el sistema.
        </Text>
      </div>
      
      <Card>
        <Table 
          dataSource={predios} 
          columns={columns} 
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={`Revisión de Predio: ${selectedPredio?.npn}`}
        open={isRevisionModalVisible}
        onCancel={() => setIsRevisionModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedPredio && (
          <div style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Municipio:</Text><br />
                <Text strong>{selectedPredio.municipio}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Área:</Text><br />
                <Text strong>{selectedPredio.area_hectareas} ha</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Propietario:</Text><br />
                <Text strong>{selectedPredio.propietario_nombre || 'N/A'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Documento:</Text><br />
                <Text strong>
                  {selectedPredio.propietario_documento 
                    ? `${selectedPredio.propietario_tipo_documento} ${selectedPredio.propietario_documento}` 
                    : 'N/A'}
                </Text>
              </Col>
            </Row>
          </div>
        )}

        <Form form={form} layout="vertical" onFinish={handleRevisionSubmit}>
          <Form.Item 
            name="estado" 
            label="Decisión de Revisión" 
            rules={[{ required: true, message: 'Debe seleccionar una decisión' }]}
          >
            <Select placeholder="Seleccione el estado">
              <Option value="Aprobado"><CheckCircleOutlined style={{ color: 'green', marginRight: 8 }}/>Aprobar Predio</Option>
              <Option value="Rechazado"><CloseCircleOutlined style={{ color: 'red', marginRight: 8 }}/>Rechazar Predio</Option>
            </Select>
          </Form.Item>
          
          <Form.Item 
            name="observaciones" 
            label="Observaciones (Requeridas si se rechaza)"
            dependencies={['estado']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue('estado') === 'Rechazado' && !value) {
                    return Promise.reject(new Error('Debe proporcionar observaciones al rechazar un predio'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <TextArea rows={4} placeholder="Escriba el motivo de la decisión o comentarios adicionales..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsRevisionModalVisible(false)}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Guardar Revisión
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RevisionCatastral;
