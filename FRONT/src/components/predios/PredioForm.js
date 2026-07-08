import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  background: '#fff',
  border: '1px solid #e8e4dc',
  borderRadius: 6,
  fontSize: 13,
  color: '#1a1a18',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#6a6860',
  marginBottom: 5,
  letterSpacing: '0.05em',
};

const fieldGroupStyle = {
  display: 'flex',
  gap: 12,
  marginBottom: 14,
};

const sectionStyle = {
  background: '#fff',
  border: '1px solid #e8e4dc',
  borderRadius: 10,
  padding: '18px 20px',
  marginBottom: 16,
};

const sectionTitleStyle = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#8a8880',
  marginBottom: 14,
  paddingBottom: 8,
  borderBottom: '1px solid #f0ede6',
};

const PredioForm = ({ predioId: propPredioId = null, schema: propSchema = null, onSuccess = null }) => {
  const { id: urlPredioId } = useParams();
  const predioId = propPredioId || urlPredioId;
  const { canManagePredios } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const schemaParams = new URLSearchParams(location.search);
  const [schemaName, setSchemaName] = useState(propSchema || schemaParams.get('schema'));

  const [loading, setLoading] = useState(false);
  const [municipiosList, setMunicipiosList] = useState([]);
  const [typeOptions, setTypeOptions] = useState(null);

  const [form, setForm] = useState({
    // Identificación
    numero_predial_nacional: '',
    matricula_inmobiliaria: '',
    espacio_de_nombres: '',
    nombre: '',
    // Ubicación
    departamento: '',
    municipio: '',
    codigo_orip: '',
    // Clasificación
    condicion_predio: '',
    tipo_predio: '',
    uso_predio: '',
    // Propietario inicial (opcional)
    propietario_nombre: '',
    propietario_documento: '',
    propietario_tipo_documento: '',
  });

  useEffect(() => {
    if (!canManagePredios) {
      message.error('No tienes permisos para gestionar predios');
      navigate('/predios');
    }
  }, [canManagePredios, navigate]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadMunicipios(), loadTypeOptions()]);
      if (predioId) await loadPredioData();
    };
    init();
  }, [predioId, schemaName]);

  // Autoselección de municipio si hay solo uno en el schema
  useEffect(() => {
    if (!predioId && schemaName && municipiosList.length > 0) {
      const filtered = municipiosList.filter(m => m.schema_name === schemaName);
      if (filtered.length === 1) {
        setForm(prev => ({ ...prev, municipio: filtered[0].nombre }));
      }
    }
  }, [predioId, schemaName, municipiosList]);

  const loadMunicipios = async () => {
    try {
      const res = await axios.get('/api/municipios?activo=true');
      if (res.data.success) setMunicipiosList(res.data.data);
    } catch (e) {
      console.error('Error cargando municipios:', e);
    }
  };

  const loadTypeOptions = async () => {
    if (!schemaName) return;
    try {
      const res = await axios.get(`/api/predios/type-options?schema=${schemaName}`);
      if (res.data.success) setTypeOptions(res.data.data);
    } catch (e) {
      console.error('Error cargando type-options:', e);
    }
  };

  const loadPredioData = async () => {
    try {
      setLoading(true);
      const schemaQuery = schemaName ? `?schema=${schemaName}` : '';
      const res = await axios.get(`/api/predios/${predioId}${schemaQuery}`);
      if (res.data.success) {
        const p = res.data.data;
        setForm({
          numero_predial_nacional: p.npn || p.numero_predial_nacional || p.numero_predial || '',
          matricula_inmobiliaria: p.matricula_inmobiliaria || p.matriculaInmobiliaria || '',
          espacio_de_nombres: p.espacio_de_nombres || p.numeroFicha || '',
          nombre: p.nombre || p.direccionNombre || '',
          departamento: p.departamento || '',
          municipio: p.municipio || p.municipio_nombre || '',
          codigo_orip: p.codigo_orip || p.circulo || '',
          condicion_predio: p.condicion_predio ? String(p.condicion_predio) : '',
          tipo_predio: p.tipo_predio || (p.tipo ? String(p.tipo) : '') || '',
          uso_predio: p.uso_predio || (p.destinacion_economica ? String(p.destinacion_economica) : '') || '',
          propietario_nombre: p.propietario_nombre || '',
          propietario_documento: p.propietario_documento || '',
          propietario_tipo_documento: p.propietario_tipo_documento || '',
        });
      }
    } catch (e) {
      console.error('Error cargando predio:', e);
      message.error('Error cargando los datos del predio');
    } finally {
      setLoading(false);
    }
  };

  const handleMunicipioChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, municipio: value }));
    const selectedMuni = municipiosList.find(m => m.nombre === value);
    if (selectedMuni?.schema_name) {
      setSchemaName(selectedMuni.schema_name);
    }
  };

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.numero_predial_nacional || String(form.numero_predial_nacional).trim().length === 0) {
      message.error('El NPN es obligatorio');
      return;
    }
    if (!/^[0-9]{30}$/.test(String(form.numero_predial_nacional).trim())) {
      message.error('El NPN debe ser exactamente 30 dígitos numéricos');
      return;
    }
    if (!form.municipio || String(form.municipio).trim().length === 0) {
      message.error('El municipio es obligatorio');
      return;
    }

    try {
      setLoading(true);
      const schemaQuery = schemaName ? `?schema=${schemaName}` : '';
      const payload = {
        numero_predial_nacional: form.numero_predial_nacional.trim(),
        npn: form.numero_predial_nacional.trim(),
        matricula_inmobiliaria: form.matricula_inmobiliaria || null,
        espacio_de_nombres: form.espacio_de_nombres || null,
        nombre: form.nombre || null,
        departamento: form.departamento || null,
        municipio: form.municipio,
        codigo_orip: (form.codigo_orip && ['01', '1', '001'].includes(String(form.codigo_orip).trim())) ? '801' : (form.codigo_orip || null),
        condicion_predio: form.condicion_predio ? parseInt(form.condicion_predio, 10) : null,
        tipo_predio: form.tipo_predio ? parseInt(form.tipo_predio, 10) : null,
        uso_predio: form.uso_predio ? parseInt(form.uso_predio, 10) : null,
        propietario_nombre: form.propietario_nombre || null,
        propietario_documento: form.propietario_documento || null,
        propietario_tipo_documento: form.propietario_tipo_documento || null,
      };

      let response;
      if (predioId) {
        response = await axios.put(`/api/predios/${predioId}${schemaQuery}`, payload);
      } else {
        response = await axios.post(`/api/predios${schemaQuery}`, payload);
      }

      if (response.data.success) {
        message.success(predioId ? 'Predio actualizado exitosamente' : 'Predio registrado exitosamente');
        if (onSuccess) {
          onSuccess(response.data.data || response.data.predio);
        } else {
          const schemaParam = schemaName ? `?schema=${schemaName}` : '';
          navigate(`/predios${schemaParam}`);
        }
      }
    } catch (error) {
      console.error('Error guardando predio:', error);
      if (error.response?.data?.error === 'NPN duplicado') {
        message.error('El NPN ya existe en este esquema');
      } else {
        message.error(error.response?.data?.message || 'Error guardando el predio');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredMunicipios = schemaName
    ? municipiosList.filter(m => m.schema_name === schemaName)
    : municipiosList;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '28px 20px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: '#fff',
              border: '1px solid #e8e4dc',
              borderRadius: 7,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: '#4a4840',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← Volver
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a1a18' }}>
              {predioId ? '✏️ Editar Predio' : '🏠 Registrar Nuevo Predio'}
            </h1>
            {schemaName && (
              <span style={{ fontSize: 12, color: '#8a8880', fontWeight: 600 }}>
                Esquema: {schemaName}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Sección 1: Identificación ─────────────────────────────── */}
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>📋 Identificación del Predio</p>

            <div style={fieldGroupStyle}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>NPN (Número Predial Nacional) *</label>
                <input
                  type="text"
                  value={form.numero_predial_nacional}
                  onChange={handleChange('numero_predial_nacional')}
                  style={inputStyle}
                  placeholder="30 dígitos numéricos"
                  maxLength={30}
                  required
                />
                <span style={{ fontSize: 10, color: form.numero_predial_nacional.length === 30 ? '#0a7c50' : '#8a8880', marginTop: 3, display: 'block' }}>
                  {form.numero_predial_nacional.length} / 30 dígitos
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Matrícula Inmobiliaria</label>
                <input
                  type="number"
                  value={form.matricula_inmobiliaria}
                  onChange={handleChange('matricula_inmobiliaria')}
                  style={inputStyle}
                  placeholder="Ej: 12345"
                  min="0"
                  max="2147483647"
                />
              </div>
            </div>

            <div style={fieldGroupStyle}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Número de Ficha / Espacio de Nombres</label>
                <input
                  type="text"
                  value={form.espacio_de_nombres}
                  onChange={handleChange('espacio_de_nombres')}
                  style={inputStyle}
                  placeholder="Ej: GPCONES_Predios"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Nombre / Descripción</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={handleChange('nombre')}
                  style={inputStyle}
                  placeholder="Ej: LOTE LA ESMERALDA"
                />
              </div>
            </div>
          </div>

          {/* ── Sección 2: Ubicación ───────────────────────────────────── */}
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>📍 Ubicación</p>

            <div style={fieldGroupStyle}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Municipio *</label>
                <select
                  value={form.municipio}
                  onChange={handleMunicipioChange}
                  style={inputStyle}
                  required
                >
                  <option value="">Seleccionar municipio...</option>
                  {filteredMunicipios.map(m => (
                    <option key={m.id} value={m.nombre}>{m.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Departamento</label>
                <input
                  type="text"
                  value={form.departamento}
                  onChange={handleChange('departamento')}
                  style={inputStyle}
                  placeholder="Código departamento"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Círculo ORIP</label>
                <input
                  type="text"
                  value={form.codigo_orip}
                  onChange={handleChange('codigo_orip')}
                  style={inputStyle}
                  placeholder="Ej: 001"
                />
              </div>
            </div>
          </div>

          {/* ── Sección 3: Clasificación ───────────────────────────────── */}
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>🏷️ Clasificación</p>

            <div style={fieldGroupStyle}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Condición Predio</label>
                <select
                  value={form.condicion_predio}
                  onChange={handleChange('condicion_predio')}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  {typeOptions?.condiciones?.map(opt => (
                    <option key={opt.t_id} value={String(opt.t_id)}>
                      {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tipo de Predio</label>
                <select
                  value={form.tipo_predio}
                  onChange={handleChange('tipo_predio')}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  {typeOptions?.tipos?.map(opt => (
                    <option key={opt.t_id} value={String(opt.t_id)}>
                      {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Destino Económico</label>
                <select
                  value={form.uso_predio}
                  onChange={handleChange('uso_predio')}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  {typeOptions?.destinaciones?.map(opt => (
                    <option key={opt.t_id} value={String(opt.t_id)}>
                      {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Sección 4: Propietario Inicial (opcional) ─────────────── */}
          {!predioId && (
            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>👤 Propietario Inicial <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11, color: '#aaa' }}>(opcional — puede agregarse después)</span></p>

              <div style={fieldGroupStyle}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Nombre Completo</label>
                  <input
                    type="text"
                    value={form.propietario_nombre}
                    onChange={handleChange('propietario_nombre')}
                    style={inputStyle}
                    placeholder="Nombre completo del propietario"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Tipo de Documento</label>
                  <select
                    value={form.propietario_tipo_documento}
                    onChange={handleChange('propietario_tipo_documento')}
                    style={inputStyle}
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.documentoTypes?.map(opt => (
                      <option key={opt.t_id} value={opt.ilicode || opt.dispname}>
                        {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    )) || (
                      <>
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="CE">Cédula de Extranjería</option>
                        <option value="NIT">NIT</option>
                        <option value="TI">Tarjeta de Identidad</option>
                        <option value="RC">Registro Civil</option>
                      </>
                    )}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Número de Documento</label>
                  <input
                    type="text"
                    value={form.propietario_documento}
                    onChange={handleChange('propietario_documento')}
                    style={inputStyle}
                    placeholder="Número de documento"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Botones de acción ──────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                background: '#fff',
                color: '#1a1a18',
                border: '1px solid #e8e4dc',
                borderRadius: 7,
                padding: '9px 20px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#5a8a70' : '#0a5c3e',
                color: '#fff',
                border: 'none',
                borderRadius: 7,
                padding: '9px 28px',
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                transition: 'background 0.15s',
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#084931'; }}
              onMouseOut={e => { if (!loading) e.currentTarget.style.background = '#0a5c3e'; }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Guardando...
                </>
              ) : (
                <>💾 {predioId ? 'Actualizar Predio' : 'Registrar Predio'}</>
              )}
            </button>
          </div>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default PredioForm;
