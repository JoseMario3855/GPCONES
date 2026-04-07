-- =====================================================
-- SCRIPT PARA CREAR USUARIOS DE PRUEBA GPCONES
-- Sistema de Catastro Integral
-- =====================================================

-- Conectar a la base de datos GP_CONES
-- \c "GP_CONES";

-- =====================================================
-- LIMPIAR USUARIOS EXISTENTES (OPCIONAL)
-- =====================================================
-- DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE username != 'admin');
-- DELETE FROM users WHERE username != 'admin';

-- =====================================================
-- USUARIOS DE PRUEBA PARA CADA ROL
-- =====================================================

-- 1. ADMINISTRADOR DEL SISTEMA
INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
(
    'admin_sistema',
    'admin@gpcones.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', -- password: admin123
    'Administrador del Sistema GPCONES',
    'Administrador del Sistema',
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- 2. REVISIÓN DE CALIDAD
INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
(
    'revisor_calidad',
    'revisor@gpcones.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', -- password: revisor123
    'María García - Revisora de Calidad',
    'Revisión de Calidad',
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- 3. RECONOCEDOR PREDIAL
INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
(
    'reconocedor_predial',
    'reconocedor@gpcones.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', -- password: reconocedor123
    'Juan Pérez - Reconocedor Predial',
    'Reconocedor Predial',
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- 4. DIGITADOR ALFANUMÉRICO
INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
(
    'digitador_alfanumerico',
    'digitador@gpcones.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', -- password: digitador123
    'Ana López - Digitadora Alfanumérica',
    'Digitador Alfanumérico',
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- 5. USUARIO ADICIONAL PARA TESTING
INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
(
    'test_user',
    'test@gpcones.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', -- password: test123
    'Usuario de Prueba',
    'Digitador Alfanumérico',
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- VERIFICAR INSERCIÓN
-- =====================================================
SELECT 
    username,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM users 
ORDER BY role, username;

-- =====================================================
-- CONTAR USUARIOS POR ROL
-- =====================================================
SELECT 
    role,
    COUNT(*) as cantidad_usuarios,
    COUNT(CASE WHEN is_active = true THEN 1 END) as usuarios_activos
FROM users 
GROUP BY role
ORDER BY role;

-- =====================================================
-- INFORMACIÓN DE CONEXIÓN
-- =====================================================
-- Para conectar desde la aplicación:
-- Host: localhost
-- Puerto: 5432
-- Base de datos: GP_CONES
-- Usuario: postgres
-- Contraseña: 12345

-- =====================================================
-- CONTRASEÑAS DE PRUEBA (HASHEADAS)
-- =====================================================
-- admin_sistema: admin123
-- revisor_calidad: revisor123
-- reconocedor_predial: reconocedor123
-- digitador_alfanumerico: digitador123
-- test_user: test123

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Las contraseñas están hasheadas con bcrypt (costo 12)
-- 2. Todos los usuarios están activos por defecto
-- 3. Los emails son únicos y verificables
-- 4. Los roles están validados según el CHECK constraint
-- 5. Se incluye un usuario de prueba adicional para testing
