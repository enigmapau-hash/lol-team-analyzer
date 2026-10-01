#!/usr/bin/env node

/*
 * Direct audit for the "Composición" sheet.
 * Compares the workbook against tests/cases.json without any intermediate JSON.
 *
 * Usage:
 *   node tools/audit-composition.cjs "Draft Pool.xlsx" tests/cases.json
 *   node tools/audit-composition.cjs "Draft Pool.xlsx" tests/cases.json > composition-audit.json
 */

const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const COMPOSITION_SHEET = 'Composición';
const REQUIRED_ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];
const ROLE_ALIASES = {
  top: ['top', 'top lane', 'tope', 'role top'],
  jungle: ['jungle', 'jungla', 'jg', 'jng'],
  mid: ['mid', 'middle', 'mid lane', 'medio'],
  adc: ['adc', 'bot', 'botline', 'bottom', 'carry'],
  support: ['support', 'supp', 'sup', 'soporte'],
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["'`´’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function pickKey(row, aliases) {
  if (!row || typeof row !== 'object') return null;
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const normalizedAlias = normalize(alias);
    const exact = entries.find(([key]) => normalize(key) === normalizedAlias);
    if (exact) return exact[0];
  }
  for (const [key] of entries) {
    const normalizedKey = normalize(key);
    if (aliases.some((alias) => normalizedKey === normalize(alias) || normalizedKey.includes(normalize(alias)))) {
      return key;
    }
  }
  return null;
}

function getRoleValue(row, role) {
  const key = pickKey(row, ROLE_ALIASES[role]);
  return key ? String(row[key] ?? '').trim() : '';
}

function matchesCompositionRow(row, composition) {
  return REQUIRED_ROLES.every((role) => normalize(getRoleValue(row, role)) === normalize(composition[role]));
}

function normalizeRow(row) {
  const normalized = {};
  for (const [key, value] of Object.entries(row || {})) {
    normalized[String(key).trim()] = String(value ?? '').trim();
  }
  return normalized;
}

function main() {
  const workbookPath = process.argv[2] || 'Draft Pool.xlsx';
  const casesPath = process.argv[3] || path.resolve(process.cwd(), 'tests/cases.json');
  const outputPath = process.argv[4] || null;

  const resolvedWorkbook = path.resolve(process.cwd(), workbookPath);
  const resolvedCases = path.resolve(process.cwd(), casesPath);

  if (!fs.existsSync(resolvedWorkbook)) {
    fail(`Workbook not found: ${resolvedWorkbook}`);
  }
  if (!fs.existsSync(resolvedCases)) {
    fail(`Cases file not found: ${resolvedCases}`);
  }
  if (typeof XLSX === 'undefined') {
    fail('XLSX library is not available. Run npm install first.');
  }

  const workbookBuffer = fs.readFileSync(resolvedWorkbook);
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer' });
  const casesData = JSON.parse(fs.readFileSync(resolvedCases, 'utf8'));

  if (!Array.isArray(casesData)) {
    fail('tests/cases.json must be a JSON array.');
  }

  const compositionSheet = workbook.Sheets[COMPOSITION_SHEET];
  if (!compositionSheet) {
    fail(`Missing worksheet: ${COMPOSITION_SHEET}`);
  }

  const rows = XLSX.utils.sheet_to_json(compositionSheet, { defval: '' }).map(normalizeRow);

  const auditedCases = casesData.map((testCase) => {
    const composition = testCase?.composition || {};
    const match = rows.find((row) => matchesCompositionRow(row, composition));

    if (!match) {
      return {
        name: testCase?.name || 'unknown',
        composition,
        ok: false,
        status: 'missing',
        notes: testCase?.notes || '',
      };
    }

    return {
      name: testCase?.name || 'unknown',
      composition,
      ok: true,
      status: 'matched',
      matchedRow: match,
      notes: testCase?.notes || '',
    };
  });

  const report = {
    source: path.basename(resolvedWorkbook),
    casesSource: path.basename(resolvedCases),
    generatedAt: new Date().toISOString(),
    sheet: COMPOSITION_SHEET,
    totalCases: auditedCases.length,
    matchedCases: auditedCases.filter((item) => item.ok).length,
    missingCases: auditedCases.filter((item) => !item.ok).length,
    ok: auditedCases.every((item) => item.ok),
    cases: auditedCases,
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) {
    fs.writeFileSync(path.resolve(process.cwd(), outputPath), json, 'utf8');
  }

  process.stdout.write(json);
  if (!report.ok) process.exitCode = 1;
}

main();
