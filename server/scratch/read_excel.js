const ExcelJS = require('exceljs');
const path = require('path');

async function main() {
  const filePath = path.join(__dirname, 'consolidado_test.xlsx');
  console.log('Reading Excel file from:', filePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('=== Excel sheets found ===');
  workbook.worksheets.forEach(sheet => {
    console.log(`Sheet: ${sheet.name}, Rows: ${sheet.rowCount}`);
    // Print first 2 rows if they exist
    if (sheet.rowCount > 0) {
      console.log('  Headers:', sheet.getRow(1).values.slice(1, 6), '...');
      if (sheet.rowCount > 1) {
        console.log('  Row 2:', sheet.getRow(2).values.slice(1, 6), '...');
      }
    }
  });
  process.exit(0);
}

main();
