#!/usr/bin/env node

/*
 * Direct workbook audit. Reads Draft Pool.xlsx and validates the expected
 * sheets and columns without converting the workbook into JSON first.
 *
 * Usage:
 *   node tools/check-workbook.cjs "Draft Pool.xlsx"
 *   node tools/check-workbook.cjs "Draft Pool.xlsx" > workbook-report.json
 */

const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const REQUIRED_ROLE_SHEETS = {
  top: 'Tabla Top',
  jungle: 'Tabla Jungla',
  mid: 'Tabla Mid',
  botline: 'Tabla Botline',
  support: 'Tabla Support',
};

const REQUIRED_ROLE_COLUMNS = ['Campeón', 'Identidad', 'Función', 'Ritmo', 'Fortalezas', 'Debilidades'];
const COMPOSITION_SHEET = 'Composición';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["'`´’]/g, '')
    .trim()
    .toLowerCase();
}

function getSheetHeaders(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const firstRow = rows[0] || {};
  return Object.keys(firstRow).map((key) => String(key).trim());
}

function getSheetRowCount(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: '' }).length;
}

function main() {
  const inputPath = process.argv[2] || 'Draft Pool.xlsx';
  const resolvedInput = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(resolvedInput)) {
    fail(`Workbook not found: ${resolvedInput}`);
  }

  if (typeof XLSX === 'undefined') {
    fail('XLSX library is not available. Run npm install first.');
  }

  const buffer = fs.readFileSync(resolvedInput);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = new Set(workbook.SheetNames);

  const report = {
    source: path.basename(resolvedInput),
    generatedAt: new Date().toISOString(),
    sheets: {},
    ok: true,
  };

  const missingSheets = [];

  for (const [roleKey, sheetName] of Object.entries(REQUIRED_ROLE_SHEETS)) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      missingSheets.push(sheetName);
      report.sheets[roleKey] = { sheetName, ok: false, reason: 'missing sheet' };
      report.ok = false;
      continue;
    }

    const headers = getSheetHeaders(sheet);
    const missingColumns = REQUIRED_ROLE_COLUMNS.filter(
      (column) => !headers.some((header) => normalize(header) === normalize(column)),
    );

    const rowCount = getSheetRowCount(sheet);
    report.sheets[roleKey] = {
      sheetName,
      ok: missingColumns.length === 0,
      rowCount,
      headers,
      missingColumns,
    };

    if (missingColumns.length) {
      report.ok = false;
    }
  }

  const compositionSheet = workbook.Sheets[COMPOSITION_SHEET];
  if (!compositionSheet) {
    missingSheets.push(COMPOSITION_SHEET);
    report.sheets.composition = { sheetName: COMPOSITION_SHEET, ok: false, reason: 'missing sheet' };
    report.ok = false;
  } else {
    const headers = getSheetHeaders(compositionSheet);
    report.sheets.composition = {
      sheetName: COMPOSITION_SHEET,
      ok: true,
      rowCount: getSheetRowCount(compositionSheet),
      headers,
    };
  }

  report.summary = {
    sheetCount: workbook.SheetNames.length,
    foundSheets: workbook.SheetNames,
    missingSheets,
    expectedSheets: [...Object.values(REQUIRED_ROLE_SHEETS), COMPOSITION_SHEET],
    expectedRoleColumns: REQUIRED_ROLE_COLUMNS,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main();
