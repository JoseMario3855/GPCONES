const { query } = require('../config/database');

async function main() {
  const schema = 'xtf_1781275955487';
  console.log('=== Testing ST_CurveToLine for MultiSurface conversion ===');
  try {
    const res = await query(`
      SELECT t_id, ST_AsGeoJSON(ST_Transform(ST_CurveToLine(geometria), 4326)) as geometry_geojson
      FROM "${schema}"."cr_terreno"
      WHERE geometria IS NOT NULL
      LIMIT 3
    `);
    console.log('Success! Geometry returned:', res.rows.map(r => ({ t_id: r.t_id, geom: r.geometry_geojson.substring(0, 100) + '...' })));
  } catch (e) {
    console.error('Failure:', e.message);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
