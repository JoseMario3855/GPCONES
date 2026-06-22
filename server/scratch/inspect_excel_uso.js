const ExcelJS = require('exceljs');

async function main() {
  const filePath = 'C:/VictorManuel/GPCONES1/IGAC_R1_R2_Belen_de_los_Andaquies_18094 (1).xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const r2Sheet = workbook.getWorksheet('R2_Datos');

  const headers = {};
  r2Sheet.getRow(1).eachCell((cell, colNumber) => {
    if (cell.value) {
      headers[String(cell.value).toUpperCase().trim()] = colNumber;
    }
  });

  const uniqueUsos = new Set();
  const usoCounts = {};

  for (let r = 2; r <= r2Sheet.rowCount; r++) {
    const row = r2Sheet.getRow(r);
    for (let i = 1; i <= 3; i++) {
      const colIndex = headers[`USO_${i}`];
      if (colIndex) {
        const cellVal = row.getCell(colIndex).value;
        if (cellVal !== null && cellVal !== undefined) {
          const valStr = String(cellVal).trim();
          if (valStr) {
            uniqueUsos.add(valStr);
            usoCounts[valStr] = (usoCounts[valStr] || 0) + 1;
          }
        }
      }
    }
  }

  console.log('Unique USOs in Excel:', Array.from(uniqueUsos));
  console.log('Counts:', usoCounts);
  process.exit(0);
}

main().catch(console.error);
