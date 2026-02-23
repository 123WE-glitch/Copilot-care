#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ALLOW_COMMENT = 'secrets-scan:allow';

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.cjs',
  '.mjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.vue',
  '.txt',
  '.env.example',
]);

const IGNORE_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'reports',
  '.opencode',
]);

const IGNORE_FILES = new Set([
  'package-lock.json',
]);

const SECRET_PATTERNS = [
  {
    label: 'OpenAI-style key',
    regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: 'Private key block',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    label: 'AWS access key',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    label: 'Google API key',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
];

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function shouldIgnoreFile(relativePath) {
  const normalized = normalizePath(relativePath);
  const baseName = path.basename(normalized);

  if (IGNORE_FILES.has(baseName)) {
    return true;
  }

  if (baseName === '.env.example') {
    return false;
  }

  if (/^\.env(\..+)?$/i.test(baseName)) {
    return true;
  }

  return false;
}

function isTextFile(relativePath) {
  const normalized = normalizePath(relativePath);
  const baseName = path.basename(normalized);
  if (baseName === '.env.example') {
    return true;
  }

  const extension = path.extname(baseName).toLowerCase();
  return TEXT_EXTENSIONS.has(extension);
}

function walkDirectory(directoryPath, relativePrefix = '') {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = relativePrefix
      ? path.join(relativePrefix, entry.name)
      : entry.name;
    const normalizedRelativePath = normalizePath(relativePath);
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRECTORIES.has(entry.name)) {
        continue;
      }
      files.push(...walkDirectory(fullPath, normalizedRelativePath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (shouldIgnoreFile(normalizedRelativePath)) {
      continue;
    }

    if (!isTextFile(normalizedRelativePath)) {
      continue;
    }

    files.push(normalizedRelativePath);
  }

  return files;
}

function maskMatch(value) {
  if (value.length <= 12) {
    return `${value.slice(0, 4)}****`;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function scanFile(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  let content = '';
  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return [];
  }

  const findings = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes(ALLOW_COMMENT)) {
      return;
    }
    for (const pattern of SECRET_PATTERNS) {
      const matches = line.match(pattern.regex);
      if (!matches) {
        continue;
      }
      for (const match of matches) {
        findings.push({
          file: relativePath,
          line: index + 1,
          label: pattern.label,
          token: maskMatch(match),
        });
      }
    }
  });

  return findings;
}

function main() {
  const files = walkDirectory(ROOT);
  const findings = [];
  for (const file of files) {
    findings.push(...scanFile(file));
  }

  if (findings.length === 0) {
    console.log('[secrets-guard] no high-risk token pattern detected.');
    return;
  }

  console.error('[secrets-guard] possible secret leaks detected:');
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.label}] ${finding.token}`,
    );
  }
  console.error(
    `[secrets-guard] if a match is intentional, append '${ALLOW_COMMENT}' to that line.`,
  );
  process.exit(1);
}

main();
