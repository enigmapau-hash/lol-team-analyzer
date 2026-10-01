#!/usr/bin/env node

/*
 * Validate the shape of tests/cases.json before filling in the Excel-derived
 * expected values.
 *
 * Usage:
 *   node tools/validate-cases.cjs
 *   node tools/validate-cases.cjs path/to/cases.json
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PATH = path.resolve(process.cwd(), 'tests/cases.json');
const REQUIRED_ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function main() {
  const filePath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_PATH;

  if (!fs.existsSync(filePath)) {
    fail(`Cases file not found: ${filePath}`);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in ${filePath}: ${error?.message || error}`);
    return;
  }

  if (!Array.isArray(payload)) {
    fail('The cases file must contain a JSON array.');
    return;
  }

  const names = new Set();
  let ok = true;

  payload.forEach((testCase, index) => {
    const prefix = `[${index}]`;

    if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
      fail(`${prefix} Case must be an object.`);
      ok = false;
      return;
    }

    if (!isNonEmptyString(testCase.name)) {
      fail(`${prefix} Missing or invalid "name".`);
      ok = false;
    } else if (names.has(testCase.name)) {
      fail(`${prefix} Duplicate case name: ${testCase.name}`);
      ok = false;
    } else {
      names.add(testCase.name);
    }

    const composition = testCase.composition;
    if (!composition || typeof composition !== 'object' || Array.isArray(composition)) {
      fail(`${prefix} Missing or invalid "composition" object.`);
      ok = false;
    } else {
      for (const role of REQUIRED_ROLES) {
        if (!Object.prototype.hasOwnProperty.call(composition, role) || !isNonEmptyString(composition[role])) {
          fail(`${prefix} Missing or invalid champion for role: ${role}`);
          ok = false;
        }
      }
    }

    const expected = testCase.expected;
    if (!expected || typeof expected !== 'object' || Array.isArray(expected)) {
      fail(`${prefix} Missing or invalid "expected" object.`);
      ok = false;
    }

    if (!isNonEmptyString(testCase.notes)) {
      fail(`${prefix} Missing or invalid "notes".`);
      ok = false;
    }
  });

  if (ok) {
    console.log(`Validated ${payload.length} case(s) from ${path.relative(process.cwd(), filePath)}`);
  } else {
    process.exitCode = 1;
  }
}

main();
