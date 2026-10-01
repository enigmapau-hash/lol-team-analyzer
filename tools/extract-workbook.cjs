#!/usr/bin/env node

/*
 * Local helper to extract the workbook into a JSON structure that can be used
 * to validate the app against the Excel source of truth.
 *
 * Usage:
 *   npm install xlsx
 *   node tools/extract-workbook.cjs "Draft Pool.xlsx" > draft-pool.json
 *
 * Optional second argument:
 *   node tools/extract-workbook.cjs "Draft Pool.xlsx" ./out.json
 */

const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const SHEET_MAP = {
  top: 'Tabla Top',
  jungle: 'Tabla Jungla',
  mid: 'Tabla Mid',
  botline: 'Tabla Botline',
  support: 'Tabla Support',
};

const COMPOSITION_SHEET = 'Composición';

function die(message) {
  console.error(message);
  process.exit(1);
}

function normalizeCell(value) {
  return String(value ?? '').trim();
}

function extractRoleRows(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows
    .map((row) => ({
      champion: normalizeCell(row['Campeón']),
      identity: normalizeCell(row['Identidad']),
      function: normalizeCell(row['Función']),
      tempo: normalizeCell(row['Ritmo']),
      strengths: normalizeCell(row['Fortalezas']),
      weaknesses: normalizeCell(row['Debilidades']),
    }))
    .filter((row) => row.champion.length > 0);
}

function extractCompositionRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: '' }).map((row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[String(key).trim()] = normalizeCell(value);
    }
    return normalized;
  });
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || null;

  if (!inputPath) {
    die('Usage: node tools/extract-workbook.cjs "Draft Pool.xlsx" [out.json]');
  }

  const resolvedInput = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedInput)) {
    die(`Workbook not found: ${resolvedInput}`);
  }

  const buffer = fs.readFileSync(resolvedInput);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const roles = {};
  for (const [roleKey, sheetName] of Object.entries(SHEET_MAP)) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Missing worksheet: ${sheetName}`);
    }
    roles[roleKey] = extractRoleRows(sheet);
  }

  const compositionSheet = workbook.Sheets[COMPOSITION_SHEET];
  const composition = compositionSheet ? extractCompositionRows(compositionSheet) : [];

  const payload = {
    source: path.basename(resolvedInput),
    generatedAt: new Date().toISOString(),
    roles,
    composition,
  };

  const json = JSON.stringify(payload, null, 2);

  if (outputPath) {
    const resolvedOutput = path.resolve(process.cwd(), outputPath);
    fs.writeFileSync(resolvedOutput, `${json}\n`, 'utf8');
    console.log(`Wrote ${resolvedOutput}`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

try {
  main();
} catch (error) {
  die(error?.stack || error?.message || String(error));
}
