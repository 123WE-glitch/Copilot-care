#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKEND_SRC_ROOT = path.join(ROOT, 'src', 'backend', 'src');

const RULES = [
  {
    scopePrefix: 'application/',
    forbiddenSegments: ['interfaces', 'infrastructure'],
    message:
      'application layer must not depend on interfaces/infrastructure layers',
  },
  {
    scopePrefix: 'core/',
    forbiddenSegments: ['interfaces', 'infrastructure'],
    message:
      'core layer must not depend on interfaces/infrastructure layers',
  },
  {
    scopePrefix: 'agents/',
    forbiddenSegments: ['interfaces', 'infrastructure'],
    message:
      'agents layer must not depend on interfaces/infrastructure layers',
  },
];

const IMPORT_REGEX =
  /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;

function toPosixPath(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

function collectTsFiles(dirPath) {
  const result = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectTsFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.ts')) {
      continue;
    }

    const posixPath = toPosixPath(fullPath);
    if (
      posixPath.includes('/tests/') ||
      posixPath.includes('/__tests__/') ||
      posixPath.endsWith('.test.ts')
    ) {
      continue;
    }

    result.push(fullPath);
  }

  return result;
}

function extractImportSpecifiers(sourceText) {
  const imports = [];
  let match = IMPORT_REGEX.exec(sourceText);
  while (match) {
    imports.push(match[1]);
    match = IMPORT_REGEX.exec(sourceText);
  }
  return imports;
}

function resolveRelativeImport(filePath, importPath) {
  const baseDir = path.dirname(filePath);
  const resolved = path.resolve(baseDir, importPath);
  return toPosixPath(resolved);
}

function segmentPath(segmentName) {
  return `/src/backend/src/${segmentName}/`;
}

function matchesForbiddenSegment(filePath, importPath, segmentName) {
  if (importPath.startsWith('.')) {
    const resolvedPath = resolveRelativeImport(filePath, importPath);
    return resolvedPath.includes(segmentPath(segmentName));
  }

  const normalized = toPosixPath(importPath);
  return (
    normalized.includes(`/${segmentName}/`) ||
    normalized.startsWith(`${segmentName}/`)
  );
}

function isCrossPackageRelativeSharedImport(filePath, importPath) {
  if (!importPath.startsWith('.')) {
    return false;
  }

  const resolvedPath = resolveRelativeImport(filePath, importPath);
  return resolvedPath.includes('/src/shared/');
}

function main() {
  if (!fs.existsSync(BACKEND_SRC_ROOT)) {
    console.error(
      `[import-boundary] FAIL: backend source root not found: ${toPosixPath(
        BACKEND_SRC_ROOT,
      )}`,
    );
    process.exit(1);
  }

  const files = collectTsFiles(BACKEND_SRC_ROOT);
  const violations = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = extractImportSpecifiers(content);
    const relativePath = toPosixPath(path.relative(BACKEND_SRC_ROOT, filePath));

    for (const importPath of imports) {
      if (isCrossPackageRelativeSharedImport(filePath, importPath)) {
        violations.push({
          file: relativePath,
          importPath,
          reason:
            'cross-package relative import to shared is forbidden, use @copilot-care/shared/types',
        });
      }

      for (const rule of RULES) {
        if (!relativePath.startsWith(rule.scopePrefix)) {
          continue;
        }

        for (const segmentName of rule.forbiddenSegments) {
          if (matchesForbiddenSegment(filePath, importPath, segmentName)) {
            violations.push({
              file: relativePath,
              importPath,
              reason: rule.message,
            });
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('[import-boundary] FAIL: forbidden imports detected:');
    for (const violation of violations) {
      console.error(
        `- ${violation.file} -> ${violation.importPath} (${violation.reason})`,
      );
    }
    process.exit(1);
  }

  console.log(
    `[import-boundary] PASS: scanned ${files.length} files with 0 boundary violations.`,
  );
}

main();
