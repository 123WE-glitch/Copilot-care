#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const DIST_PATH = path.join(FRONTEND_ROOT, 'dist');

function removeRecursively(entryPath) {
  const stat = fs.lstatSync(entryPath);
  if (stat.isDirectory()) {
    const childEntries = fs.readdirSync(entryPath);
    for (const childEntry of childEntries) {
      removeRecursively(path.join(entryPath, childEntry));
    }
    fs.rmdirSync(entryPath);
    return;
  }
  fs.unlinkSync(entryPath);
}

try {
  if (!fs.existsSync(DIST_PATH)) {
    console.log('[clean-dist] dist directory not found, skipped.');
    process.exit(0);
  }

  const entries = fs.readdirSync(DIST_PATH);
  for (const entry of entries) {
    const entryPath = path.join(DIST_PATH, entry);
    removeRecursively(entryPath);
  }

  console.log(`[clean-dist] cleared ${entries.length} entries in: ${DIST_PATH}`);
} catch (error) {
  console.error('[clean-dist] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
