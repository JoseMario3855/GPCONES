const { Pool } = require('pg');

// Configuración según especificaciones del documento GPCONES
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'GP_CONES',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin1',
  max: 20, // máximo número de clientes en el pool
  idleTimeoutMillis: 30000, // tiempo máximo que un cliente puede estar inactivo
  connectionTimeoutMillis: 2000, // tiempo máximo para establecer conexión
});

// Evento cuando se conecta un cliente
pool.on('connect', (client) => {
  console.log('🔌 Cliente conectado a la base de datos GP_CONES');
});

// Evento cuando se libera un cliente
pool.on('remove', (client) => {
  console.log('🔌 Cliente liberado de la base de datos');
});

// Evento de error
pool.on('error', (err, client) => {
  console.error('❌ Error inesperado en el cliente de la base de datos', err);
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a la base de datos GP_CONES exitosa');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos GP_CONES:', error.message);
    return false;
  }
};

// Función para ejecutar queries
const query = (text, params) => pool.query(text, params);

// Función para obtener cliente del pool
const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  testConnection,
  getClient
};
