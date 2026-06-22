const { query } = require('../config/database');

async function main() {
  try {
    // 1. List schemas
    const schemas = await query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema')");
    console.log('Schemas:', schemas.rows.map(r => r.schema_name));

    // 2. Let's find if cr_usouconstipo exists in the database
    // Typically there is a schema like 'public' or similar, let's look for cr_usouconstipo in any schema.
    const tables = await query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'cr_usouconstipo'
    `);
    console.log('Tables for cr_usouconstipo:', tables.rows);

    if (tables.rows.length > 0) {
      const targetSchema = tables.rows[0].table_schema;
      const rows = await query(`SELECT * FROM "${targetSchema}".cr_usouconstipo`);
      console.log(`Rows in ${targetSchema}.cr_usouconstipo:`, rows.rows);
    } else {
      console.log('cr_usouconstipo table not found anywhere.');
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

main();
