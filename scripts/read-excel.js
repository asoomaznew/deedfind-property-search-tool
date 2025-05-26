import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const excelFilePath = path.join(__dirname, '..', 'list.xlsx');
console.log('Reading Excel file:', excelFilePath);

try {
  // Check if file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error('Excel file not found:', excelFilePath);
    process.exit(1);
  }

  // Read the workbook
  const workbook = XLSX.readFile(excelFilePath);
  console.log('Sheet names:', workbook.SheetNames);

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('\n=== Excel File Contents ===');
  console.log('Total rows:', jsonData.length);

  if (jsonData.length > 0) {
    console.log('\nHeaders (Row 1):', jsonData[0]);

    console.log('\nFirst 10 data rows:');
    for (let i = 1; i < Math.min(11, jsonData.length); i++) {
      console.log(`Row ${i}:`, jsonData[i]);
    }

    // Convert to objects with headers
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);

    console.log('\n=== Sample Data as Objects ===');
    for (let i = 0; i < Math.min(5, dataRows.length); i++) {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = dataRows[i][index];
      });
      console.log(`Record ${i + 1}:`, obj);
    }

    // Generate TypeScript interface suggestion
    console.log('\n=== Suggested TypeScript Interface ===');
    console.log('interface ExcelRecord {');
    headers.forEach(header => {
      console.log(`  "${header}"?: string | number | null;`);
    });
    console.log('}');

    // Generate sample DeedEntry mapping
    console.log('\n=== Suggested DeedEntry Mapping ===');
    console.log('// Map Excel columns to DeedEntry fields:');
    console.log('const mapExcelToDeedEntry = (excelRow) => ({');
    console.log('  hajryPlotNumber: excelRow["COLUMN_NAME_FOR_PLOT"] || null,');
    console.log('  buildingNo: excelRow["COLUMN_NAME_FOR_BUILDING"] || null,');
    console.log('  mazaya: excelRow["COLUMN_NAME_FOR_MAZAYA"] || null,');
    console.log('  title: excelRow["COLUMN_NAME_FOR_TITLE"] || null,');
    console.log('  municipalityTitleDeed: excelRow["COLUMN_NAME_FOR_MUNICIPALITY"] || null,');
    console.log('  referenceDeed: excelRow["COLUMN_NAME_FOR_REFERENCE"] || null,');
    console.log('});');

  } else {
    console.log('Excel file is empty or has no data');
  }

} catch (error) {
  console.error('Error reading Excel file:', error.message);
  process.exit(1);
}
