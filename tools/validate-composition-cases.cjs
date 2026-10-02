#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { readWorkbook, extractRoleData, findRowByChampion, compareRows, normalizeText } = require('./composition-validation.cjs');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  const workbookPath = process.argv[2] || 'Draft Pool.xlsx';
  const casesPath = process.argv[3] || 'tests/composition.validation.json';
  const outputPath = process.argv[4] || null;

  try {
    const workbook = readWorkbook(workbookPath);
    const roleData = extractRoleData(workbook);
    const casesFullPath = path.resolve(process.cwd(), casesPath);

    if (!fs.existsSync(casesFullPath)) {
      fail(`Cases file not found: ${casesFullPath}. Run generate:composition-cases first.`);
    }

    const casesData = JSON.parse(fs.readFileSync(casesFullPath, 'utf8'));
    if (!Array.isArray(casesData)) {
      fail('The cases file must contain a JSON array.');
    }

    const evaluated = casesData.map((testCase) => {
      const composition = testCase?.composition || {};
      const expectedRows = testCase?.expected?.rows || {};
      const caseReport = {
        name: testCase?.name || 'unknown',
        composition,
        ok: true,
        roles: {},
        notes: testCase?.notes || '',
      };

      for (const [roleKey, rows] of Object.entries(roleData)) {
        const champion = composition[roleKey];
        const actualRow = champion ? findRowByChampion(rows, champion) : null;
        const expectedRow = expectedRows[roleKey] || null;
        const actualSignature = actualRow ? normalizeText(actualRow.champion) : '';
        const expectedSignature = expectedRow ? normalizeText(expectedRow.champion) : '';

        const differences = expectedRow && actualRow ? compareRows(expectedRow, actualRow) : [];
        const missing = Boolean(champion) && !actualRow;
        const roleOk = !missing && (!expectedRow || differences.length === 0);

        caseReport.roles[roleKey] = {
          champion,
          ok: roleOk,
          matched: Boolean(actualRow),
          expectedSignature,
          actualSignature,
          differences,
        };

        if (!roleOk) {
          caseReport.ok = false;
        }
      }

      return caseReport;
    });

    const report = {
      source: path.basename(workbookPath),
      casesSource: path.basename(casesFullPath),
      generatedAt: new Date().toISOString(),
      totalCases: evaluated.length,
      matchedCases: evaluated.filter((item) => item.ok).length,
      failedCases: evaluated.filter((item) => !item.ok).length,
      ok: evaluated.every((item) => item.ok),
      cases: evaluated,
    };

    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (outputPath) {
      fs.writeFileSync(path.resolve(process.cwd(), outputPath), json, 'utf8');
    }

    process.stdout.write(json);
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    fail(error?.message || 'Unable to validate composition cases.');
  }
}

main();
