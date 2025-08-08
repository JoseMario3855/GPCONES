-- Crear base de datos
CREATE DATABASE gp_cones_catastral;

-- Conectar a la base de datos
\c gp_cones_catastral;

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de predios
CREATE TABLE predios (
    id SERIAL PRIMARY KEY,
    npn VARCHAR(50) UNIQUE NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    area DECIMAL(10,2) NOT NULL,
    propietario VARCHAR(200) NOT NULL,
    direccion TEXT,
    coordenadas JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de archivos XTF
CREATE TABLE xtf_uploads (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    validation_result JSONB,
    processing_result JSONB,
    uploaded_by INTEGER REFERENCES users(id),
    validated_at TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_predios_npn ON predios(npn);
CREATE INDEX idx_predios_municipio ON predios(municipio);
CREATE INDEX idx_predios_propietario ON predios(propietario);
CREATE INDEX idx_xtf_uploads_status ON xtf_uploads(status);
CREATE INDEX idx_xtf_uploads_uploaded_by ON xtf_uploads(uploaded_by);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_predios_updated_at BEFORE UPDATE ON predios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_xtf_uploads_updated_at BEFORE UPDATE ON xtf_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario administrador por defecto
-- Contraseña: admin123 (hasheada con bcrypt)
INSERT INTO users (username, email, password, role) VALUES 
('admin', 'admin@gpcones.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Comentarios sobre las tablas
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema catastral';
COMMENT ON TABLE predios IS 'Tabla de predios catastrales';
COMMENT ON TABLE xtf_uploads IS 'Tabla de archivos XTF cargados al sistema'; 