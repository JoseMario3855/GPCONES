const { query } = require('../config/database');
const xtfController = require('../controllers/xtfController');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  console.log('=== Reproducing NullPointerException ===');
  
  const userResult = await query(
    "SELECT id, username, role FROM users WHERE role = 'Administrador del Sistema' AND is_active = true LIMIT 1"
  );
  if (userResult.rows.length === 0) {
    console.error('❌ No active administrator user found.');
    process.exit(1);
  }
  const adminUser = userResult.rows[0];

  const excelPath = 'C:/VictorManuel/GPCONES1/IGAC_R1_R2_Belen_de_los_Andaquies_18094 (1).xlsx';
  const tempUploadDir = path.join(__dirname, '../uploads/excel');
  await fs.mkdir(tempUploadDir, { recursive: true });
  
  const tempExcelPath = path.join(tempUploadDir, `igac-excel-npe-test-${Date.now()}.xlsx`);
  await fs.copyFile(excelPath, tempExcelPath);

  const req = {
    file: {
      path: tempExcelPath,
      originalname: 'IGAC_R1_R2_Belen_de_los_Andaquies_18094 (1).xlsx'
    },
    user: {
      id: adminUser.id,
      role: adminUser.role
    }
  };

  let responseHeaders = {};
  let sentData = null;
  let responseStatus = 200;
  let jsonResponse = null;

  const res = {
    setHeader(name, value) {
      responseHeaders[name] = value;
      return this;
    },
    status(code) {
      responseStatus = code;
      return this;
    },
    send(data) {
      sentData = data;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    }
  };

  try {
    await xtfController.excelToXTF(req, res);
    if (jsonResponse) {
      console.log('❌ JSON Response:', jsonResponse);
    } else {
      console.log('✅ Success! Generated size:', sentData.length);
    }
  } catch (err) {
    console.error('❌ Caught controller error:', err);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
