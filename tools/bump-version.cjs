#!/usr/bin/env node

/*
 * Sync the project version across package.json, version.json and CHANGELOG.md.
 *
 * Usage:
 *   node tools/bump-version.cjs 0.5.0-alpha "Etapa 1 - Infraestructura" "Resumen" "Pendiente"
 *
 * Notes:
 * - The first arg can be with or without the leading v.
 * - Summary/pending are optional newline or `|` separated lists.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const PACKAGE_PATH = path.join(ROOT, 'package.json');
const VERSION_PATH = path.join(ROOT, 'version.json');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalizeVersion(input) {
  const raw = String(input || '').trim();
  if (!raw) fail('Missing version. Example: 0.5.0-alpha');
  return raw.startsWith('v') ? raw : `v${raw}`;
}

function splitList(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw
    .split(/\n|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function upsertChangelog(version, track, summaryItems, pendingItems) {
  const existing = fs.existsSync(CHANGELOG_PATH)
    ? fs.readFileSync(CHANGELOG_PATH, 'utf8')
    : '# Changelog\n';

  const lines = ['# Changelog', '', `## ${version}`, ''];
  lines.push('### Updated');
  lines.push(`- ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push('### Track');
  lines.push(`- ${track}`);
  lines.push('');

  if (summaryItems.length) {
    lines.push('### Added');
    for (const item of summaryItems) lines.push(`- ${item}`);
    lines.push('');
  }

  if (pendingItems.length) {
    lines.push('### Pending');
    for (const item of pendingItems) lines.push(`- ${item}`);
    lines.push('');
  }

  const next = lines.join('\n') + '\n' + (existing.startsWith('# Changelog') ? existing.split('\n').slice(2).join('\n') : existing);
  fs.writeFileSync(CHANGELOG_PATH, next.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', 'utf8');
}

function main() {
  const version = normalizeVersion(process.argv[2]);
  const track = String(process.argv[3] || 'Etapa 1 - Infraestructura').trim();
  const summaryItems = splitList(process.argv[4]);
  const pendingItems = splitList(process.argv[5]);

  const pkg = readJson(PACKAGE_PATH) || {};
  const versionJson = readJson(VERSION_PATH) || {};

  pkg.version = version;
  versionJson.version = version;
  versionJson.track = track;
  versionJson.label = versionJson.label || 'Excel Engine';
  versionJson.updated = new Date().toISOString().slice(0, 10);
  if (summaryItems.length) versionJson.summary = summaryItems;
  if (pendingItems.length) versionJson.pending = pendingItems;

  writeJson(PACKAGE_PATH, pkg);
  writeJson(VERSION_PATH, versionJson);
  upsertChangelog(version, track, summaryItems, pendingItems);

  console.log(`Synchronized version to ${version}`);
}

main();
