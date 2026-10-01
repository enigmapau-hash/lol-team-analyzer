#!/usr/bin/env node

/*
 * Consolidated audit runner for the workbook and the composition sheet.
 *
 * It executes:
 *   1) tools/check-workbook.cjs
 *   2) tools/audit-composition.cjs
 *
 * The script prints a single JSON object with both results so the review can
 * be opened in one file or piped to disk.
 *
 * Usage:
 *   node tools/run-audit-suite.cjs "Draft Pool.xlsx" tests/cases.json
 *   node tools/run-audit-suite.cjs "Draft Pool.xlsx" tests/cases.json > stage1-audit.json
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function runNode(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !result.stdout) {
    throw new Error(result.stderr || `Command failed: ${scriptPath}`);
  }

  const text = String(result.stdout || '').trim();
  if (!text) {
    return { ok: false, raw: '', error: result.stderr || 'Empty output' };
  }

  try {
    return { ok: result.status === 0, raw: text, data: JSON.parse(text), stderr: result.stderr || '' };
  } catch (error) {
    return { ok: false, raw: text, error: error.message, stderr: result.stderr || '' };
  }
}

function main() {
  const workbookPath = process.argv[2] || 'Draft Pool.xlsx';
  const casesPath = process.argv[3] || path.resolve(process.cwd(), 'tests/cases.json');
  const resolvedWorkbook = path.resolve(process.cwd(), workbookPath);
  const resolvedCases = path.resolve(process.cwd(), casesPath);

  if (!fs.existsSync(resolvedWorkbook)) {
    fail(`Workbook not found: ${resolvedWorkbook}`);
  }
  if (!fs.existsSync(resolvedCases)) {
    fail(`Cases file not found: ${resolvedCases}`);
  }

  const workbookAudit = runNode(path.join(process.cwd(), 'tools', 'check-workbook.cjs'), [resolvedWorkbook]);
  const compositionAudit = runNode(path.join(process.cwd(), 'tools', 'audit-composition.cjs'), [resolvedWorkbook, resolvedCases]);

  const report = {
    source: path.basename(resolvedWorkbook),
    casesSource: path.basename(resolvedCases),
    generatedAt: new Date().toISOString(),
    workbook: workbookAudit.data || null,
    composition: compositionAudit.data || null,
    ok: Boolean(workbookAudit.ok && compositionAudit.ok && workbookAudit.data?.ok !== false && compositionAudit.data?.ok !== false),
  };

  if (!workbookAudit.ok || !compositionAudit.ok) {
    report.details = {
      workbook: workbookAudit.ok ? null : { raw: workbookAudit.raw, error: workbookAudit.error, stderr: workbookAudit.stderr },
      composition: compositionAudit.ok ? null : { raw: compositionAudit.raw, error: compositionAudit.error, stderr: compositionAudit.stderr },
    };
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}

main();
