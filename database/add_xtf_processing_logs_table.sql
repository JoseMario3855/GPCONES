-- =====================================================
-- Script para agregar tabla de logs de procesamiento XTF
-- Ejecutar en bases de datos existentes
-- =====================================================

-- Agregar columna schema_name a xtf_files si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'xtf_files' AND column_name = 'schema_name'
    ) THEN
        ALTER TABLE xtf_files ADD COLUMN schema_name VARCHAR(100);
    END IF;
END $$;

-- Crear tabla de logs de procesamiento XTF
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

-- Índices adicionales para xtf_files
CREATE INDEX IF NOT EXISTS idx_xtf_files_uploaded_by ON xtf_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_xtf_files_created_at ON xtf_files(created_at);

-- Comentarios
COMMENT ON TABLE xtf_processing_logs IS 'Logs detallados del procesamiento de archivos XTF';
COMMENT ON COLUMN xtf_processing_logs.upload_id IS 'Referencia al archivo XTF procesado';
COMMENT ON COLUMN xtf_processing_logs.log_level IS 'Nivel del log: INFO, WARNING, ERROR, SUCCESS';
COMMENT ON COLUMN xtf_processing_logs.message IS 'Mensaje descriptivo del evento';
COMMENT ON COLUMN xtf_processing_logs.details IS 'Detalles adicionales en formato JSON';

