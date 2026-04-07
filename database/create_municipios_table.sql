-- =====================================================
-- TABLA DE MUNICIPIOS DE COLOMBIA CON CÓDIGO DANE
-- =====================================================

CREATE TABLE IF NOT EXISTS municipios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_dane VARCHAR(5) UNIQUE NOT NULL, -- Código DANE del municipio (5 dígitos)
    nombre VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    codigo_departamento VARCHAR(2) NOT NULL, -- Código DANE del departamento (2 dígitos)
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_municipios_codigo_dane ON municipios(codigo_dane);
CREATE INDEX IF NOT EXISTS idx_municipios_departamento ON municipios(departamento);
CREATE INDEX IF NOT EXISTS idx_municipios_nombre ON municipios(nombre);

-- =====================================================
-- TABLA DE RELACIÓN MUNICIPIO-SCHEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS municipio_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipio_id UUID NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
    schema_name VARCHAR(100) NOT NULL, -- Nombre del schema (ej: ladm_entrerrios)
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(municipio_id, schema_name) -- Un municipio puede tener múltiples schemas, pero no duplicados
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_municipio_schemas_municipio ON municipio_schemas(municipio_id);
CREATE INDEX IF NOT EXISTS idx_municipio_schemas_schema ON municipio_schemas(schema_name);

-- =====================================================
-- DATOS INICIALES: MUNICIPIOS DE COLOMBIA (PRINCIPALES)
-- =====================================================

-- Insertar algunos municipios principales de Colombia con código DANE
INSERT INTO municipios (codigo_dane, nombre, departamento, codigo_departamento) VALUES
-- Antioquia (05)
('05001', 'Medellín', 'Antioquia', '05'),
('05088', 'Bello', 'Antioquia', '05'),
('05266', 'Itagüí', 'Antioquia', '05'),
('05264', 'Envigado', 'Antioquia', '05'),
('05631', 'Sabaneta', 'Antioquia', '05'),
('05380', 'La Estrella', 'Antioquia', '05'),
('05129', 'Caldas', 'Antioquia', '05'),
('05212', 'Copacabana', 'Antioquia', '05'),
('05308', 'Girardota', 'Antioquia', '05'),
('05079', 'Barbosa', 'Antioquia', '05'),
('05284', 'Entrerríos', 'Antioquia', '05'),
-- Cundinamarca (25)
('25001', 'Bogotá D.C.', 'Cundinamarca', '25'),
('25740', 'Soacha', 'Cundinamarca', '25'),
('25430', 'Facatativá', 'Cundinamarca', '25'),
('25290', 'Chía', 'Cundinamarca', '25'),
('25377', 'Girardot', 'Cundinamarca', '25'),
-- Valle del Cauca (76)
('76001', 'Cali', 'Valle del Cauca', '76'),
('76109', 'Palmira', 'Valle del Cauca', '76'),
('76834', 'Yumbo', 'Valle del Cauca', '76'),
-- Atlántico (08)
('08001', 'Barranquilla', 'Atlántico', '08'),
('08296', 'Soledad', 'Atlántico', '08'),
-- Santander (68)
('68001', 'Bucaramanga', 'Santander', '68'),
('68720', 'Floridablanca', 'Santander', '68'),
-- Bolívar (13)
('13001', 'Cartagena', 'Bolívar', '13'),
-- Meta (50)
('50001', 'Villavicencio', 'Meta', '50'),
-- Risaralda (66)
('66001', 'Pereira', 'Risaralda', '66'),
-- Quindío (63)
('63001', 'Armenia', 'Quindío', '63'),
-- Tolima (73)
('73001', 'Ibagué', 'Tolima', '73'),
-- Norte de Santander (54)
('54001', 'Cúcuta', 'Norte de Santander', '54'),
-- Huila (41)
('41001', 'Neiva', 'Huila', '41'),
-- Cauca (19)
('19001', 'Popayán', 'Cauca', '19'),
-- Nariño (52)
('52001', 'Pasto', 'Nariño', '52'),
-- Boyacá (15)
('15001', 'Tunja', 'Boyacá', '15'),
-- Córdoba (23)
('23001', 'Montería', 'Córdoba', '23'),
-- Sucre (70)
('70001', 'Sincelejo', 'Sucre', '70'),
-- Casanare (85)
('85001', 'Yopal', 'Casanare', '85')
ON CONFLICT (codigo_dane) DO NOTHING;

-- Comentarios en las tablas
COMMENT ON TABLE municipios IS 'Catálogo de municipios de Colombia con código DANE';
COMMENT ON TABLE municipio_schemas IS 'Relación entre municipios y schemas de base de datos (XTF/ILI)';
COMMENT ON COLUMN municipios.codigo_dane IS 'Código DANE de 5 dígitos del municipio';
COMMENT ON COLUMN municipio_schemas.schema_name IS 'Nombre del schema de base de datos asociado al municipio';




