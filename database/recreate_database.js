const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'GP_CONES',
  user: 'postgres',
  password: '12345'
});

async function recreateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Recreando base de datos GPCONES desde cero...\n');
    
    // Verificar conexión
    await client.query('SELECT NOW()');
    console.log('✅ Conexión a la base de datos establecida\n');
    
    // Habilitar extensiones necesarias
    console.log('🔧 Habilitando extensiones...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ Extensión uuid-ossp habilitada');
    } catch (error) {
      console.log(`⚠️  Error habilitando uuid-ossp: ${error.message}`);
    }
    
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "postgis"');
      console.log('✅ Extensión postgis habilitada');
    } catch (error) {
      console.log(`⚠️  Error habilitando postgis: ${error.message}`);
    }
    
    console.log('');
    
    // Lista de tablas a eliminar (en orden de dependencias)
    const tablesToDrop = [
      'audit_logs',
      'xtf_files', 
      'predios',
      'users',
      'catalogs',
      'validation_rules'
    ];
    
    console.log('🗑️  Eliminando tablas existentes...');
    
    for (const table of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Tabla ${table} eliminada`);
      } catch (error) {
        console.log(`⚠️  No se pudo eliminar ${table}: ${error.message}`);
      }
    }
    
    console.log('\n🏗️  Creando nueva estructura...\n');
    
    // Crear tabla users
    const createUsersQuery = `
      CREATE TABLE users (
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
    `;
    
    await client.query(createUsersQuery);
    console.log('✅ Tabla users creada');
    
    // Crear tabla predios
    const createPrediosQuery = `
      CREATE TABLE predios (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        npn VARCHAR(50) UNIQUE NOT NULL,
        municipio VARCHAR(100) NOT NULL,
        zona VARCHAR(100),
        sector VARCHAR(100),
        numero_ficha VARCHAR(50),
        area_hectareas DECIMAL(10,4),
        tipo_predio VARCHAR(100),
        uso_predio VARCHAR(100),
        propietario_nombre VARCHAR(200),
        propietario_documento VARCHAR(20),
        propietario_tipo_documento VARCHAR(10),
        geometry GEOMETRY(POLYGON, 4326),
        estado VARCHAR(50) DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'En Revisión', 'Aprobado', 'Rechazado')),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by UUID REFERENCES users(id)
      );
    `;
    
    await client.query(createPrediosQuery);
    console.log('✅ Tabla predios creada');
    
    // Crear tabla audit_logs
    const createAuditLogsQuery = `
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address INET,
        user_agent TEXT,
        is_critical BOOLEAN DEFAULT false,
        previous_state JSONB,
        new_state JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await client.query(createAuditLogsQuery);
    console.log('✅ Tabla audit_logs creada');
    
    // Crear tabla xtf_files
    const createXtfFilesQuery = `
      CREATE TABLE xtf_files (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        xtf_type VARCHAR(50) NOT NULL CHECK (xtf_type IN ('IGAC 1.0', 'Antioquia Extendido')),
        model_version VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Cargado' CHECK (status IN ('Cargado', 'Validando', 'Validado', 'Error', 'Procesado')),
        validation_errors TEXT[],
        records_processed INTEGER DEFAULT 0,
        records_imported INTEGER DEFAULT 0,
        records_errors INTEGER DEFAULT 0,
        uploaded_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        error_details TEXT
      );
    `;
    
    await client.query(createXtfFilesQuery);
    console.log('✅ Tabla xtf_files creada');
    
    // Crear tabla catalogs
    const createCatalogsQuery = `
      CREATE TABLE catalogs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        category VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await client.query(createCatalogsQuery);
    console.log('✅ Tabla catalogs creada');
    
    // Crear tabla validation_rules
    const createValidationRulesQuery = `
      CREATE TABLE validation_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rule_name VARCHAR(100) NOT NULL,
        rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('Alfanumérico', 'Espacial', 'Topológico')),
        rule_definition JSONB NOT NULL,
        error_message TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await client.query(createValidationRulesQuery);
    console.log('✅ Tabla validation_rules creada');
    
    // Crear índices
    console.log('\n🔍 Creando índices...');
    
    const indexes = [
      'CREATE INDEX idx_predios_npn ON predios(npn)',
      'CREATE INDEX idx_predios_municipio ON predios(municipio)',
      'CREATE INDEX idx_predios_estado ON predios(estado)',
      'CREATE INDEX idx_users_username ON users(username)',
      'CREATE INDEX idx_users_role ON users(role)',
      'CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at)',
      'CREATE INDEX idx_xtf_files_status ON xtf_files(status)',
      'CREATE INDEX idx_xtf_files_type ON xtf_files(xtf_type)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log('✅ Índice creado');
      } catch (error) {
        console.log(`⚠️  Error creando índice: ${error.message}`);
      }
    }
    
    // Crear función de trigger
    console.log('\n⚡ Creando función de trigger...');
    
    const createTriggerFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    
    await client.query(createTriggerFunction);
    console.log('✅ Función de trigger creada');
    
    // Crear triggers
    console.log('\n🔗 Creando triggers...');
    
    const triggers = [
      'CREATE TRIGGER update_predios_updated_at BEFORE UPDATE ON predios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_catalogs_updated_at BEFORE UPDATE ON catalogs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_validation_rules_updated_at BEFORE UPDATE ON validation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
    ];
    
    for (const triggerQuery of triggers) {
      try {
        await client.query(triggerQuery);
        console.log('✅ Trigger creado');
      } catch (error) {
        console.log(`⚠️  Error creando trigger: ${error.message}`);
      }
    }
    
    // Insertar datos iniciales
    console.log('\n📝 Insertando datos iniciales...');
    
    const insertCatalogs = `
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
    `;
    
    await client.query(insertCatalogs);
    console.log('✅ Catálogos iniciales insertados');
    
    // Verificar estructura final
    console.log('\n🔍 Verificando estructura final...');
    
    const finalCheckQuery = `
      SELECT 
        table_name,
        COUNT(*) as column_count
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'predios', 'audit_logs', 'xtf_files', 'catalogs', 'validation_rules')
      GROUP BY table_name
      ORDER BY table_name;
    `;
    
    const finalCheck = await client.query(finalCheckQuery);
    
    console.log('\n📋 Tablas creadas:');
    console.log('─'.repeat(40));
    
    finalCheck.rows.forEach(row => {
      console.log(`${row.table_name}: ${row.column_count} columnas`);
    });
    
    console.log('\n🎉 ¡Base de datos recreada exitosamente!');
    console.log('✨ Ahora puedes ejecutar el script de creación de usuarios.');
    
  } catch (error) {
    console.error('❌ Error recreando base de datos:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar el script
recreateDatabase().catch(console.error);
