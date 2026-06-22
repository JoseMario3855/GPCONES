const ExcelJS = require('exceljs');
const path = require('path');

async function main() {
  const filePath = 'C:/VictorManuel/GPCONES1/IGAC_R1_R2_Belen_de_los_Andaquies_18094 (1).xlsx';
  console.log('Reading Excel file from:', filePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('=== Excel sheets found ===');
  workbook.worksheets.forEach((sheet, idx) => {
    console.log(`${idx + 1}. Sheet Name: "${sheet.name}", Rows: ${sheet.rowCount}`);
    if (sheet.rowCount > 0) {
      const row1 = sheet.getRow(1).values.filter(v => v !== undefined);
      console.log('    Headers:', row1);
      
      console.log('    Row 2 Preview:');
      const row2 = sheet.getRow(2).values.filter(v => v !== undefined);
      console.log('    ', row2);
    }
    console.log('-------------------------------------------');
  });

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
