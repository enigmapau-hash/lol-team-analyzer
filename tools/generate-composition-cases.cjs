#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { readWorkbook, buildValidationCases } = require('./composition-validation.cjs');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  const workbookPath = process.argv[2] || 'Draft Pool.xlsx';
  const outputPath = process.argv[3] || 'tests/composition.validation.json';
  const limitArg = Number(process.argv[4] || 30);
  const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.floor(limitArg) : 30;

  try {
    const workbook = readWorkbook(workbookPath);
    const cases = buildValidationCases(workbook, limit);
    const payload = `${JSON.stringify(cases, null, 2)}\n`;
    fs.writeFileSync(path.resolve(process.cwd(), outputPath), payload, 'utf8');
    process.stdout.write(
      JSON.stringify(
        {
          source: path.basename(workbookPath),
          output: outputPath,
          totalCases: cases.length,
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ) + '\n',
    );
  } catch (error) {
    fail(error?.message || 'Unable to generate validation cases.');
  }
}

main();
