-- ====================================================================
-- Script to fix integration unique constraints and create logs table
-- ====================================================================

-- 1. Drop old unique constraints if they exist
ALTER TABLE predios_xtf DROP CONSTRAINT IF EXISTS predios_xtf_xtf_id_key;
ALTER TABLE terrenos_xtf DROP CONSTRAINT IF EXISTS terrenos_xtf_xtf_id_key;
ALTER TABLE construcciones_xtf DROP CONSTRAINT IF EXISTS construcciones_xtf_xtf_id_key;

-- 2. Add new composite unique constraints (xtf_schema, xtf_id)
ALTER TABLE predios_xtf ADD CONSTRAINT unique_predios_xtf_schema_id UNIQUE (xtf_schema, xtf_id);
ALTER TABLE terrenos_xtf ADD CONSTRAINT unique_terrenos_xtf_schema_id UNIQUE (xtf_schema, xtf_id);
ALTER TABLE construcciones_xtf ADD CONSTRAINT unique_construcciones_xtf_schema_id UNIQUE (xtf_schema, xtf_id);

-- 3. Ensure xtf_processing_logs table exists
CREATE TABLE IF NOT EXISTS xtf_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID NOT NULL REFERENCES xtf_files(id) ON DELETE CASCADE,
    log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS')),
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indices for logs if they don't exist
CREATE INDEX IF NOT EXISTS idx_xtf_processing_logs_upload_id ON xtf_processing_logs(upload_id);
CREATE INDEX IF NOT EXISTS idx_xtf_processing_logs_created_at ON xtf_processing_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_xtf_processing_logs_level ON xtf_processing_logs(log_level);

-- 5. Add schema_name column to xtf_files if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'xtf_files' AND column_name = 'schema_name'
    ) THEN
        ALTER TABLE xtf_files ADD COLUMN schema_name VARCHAR(100);
    END IF;
END $$;
