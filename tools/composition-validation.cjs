#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const ROLE_FIELDS = [
  { key: 'top', label: 'TOP', sheetName: 'Tabla Top' },
  { key: 'jungle', label: 'JUNGLA', sheetName: 'Tabla Jungla' },
  { key: 'mid', label: 'MID', sheetName: 'Tabla Mid' },
  { key: 'adc', label: 'BOTLINE', sheetName: 'Tabla Botline' },
  { key: 'support', label: 'SUPPORT', sheetName: 'Tabla Support' },
];

const REQUIRED_ROW_FIELDS = ['champion', 'identity', 'function', 'tempo', 'strengths', 'weaknesses'];

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["'`´’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function normalizeRow(row) {
  const normalized = {};
  for (const field of REQUIRED_ROW_FIELDS) {
    normalized[field] = String(row?.[field] ?? '').trim();
  }
  return normalized;
}

function readWorkbook(workbookPath) {
  const resolved = path.resolve(process.cwd(), workbookPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Workbook not found: ${resolved}`);
  }
  const buffer = fs.readFileSync(resolved);
  return XLSX.read(buffer, { type: 'buffer' });
}

function extractRoleData(workbook) {
  const roles = {};
  for (const role of ROLE_FIELDS) {
    const sheet = workbook.Sheets[role.sheetName];
    if (!sheet) {
      throw new Error(`Missing worksheet: ${role.sheetName}`);
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    roles[role.key] = rows
      .map((row) => normalizeRow({
        champion: row['Campeón'],
        identity: row['Identidad'],
        function: row['Función'],
        tempo: row['Ritmo'],
        strengths: row['Fortalezas'],
        weaknesses: row['Debilidades'],
      }))
      .filter((row) => row.champion);
  }
  return roles;
}

function uniqueRowsByChampion(rows) {
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = normalizeText(row.champion);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

function findRowByChampion(rows, champion) {
  const target = normalizeText(champion);
  return rows.find((row) => normalizeText(row.champion) === target) || null;
}

function buildCaseName(index, patternName) {
  return `composition-validation-${String(index + 1).padStart(2, '0')}-${patternName}`;
}

function buildCompositionCase(index, roleLists, pattern, patternName) {
  const composition = {};
  const expectedRows = {};

  for (let i = 0; i < ROLE_FIELDS.length; i += 1) {
    const role = ROLE_FIELDS[i];
    const rows = roleLists[role.key];
    if (!rows.length) {
      throw new Error(`No rows available for role ${role.key}`);
    }

    const rowIndex = (pattern[i] + index) % rows.length;
    const row = rows[rowIndex];
    composition[role.key] = row.champion;
    expectedRows[role.key] = row;
  }

  return {
    name: buildCaseName(index, patternName),
    composition,
    expected: {
      rows: expectedRows,
    },
    notes: 'Auto-generated from workbook role sheets.',
  };
}

function buildValidationCases(workbook, limit = 30) {
  const roleData = extractRoleData(workbook);
  const roleLists = Object.fromEntries(
    Object.entries(roleData).map(([roleKey, rows]) => [roleKey, uniqueRowsByChampion(rows)])
  );

  const patterns = [
    { name: 'frontline', values: [0, 0, 0, 0, 0] },
    { name: 'rotation', values: [1, 1, 1, 1, 1] },
    { name: 'engage', values: [2, 2, 2, 2, 2] },
    { name: 'skirmish', values: [3, 3, 3, 3, 3] },
    { name: 'pick', values: [4, 4, 4, 4, 4] },
    { name: 'shuffle-a', values: [0, 1, 2, 3, 4] },
    { name: 'shuffle-b', values: [4, 3, 2, 1, 0] },
    { name: 'shuffle-c', values: [0, 2, 4, 1, 3] },
    { name: 'shuffle-d', values: [1, 3, 0, 2, 4] },
    { name: 'shuffle-e', values: [2, 4, 1, 3, 0] },
  ];

  const cases = [];
  const seen = new Set();

  for (let rotation = 0; rotation < 10 && cases.length < limit; rotation += 1) {
    for (const pattern of patterns) {
      if (cases.length >= limit) break;
      const composition = {};
      const signatureParts = [];
      const expectedRows = {};

      for (let i = 0; i < ROLE_FIELDS.length; i += 1) {
        const role = ROLE_FIELDS[i];
        const rows = roleLists[role.key];
        if (!rows.length) {
          throw new Error(`No rows available for role ${role.key}`);
        }

        const rowIndex = (pattern.values[i] + rotation) % rows.length;
        const row = rows[rowIndex];
        composition[role.key] = row.champion;
        expectedRows[role.key] = row;
        signatureParts.push(normalizeText(row.champion));
      }

      const signature = signatureParts.join('|');
      if (seen.has(signature)) continue;
      seen.add(signature);

      cases.push({
        name: buildCaseName(cases.length, pattern.name),
        composition,
        expected: {
          rows: expectedRows,
        },
        notes: 'Auto-generated from workbook role sheets.',
      });
    }
  }

  return cases;
}

function compareRows(expected, actual) {
  const expectedRow = normalizeRow(expected);
  const actualRow = normalizeRow(actual);
  const keys = new Set([...Object.keys(expectedRow), ...Object.keys(actualRow)]);
  const diffs = [];

  for (const key of keys) {
    if (expectedRow[key] !== actualRow[key]) {
      diffs.push({ key, expected: expectedRow[key], actual: actualRow[key] });
    }
  }

  return diffs;
}

module.exports = {
  ROLE_FIELDS,
  normalizeText,
  normalizeRow,
  readWorkbook,
  extractRoleData,
  findRowByChampion,
  buildValidationCases,
  compareRows,
};
