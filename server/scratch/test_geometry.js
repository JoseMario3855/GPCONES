const { query } = require('../config/database');

async function main() {
  try {
    const res = await query(`
      SELECT ST_GeometryType(geometria) as geom_type, ST_AsText(geometria) as wkt
      FROM modelo_interno_import.cr_terreno
      LIMIT 1
    `);
    console.log('Sample terrain geometry:', res.rows[0]);
  } catch (e) {
    console.error('Error sample terrain:', e.message);
  }

  // Test direct WKT of MULTISURFACE
  try {
    const res2 = await query(`
      SELECT ST_GeometryType(ST_GeomFromText('MULTISURFACE Z (CURVEPOLYGON Z (COMPOUNDCURVE Z ((1000000 1000000 0, 1000000 1000001 0, 1000001 1000001 0, 1000001 1000000 0, 1000000 1000000 0))))', 3116)) as type
    `);
    console.log('Direct WKT MULTISURFACE Z test:', res2.rows[0]);
  } catch (e) {
    console.error('Error conversions:', e.message);
  }

  process.exit(0);
}

main();
