#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..', '..');
const DIST_DIR = path.join(FRONTEND_ROOT, 'dist');
const MANIFEST_PATH_CANDIDATES = [
  path.join(DIST_DIR, 'manifest.json'),
  path.join(DIST_DIR, '.vite', 'manifest.json'),
];
const METRICS_DIR = path.join(REPO_ROOT, 'reports', 'metrics');
const LATEST_REPORT_PATH = path.join(
  METRICS_DIR,
  'frontend-build-budget.latest.json',
);
const BASELINE_REPORT_PATH = path.join(
  METRICS_DIR,
  'frontend-build-budget.baseline.json',
);

const BUDGET = {
  totalJsMaxBytes: 2_600_000,
  totalCssMaxBytes: 150_000,
  consultationChunkMaxBytes: 120_000,
  largestChunkMaxBytes: 500_000,
};

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    writeBaseline: args.has('--write-baseline'),
  };
}

function readJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function normalizeAssetPath(assetPath) {
  return assetPath.replace(/^\/+/, '').replace(/\\/g, '/');
}

function toDistAssetPath(assetPath) {
  return path.join(DIST_DIR, normalizeAssetPath(assetPath));
}

function resolveManifestPath() {
  return MANIFEST_PATH_CANDIDATES.find((candidatePath) =>
    fs.existsSync(candidatePath),
  );
}

function collectManifestAssets() {
  const manifestPath = resolveManifestPath();
  if (!manifestPath) {
    throw new Error(
      'Vite manifest not found. Run `npm run build --workspace=@copilot-care/frontend` first.',
    );
  }

  const manifest = readJson(manifestPath);
  const manifestKeys = Object.keys(manifest);
  if (manifestKeys.length === 0) {
    throw new Error('Vite manifest is empty.');
  }

  const seedEntryKeys = manifestKeys.filter((entryKey) => {
    const entry = manifest[entryKey];
    return Boolean(entry && (entry.isEntry || entryKey === 'index.html'));
  });
  const entryQueue = seedEntryKeys.length > 0 ? [...seedEntryKeys] : [...manifestKeys];
  const visitedEntryKeys = new Set();
  const assetPaths = new Set();

  while (entryQueue.length > 0) {
    const currentKey = entryQueue.pop();
    if (!currentKey || visitedEntryKeys.has(currentKey)) {
      continue;
    }
    visitedEntryKeys.add(currentKey);

    const entry = manifest[currentKey];
    if (!entry) {
      continue;
    }

    if (typeof entry.file === 'string') {
      assetPaths.add(normalizeAssetPath(entry.file));
    }
    for (const cssPath of entry.css || []) {
      assetPaths.add(normalizeAssetPath(cssPath));
    }
    for (const staticAssetPath of entry.assets || []) {
      assetPaths.add(normalizeAssetPath(staticAssetPath));
    }
    for (const importedKey of entry.imports || []) {
      entryQueue.push(importedKey);
    }
    for (const importedKey of entry.dynamicImports || []) {
      entryQueue.push(importedKey);
    }
  }

  if (assetPaths.size === 0) {
    throw new Error('No build assets were resolved from manifest entries.');
  }

  return {
    manifestPath,
    manifest,
    assets: Array.from(assetPaths.values()),
  };
}

function resolveConsultationChunkPath(manifest) {
  const manifestEntries = Object.entries(manifest);
  const findEntry = (predicate) => manifestEntries.find(([entryKey, entry]) => {
    if (!entry || typeof entry.file !== 'string') {
      return false;
    }
    if (path.extname(entry.file).toLowerCase() !== '.js') {
      return false;
    }
    return predicate(entryKey, entry);
  });

  const matchedEntry =
    findEntry((_, entry) => {
      const entrySrc = typeof entry.src === 'string' ? entry.src : '';
      return entrySrc.includes('ConsultationView.vue');
    }) ||
    findEntry((entryKey, entry) =>
      entryKey.includes('ConsultationView') || entry.file.includes('ConsultationView'),
    );

  if (!matchedEntry) {
    return null;
  }
  return normalizeAssetPath(matchedEntry[1].file);
}

