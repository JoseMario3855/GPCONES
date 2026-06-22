import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Button, Modal, Form, Input, Switch, 
  message, Space, Tabs, Spin, Select, Popconfirm 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TabPane } = Tabs;

const CatalogosManager = () => {
  const [catalogos, setCatalogos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCatalogo, setSelectedCatalogo] = useState(null);
  const [valores, setValores] = useState([]);
  
  // Modals state
  const [isCatalogoModalVisible, setIsCatalogoModalVisible] = useState(false);
  const [isValorModalVisible, setIsValorModalVisible] = useState(false);
  
  const [catalogoForm] = Form.useForm();
  const [valorForm] = Form.useForm();
  
  // Base API URL
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

  // Obtener headers de autorización
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: { Authorization: `Bearer ${token}` }
    };
  };

  const fetchCatalogos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/catalogos`, getAuthHeaders());
      if (response.data.success) {
        setCatalogos(response.data.data);
      }
    } catch (error) {
      message.error('Error al cargar los catálogos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchValores = async (catalogoId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/catalogos/${catalogoId}`, getAuthHeaders());
      if (response.data.success) {
        setValores(response.data.data.valores || []);
        setSelectedCatalogo(response.data.data);
      }
    } catch (error) {
      message.error('Error al cargar valores del catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogos();
  }, []);

  // Handlers para Catálogos
  const handleSaveCatalogo = async (values) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/catalogos`, values, getAuthHeaders());
      message.success('Catálogo creado correctamente');
      setIsCatalogoModalVisible(false);
      catalogoForm.resetFields();
      fetchCatalogos();
    } catch (error) {
      message.error(error.response?.data?.error || 'Error al guardar catálogo');
    } finally {
      setLoading(false);
    }
  };

  // Handlers para Valores
  const openValorModal = (record = null) => {
    if (record) {
      valorForm.setFieldsValue(record);
    } else {
      valorForm.resetFields();
      valorForm.setFieldsValue({ activo: true, orden: 0 });
    }
    setIsValorModalVisible(true);
  };

  const handleSaveValor = async (values) => {
    try {
      setLoading(true);
      const editingId = valorForm.getFieldValue('id');
      
      if (editingId) {
        await axios.put(`${API_URL}/catalogos/valores/${editingId}`, values, getAuthHeaders());
        message.success('Valor actualizado correctamente');
      } else {
        await axios.post(`${API_URL}/catalogos/${selectedCatalogo.id}/valores`, values, getAuthHeaders());
        message.success('Valor creado correctamente');
      }
      
      setIsValorModalVisible(false);
      fetchValores(selectedCatalogo.id);
    } catch (error) {
      message.error(error.response?.data?.error || 'Error al guardar valor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteValor = async (id) => {
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/catalogos/valores/${id}`, getAuthHeaders());
      message.success('Valor eliminado');
      fetchValores(selectedCatalogo.id);
    } catch (error) {
      message.error('Error al eliminar valor');
    } finally {
      setLoading(false);
    }
  };

  const catalogosColumns = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion' },
    { 
      title: 'Estado', 
      dataIndex: 'activo', 
      key: 'activo',
      render: (activo) => activo ? 'Activo' : 'Inactivo'
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Button 
          type="primary" 
          icon={<SettingOutlined />}
          onClick={() => fetchValores(record.id)}
        >
          Gestionar Valores
        </Button>
      )
    }
  ];

  const valoresColumns = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo' },
    { title: 'Valor', dataIndex: 'valor', key: 'valor' },
    { title: 'Orden', dataIndex: 'orden', key: 'orden' },
    { 
      title: 'Estado', 
      dataIndex: 'activo', 
      key: 'activo',
      render: (activo) => activo ? 'Activo' : 'Inactivo'
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => {
              valorForm.setFieldsValue(record);
              setIsValorModalVisible(true);
            }} 
          />
          <Popconfirm
            title="¿Eliminar este valor?"
            onConfirm={() => handleDeleteValor(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="catalogos-container" style={{ padding: '24px' }}>
      <h2>Administración de Catálogos y Dominios</h2>
      
      <Tabs defaultActiveKey="1">
        <TabPane tab="Catálogos Principales" key="1">
          <Card 
            title="Listado de Catálogos" 
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCatalogoModalVisible(true)}>
                Nuevo Catálogo
              </Button>
            }
          >
            <Table 
              dataSource={catalogos} 
              columns={catalogosColumns} 
              rowKey="id"
              loading={loading}
            />
          </Card>
        </TabPane>
        
        {selectedCatalogo && (
          <TabPane tab={`Valores de: ${selectedCatalogo.nombre}`} key="2">
            <Card 
              title={`Valores de ${selectedCatalogo.nombre}`}
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openValorModal()}>
                  Nuevo Valor
                </Button>
              }
            >
              <Table 
                dataSource={valores} 
                columns={valoresColumns} 
                rowKey="id"
                loading={loading}
              />
            </Card>
          </TabPane>
        )}
      </Tabs>

      {/* Modal Nuevo Catálogo */}
      <Modal
        title="Nuevo Catálogo"
        open={isCatalogoModalVisible}
        onCancel={() => setIsCatalogoModalVisible(false)}
        onOk={() => catalogoForm.submit()}
        confirmLoading={loading}
      >
        <Form form={catalogoForm} layout="vertical" onFinish={handleSaveCatalogo}>
          <Form.Item name="nombre" label="Nombre (ej. TIPO_VIA)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Valor Catálogo */}
      <Modal
        title="Valor de Catálogo"
        open={isValorModalVisible}
        onCancel={() => setIsValorModalVisible(false)}
        onOk={() => valorForm.submit()}
        confirmLoading={loading}
      >
        <Form form={valorForm} layout="vertical" onFinish={handleSaveValor}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="codigo" label="Código Corto" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="valor" label="Valor a Mostrar" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="orden" label="Ordenamiento">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CatalogosManager;
