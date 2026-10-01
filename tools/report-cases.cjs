#!/usr/bin/env node

/*
 * Print a human-readable audit report for tests/cases.json.
 *
 * Usage:
 *   node tools/report-cases.cjs
 *   node tools/report-cases.cjs path/to/cases.json
 *
 * This script is intentionally read-only: it helps review the current status
 * of the cases before and after filling them from workbook JSON.
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PATH = path.resolve(process.cwd(), 'tests/cases.json');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Cases file not found: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in ${filePath}: ${error?.message || error}`);
    return null;
  }
}

function summarizeCase(testCase) {
  const expected = testCase?.expected || {};
  const status = String(expected.status || 'pending');
  const state = status === 'validated' ? '✅' : '🟡';
  return `${state} ${testCase.name} — ${status}`;
}

function main() {
  const filePath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_PATH;
  const casesData = readJson(filePath);
  if (!Array.isArray(casesData)) {
    fail('The cases file must contain a JSON array.');
    return;
  }

  const total = casesData.length;
  const validated = casesData.filter((item) => item?.expected?.status === 'validated').length;
  const pending = total - validated;

  console.log(`Cases: ${total}`);
  console.log(`Validated: ${validated}`);
  console.log(`Pending: ${pending}`);
  console.log('');

  for (const testCase of casesData) {
    console.log(summarizeCase(testCase));
  }
}

main();
