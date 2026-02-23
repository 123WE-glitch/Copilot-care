const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(process.cwd(), 'dist');
const REQUIRED_FILES = ['index.js'];
const FORBIDDEN_PATHS = ['backend', 'tests'];

function fail(message) {
  console.error(`[dist-hygiene] FAIL: ${message}`);
  process.exit(1);
}

function ensureDistExists() {
  if (!fs.existsSync(DIST_DIR)) {
    fail('dist directory not found. Build step may have failed.');
  }
}

function ensureRequiredFiles() {
  for (const file of REQUIRED_FILES) {
    const fullPath = path.join(DIST_DIR, file);
    if (!fs.existsSync(fullPath)) {
      fail(`required build artifact missing: dist/${file}`);
    }
  }
}

function ensureForbiddenPathsAbsent() {
  for (const relativePath of FORBIDDEN_PATHS) {
    const fullPath = path.join(DIST_DIR, relativePath);
    if (fs.existsSync(fullPath)) {
      fail(`forbidden artifact detected: dist/${relativePath}`);
    }
  }
}

ensureDistExists();
ensureRequiredFiles();
ensureForbiddenPathsAbsent();
console.log('[dist-hygiene] PASS');
