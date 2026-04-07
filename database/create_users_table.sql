-- =====================================================
-- CREACIÓN DE TABLA DE USUARIOS - SISTEMA GPCONES
-- =====================================================

-- Crear tabla de usuarios si no existe
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

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Crear trigger para actualización automática de updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at_trigger 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- Insertar usuario administrador inicial
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@gpcones.com', '$2b$12$placeholder_hash_here', 'Administrador del Sistema', 'Administrador del Sistema')
ON CONFLICT (username) DO NOTHING;

-- Comentarios de documentación
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema GPCONES con control de roles RBAC';
COMMENT ON COLUMN users.role IS 'Roles según especificaciones: Administrador del Sistema, Revisión de Calidad, Reconocedor Predial, Digitador Alfanumérico';
COMMENT ON COLUMN users.is_active IS 'Control de activación/desactivación sin pérdida de histórico';
