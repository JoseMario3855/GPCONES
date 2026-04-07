-- =====================================================
-- AGREGAR TABLA DE TOKENS DE RECUPERACIÓN DE CONTRASEÑA
-- =====================================================

-- Crear tabla de tokens de recuperación si no existe
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Comentarios de documentación
COMMENT ON TABLE password_reset_tokens IS 'Tabla para tokens de recuperación de contraseña con expiración de 30 minutos';
COMMENT ON COLUMN password_reset_tokens.token IS 'Token único para recuperación de contraseña';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Fecha y hora de expiración del token (30 minutos)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Indica si el token ya fue utilizado';

-- Limpiar tokens expirados (opcional - se puede ejecutar periódicamente)
-- DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = true;

SELECT 'Tabla password_reset_tokens creada exitosamente' as resultado;
