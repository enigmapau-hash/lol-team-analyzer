#!/usr/bin/env node

/*
 * Validate local asset references from index.html.
 * This catches 404-prone links before the app is published.
 * It also flags legacy UI hooks that should be removed in a later cleanup.
 *
 * Usage:
 *   node tools/check-public-assets.cjs
 *   node tools/check-public-assets.cjs > public-assets-report.json
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');

const ATTR_REGEX = /\b(?:src|href)=(["'])([^"']+)\1/gi;
const LOCAL_SKIP_PREFIXES = ['http://', 'https://', 'data:', 'mailto:', 'tel:', '#'];
const IGNORED_FILES = new Set(['']);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isLocalReference(value) {
  if (!value) return false;
  return !LOCAL_SKIP_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function normalizeReference(ref) {
  return String(ref || '').split('?')[0].split('#')[0].trim();
}

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    fail(`index.html not found: ${INDEX_PATH}`);
  }

  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const refs = new Set();
  let match;
  while ((match = ATTR_REGEX.exec(html))) {
    const ref = normalizeReference(match[2]);
    if (!isLocalReference(ref)) continue;
    if (IGNORED_FILES.has(ref)) continue;
    refs.add(ref);
  }

  const checks = [];
  const warnings = [];
  let ok = true;

  for (const ref of [...refs].sort()) {
    const absolute = path.resolve(ROOT, ref);
    const exists = fs.existsSync(absolute);
    const stat = exists ? fs.statSync(absolute) : null;
    const entry = {
      reference: ref,
      exists,
      kind: stat?.isDirectory() ? 'directory' : stat?.isFile() ? 'file' : 'missing',
    };
    checks.push(entry);
    if (!exists) ok = false;
  }

  if (html.includes('id="pickerBackdrop"') || html.includes("id='pickerBackdrop'")) {
    warnings.push('Legacy picker backdrop still exists in index.html. Remove it once the unified picker flow is fully verified.');
  }

  const report = {
    source: path.basename(INDEX_PATH),
    generatedAt: new Date().toISOString(),
    referenceCount: checks.length,
    ok,
    warnings,
    checks,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!ok) process.exitCode = 1;
}

main();
