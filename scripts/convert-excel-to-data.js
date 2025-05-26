import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const excelFilePath = path.join(__dirname, '..', 'list.xlsx');
const outputFilePath = path.join(__dirname, '..', 'data', 'deed-data.ts');

console.log('Converting Excel file to DeedEntry format...');
console.log('Input:', excelFilePath);
console.log('Output:', outputFilePath);

try {
  // Read the workbook
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Found ${jsonData.length} records in Excel file`);

  // Map Excel data to DeedEntry format
  const deedEntries = jsonData.map((row, index) => {
    // Handle the mapping based on the Excel structure we discovered
    const buildingNo = row['Building No.'] ? String(row['Building No.']).trim() : null;
    const hajry = row['Hajry'] ? String(row['Hajry']).trim() : null;
    const mazaya = row['Mazaya'] && row['Mazaya'] !== '-' ? String(row['Mazaya']).trim() : null;
    const municipalityTitleDeed = row['Municipality / Title Deed (Plot)'] ? String(row['Municipality / Title Deed (Plot)']).trim() : null;
    const referenceDeed = row['Reference Deed'] ? String(row['Reference Deed']).trim() : null;

    return {
      // Map Excel columns to DeedEntry fields
      hajryPlotNumber: municipalityTitleDeed, // Using Municipality/Title Deed as plot number
      buildingNo: buildingNo,
      mazaya: hajry, // Using Hajry as mazaya (displayed as "Hajry" in table)
      title: mazaya, // Using Mazaya as title (displayed as "Mazaya" in table)
      municipalityTitleDeed: municipalityTitleDeed,
      referenceDeed: referenceDeed
    };
  });

  // Generate the TypeScript file content
  const fileContent = `
import { DeedEntry } from '../types';

export const deedData: DeedEntry[] = [
${deedEntries.map(entry => {
  const formatValue = (value) => value === null ? 'null' : `'${value.replace(/'/g, "\\'")}'`;
  return `  { hajryPlotNumber: ${formatValue(entry.hajryPlotNumber)}, buildingNo: ${formatValue(entry.buildingNo)}, mazaya: ${formatValue(entry.mazaya)}, title: ${formatValue(entry.title)}, municipalityTitleDeed: ${formatValue(entry.municipalityTitleDeed)}, referenceDeed: ${formatValue(entry.referenceDeed)} }`;
}).join(',\n')}
];

export const generalSearchFields: (keyof DeedEntry)[] = [
  'municipalityTitleDeed', 'hajryPlotNumber', 'mazaya', 'title', 'referenceDeed', 'buildingNo'
];
`;

  // Write the file
  fs.writeFileSync(outputFilePath, fileContent, 'utf8');
  
  console.log(`✅ Successfully converted ${deedEntries.length} records to deed-data.ts`);
  console.log('Sample entries:');
  deedEntries.slice(0, 5).forEach((entry, index) => {
    console.log(`${index + 1}:`, entry);
  });

} catch (error) {
  console.error('Error converting Excel file:', error.message);
  process.exit(1);
}
