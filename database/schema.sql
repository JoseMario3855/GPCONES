-- =====================================================
-- ESQUEMA DE BASE DE DATOS GPCONES
-- Sistema de Catastro Integral
-- Cumplimiento con estándares IGAC y Antioquia
-- =====================================================

-- Crear base de datos si no existe
-- CREATE DATABASE "GP_CONES" WITH ENCODING 'UTF8';

-- Conectar a la base de datos GP_CONES
-- \c "GP_CONES";

-- =====================================================
-- EXTENSIONES NECESARIAS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA DE USUARIOS Y ROLES
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Administrador del Sistema', 'Revisión de Calidad', 'Reconocedor Predial', 'Digitador Alfanumérico')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA DE PREDIOS (Entidad Principal del Sistema)
-- =====================================================
CREATE TABLE IF NOT EXISTS predios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npn VARCHAR(50) UNIQUE NOT NULL, -- Número de Predio Nacional (único según documento)
    municipio VARCHAR(100) NOT NULL,
    zona VARCHAR(100),
    sector VARCHAR(100),
    numero_ficha VARCHAR(50),
    
    -- Datos físicos del predio
    area_hectareas DECIMAL(10,4),
    tipo_predio VARCHAR(100),
    uso_predio VARCHAR(100),
    
    -- Datos jurídicos del predio
    propietario_nombre VARCHAR(200),
    propietario_documento VARCHAR(20),
    propietario_tipo_documento VARCHAR(10),
    
    -- Georreferenciación (PostGIS)
    geometry GEOMETRY(POLYGON, 4326),
    
    -- Estado del predio
    estado VARCHAR(50) DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'En Revisión', 'Aprobado', 'Rechazado')),
    
    -- Auditoría
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TABLA DE TOKENS DE RECUPERACIÓN DE CONTRASEÑA
-- =====================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- =====================================================
-- TABLA DE ARCHIVOS XTF
-- =====================================================
CREATE TABLE IF NOT EXISTS xtf_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    
    -- Tipo de archivo según especificaciones
    xtf_type VARCHAR(50) NOT NULL CHECK (xtf_type IN ('IGAC 1.0', 'Antioquia Extendido')),
    model_version VARCHAR(50),
    
    -- Estado del procesamiento
    status VARCHAR(50) DEFAULT 'Cargado' CHECK (status IN ('Cargado', 'Validando', 'Validado', 'Error', 'Procesado')),
    validation_errors TEXT[],
    
    -- Resultados del procesamiento
    records_processed INTEGER DEFAULT 0,
    records_imported INTEGER DEFAULT 0,
    records_errors INTEGER DEFAULT 0,
    
    -- Usuario que cargó el archivo
    uploaded_by UUID REFERENCES users(id),
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    error_details TEXT,
    schema_name VARCHAR(100)
);

-- =====================================================
-- TABLA DE LOGS DE PROCESAMIENTO XTF
-- =====================================================
CREATE TABLE IF NOT EXISTS xtf_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID NOT NULL REFERENCES xtf_files(id) ON DELETE CASCADE,
    log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS')),
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para logs de procesamiento
CREATE INDEX IF NOT EXISTS idx_xtf_processing_logs_upload_id ON xtf_processing_logs(upload_id);
CREATE INDEX IF NOT EXISTS idx_xtf_processing_logs_created_at ON xtf_processing_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_xtf_processing_logs_level ON xtf_processing_logs(log_level);

-- =====================================================
-- TABLA DE AUDITORÍA Y TRAZABILIDAD
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Para eventos críticos (exportaciones/cargas XTF, GDB)
    is_critical BOOLEAN DEFAULT false,
    previous_state JSONB,
    new_state JSONB,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA DE CATÁLOGOS Y DOMINIOS CONTROLADOS
-- =====================================================
CREATE TABLE IF NOT EXISTS catalogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA DE REGLAS DE VALIDACIÓN
-- =====================================================
CREATE TABLE IF NOT EXISTS validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('Alfanumérico', 'Espacial', 'Topológico')),
    rule_definition JSONB NOT NULL,
    error_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_predios_npn ON predios(npn);
CREATE INDEX IF NOT EXISTS idx_predios_municipio ON predios(municipio);
CREATE INDEX IF NOT EXISTS idx_predios_estado ON predios(estado);
CREATE INDEX IF NOT EXISTS idx_predios_geometry ON predios USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_xtf_files_status ON xtf_files(status);
CREATE INDEX IF NOT EXISTS idx_xtf_files_type ON xtf_files(xtf_type);
CREATE INDEX IF NOT EXISTS idx_xtf_files_uploaded_by ON xtf_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_xtf_files_created_at ON xtf_files(created_at);

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_predios_updated_at BEFORE UPDATE ON predios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalogs_updated_at BEFORE UPDATE ON catalogs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validation_rules_updated_at BEFORE UPDATE ON validation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS INICIALES - CATÁLOGOS BÁSICOS
-- =====================================================
INSERT INTO catalogs (category, code, description, sort_order) VALUES
('TIPO_PREDIO', 'URBANO', 'Predio Urbano', 1),
('TIPO_PREDIO', 'RURAL', 'Predio Rural', 2),
('TIPO_PREDIO', 'MIXTO', 'Predio Mixto', 3),
('USO_PREDIO', 'RESIDENCIAL', 'Uso Residencial', 1),
('USO_PREDIO', 'COMERCIAL', 'Uso Comercial', 2),
('USO_PREDIO', 'INDUSTRIAL', 'Uso Industrial', 3),
('USO_PREDIO', 'AGRICOLA', 'Uso Agrícola', 4),
('ESTADO_PREDIO', 'BORRADOR', 'Borrador', 1),
('ESTADO_PREDIO', 'EN_REVISION', 'En Revisión', 2),
('ESTADO_PREDIO', 'APROBADO', 'Aprobado', 3),
('ESTADO_PREDIO', 'RECHAZADO', 'Rechazado', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- USUARIO ADMINISTRADOR INICIAL
-- =====================================================
-- Nota: La contraseña debe ser hasheada en la aplicación
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@gpcones.com', '$2b$12$placeholder_hash_here', 'Administrador del Sistema', 'Administrador del Sistema')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema GPCONES con control de roles RBAC';
COMMENT ON TABLE predios IS 'Tabla principal de predios catastrales con información física y jurídica';
COMMENT ON TABLE xtf_files IS 'Registro de archivos XTF cargados y procesados por el sistema';
COMMENT ON TABLE audit_logs IS 'Registro de auditoría y trazabilidad de todas las operaciones del sistema';
COMMENT ON TABLE catalogs IS 'Catálogos y dominios controlados para estandarización de datos';
COMMENT ON TABLE validation_rules IS 'Reglas de validación alfanumérica, espacial y topológica';

COMMENT ON COLUMN predios.npn IS 'Número de Predio Nacional - debe ser único según especificaciones IGAC';
COMMENT ON COLUMN predios.geometry IS 'Geometría del predio en formato PostGIS (EPSG:4326)';
COMMENT ON COLUMN predios.estado IS 'Estado del predio según flujo de trabajo de validación';
COMMENT ON COLUMN xtf_files.xtf_type IS 'Tipo de archivo XTF: IGAC 1.0 o Antioquia Extendido';
COMMENT ON COLUMN audit_logs.is_critical IS 'Indica si es un evento crítico (exportaciones/cargas XTF, GDB)';