function collectMetrics() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist directory not found. Run frontend build first.');
  }

  const {
    manifestPath,
    manifest,
    assets: manifestAssets,
  } = collectManifestAssets();
  const assets = manifestAssets.map((assetPath) => {
    const distAssetPath = toDistAssetPath(assetPath);
    if (!fs.existsSync(distAssetPath)) {
      throw new Error(`Manifest references missing asset: ${assetPath}`);
    }
    const stat = fs.statSync(distAssetPath);
    const ext = path.extname(assetPath).toLowerCase();
    return {
      path: `dist/${assetPath}`,
      ext,
      bytes: stat.size,
    };
  }).sort((left, right) => left.path.localeCompare(right.path));

  const jsAssets = assets.filter((item) => item.ext === '.js');
  const cssAssets = assets.filter((item) => item.ext === '.css');
  const largestAsset = assets.reduce((max, item) => {
    if (!max || item.bytes > max.bytes) {
      return item;
    }
    return max;
  }, null);
  const consultationChunkAssetPath = resolveConsultationChunkPath(manifest);
  const consultationChunk = consultationChunkAssetPath
    ? jsAssets.find((item) => item.path === `dist/${consultationChunkAssetPath}`) || null
    : null;

  const metrics = {
    generatedAt: new Date().toISOString(),
    budget: BUDGET,
    source: {
      distDir: path.relative(REPO_ROOT, DIST_DIR).replace(/\\/g, '/'),
      manifestPath: path.relative(REPO_ROOT, manifestPath).replace(/\\/g, '/'),
      measuredBy: 'vite-manifest-entry-graph',
    },
    summary: {
      totalAssets: assets.length,
      totalJsBytes: jsAssets.reduce((sum, item) => sum + item.bytes, 0),
      totalCssBytes: cssAssets.reduce((sum, item) => sum + item.bytes, 0),
      largestAssetPath: largestAsset ? largestAsset.path : null,
      largestAssetBytes: largestAsset ? largestAsset.bytes : 0,
      consultationChunkPath: consultationChunk ? consultationChunk.path : null,
      consultationChunkBytes: consultationChunk ? consultationChunk.bytes : 0,
    },
    assets,
  };

  return metrics;
}

function ensureMetricsDir() {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function evaluateBudget(metrics) {
  const summary = metrics.summary;
  const violations = [];

  if (summary.totalJsBytes > BUDGET.totalJsMaxBytes) {
    violations.push(
      `total JS ${summary.totalJsBytes} exceeds budget ${BUDGET.totalJsMaxBytes}`,
    );
  }
  if (summary.totalCssBytes > BUDGET.totalCssMaxBytes) {
    violations.push(
      `total CSS ${summary.totalCssBytes} exceeds budget ${BUDGET.totalCssMaxBytes}`,
    );
  }
  if (!summary.consultationChunkPath) {
    violations.push('Consultation chunk missing in manifest graph');
  }
  if (summary.consultationChunkBytes > BUDGET.consultationChunkMaxBytes) {
    violations.push(
      `Consultation chunk ${summary.consultationChunkBytes} exceeds budget ${BUDGET.consultationChunkMaxBytes}`,
    );
  }
  if (summary.largestAssetBytes > BUDGET.largestChunkMaxBytes) {
    violations.push(
      `largest asset ${summary.largestAssetBytes} exceeds budget ${BUDGET.largestChunkMaxBytes}`,
    );
  }

  return violations;
}

function main() {
  const { writeBaseline } = parseArgs();
  const metrics = collectMetrics();
  const violations = evaluateBudget(metrics);

  ensureMetricsDir();
  writeJson(LATEST_REPORT_PATH, metrics);
  if (writeBaseline) {
    writeJson(BASELINE_REPORT_PATH, metrics);
  }

  console.log('[build-budget] latest report:', path.relative(REPO_ROOT, LATEST_REPORT_PATH));
  if (writeBaseline) {
    console.log(
      '[build-budget] baseline report:',
      path.relative(REPO_ROOT, BASELINE_REPORT_PATH),
    );
  }
  console.log(
    `[build-budget] JS=${metrics.summary.totalJsBytes} CSS=${metrics.summary.totalCssBytes} Consultation=${metrics.summary.consultationChunkBytes}`,
  );

  if (violations.length > 0) {
    console.error('[build-budget] budget violations:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log('[build-budget] budgets satisfied.');
}

main();
