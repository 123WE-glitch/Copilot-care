const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPLICATED_DIR = path.join(ROOT, 'reports', 'scenarios', 'replicated');
const OUTPUT_PATH = path.join(ROOT, 'reports', 'metrics', 'performance-profile.latest.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function measureMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
    rssMB: Math.round(usage.rss / 1024 / 1024),
    externalMB: Math.round(usage.external / 1024 / 1024),
  };
}

function measureScenarioLoadTime(filePath) {
  const start = process.hrtime.bigint();
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  const end = process.hrtime.bigint();
  
  const loadTimeNs = Number(end - start);
  const loadTimeMs = loadTimeNs / 1_000_000;
  
  return {
    filePath: path.relative(ROOT, filePath),
    fileSizeKB: Math.round(Buffer.byteLength(content, 'utf8') / 1024),
    sampleCount: data.sampleCount || 0,
    loadTimeMs: Math.round(loadTimeMs * 100) / 100,
  };
}

function measureJsonParsePerformance(filePath, iterations = 10) {
  const content = fs.readFileSync(filePath, 'utf8');
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    JSON.parse(content);
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000);
  }
  
  return {
    minMs: Math.round(Math.min(...times) * 100) / 100,
    maxMs: Math.round(Math.max(...times) * 100) / 100,
    avgMs: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100,
    p95Ms: Math.round(times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] * 100) / 100,
  };
}

function measureFileReadPerformance(filePath, iterations = 10) {
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fs.readFileSync(filePath, 'utf8');
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000);
  }
  
  return {
    minMs: Math.round(Math.min(...times) * 100) / 100,
    maxMs: Math.round(Math.max(...times) * 100) / 100,
    avgMs: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100,
  };
}

function main() {
  console.log('[perf-profile] Starting performance profiling...\n');
  
  const startTime = Date.now();
  const memoryBefore = measureMemoryUsage();
  
  const siteFiles = fs.readdirSync(REPLICATED_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(REPLICATED_DIR, f));
  
  if (siteFiles.length === 0) {
    console.error('[perf-profile] No replicated scenario files found');
    process.exit(1);
  }
  
  console.log(`[perf-profile] Found ${siteFiles.length} site files\n`);
  
  const loadMetrics = [];
  const parseMetrics = [];
  const readMetrics = [];
  
  for (const file of siteFiles) {
    console.log(`[perf-profile] Profiling ${path.basename(file)}...`);
    
    // Load metrics
    const loadMetric = measureScenarioLoadTime(file);
    loadMetrics.push(loadMetric);
    console.log(`  Load time: ${loadMetric.loadTimeMs}ms (${loadMetric.sampleCount} samples)`);
    
    // Parse performance
    const parseMetric = measureJsonParsePerformance(file);
    parseMetrics.push({
      file: path.basename(file),
      ...parseMetric,
    });
    console.log(`  Parse avg: ${parseMetric.avgMs}ms (p95: ${parseMetric.p95Ms}ms)`);
    
    // Read performance
    const readMetric = measureFileReadPerformance(file);
    readMetrics.push({
      file: path.basename(file),
      ...readMetric,
    });
    console.log(`  Read avg: ${readMetric.avgMs}ms\n`);
  }
  
  const memoryAfter = measureMemoryUsage();
  const totalTime = Date.now() - startTime;
  
  const totalSamples = loadMetrics.reduce((sum, m) => sum + m.sampleCount, 0);
  const totalFileSize = loadMetrics.reduce((sum, m) => sum + m.fileSizeKB, 0);
  
  const report = {
    profiledAt: new Date().toISOString(),
    totalProfileTimeMs: totalTime,
    memory: {
      before: memoryBefore,
      after: memoryAfter,
      delta: {
        heapUsedMB: memoryAfter.heapUsedMB - memoryBefore.heapUsedMB,
        rssMB: memoryAfter.rssMB - memoryBefore.rssMB,
      },
    },
    summary: {
      siteCount: siteFiles.length,
      totalSamples,
      totalFileSizeKB: totalFileSize,
      avgLoadTimeMs: Math.round((loadMetrics.reduce((sum, m) => sum + m.loadTimeMs, 0) / loadMetrics.length) * 100) / 100,
      avgParseTimeMs: Math.round((parseMetrics.reduce((sum, m) => sum + m.avgMs, 0) / parseMetrics.length) * 100) / 100,
    },
    loadMetrics,
    parseMetrics,
    readMetrics,
    thresholds: {
      maxLoadTimeMs: 100,
      maxParseTimeMs: 50,
      maxMemoryDeltaMB: 100,
    },
    passed: true,
  };
  
  // Check thresholds
  if (report.summary.avgLoadTimeMs > report.thresholds.maxLoadTimeMs) {
    report.passed = false;
    console.log(`[perf-profile] WARN: Avg load time ${report.summary.avgLoadTimeMs}ms exceeds threshold ${report.thresholds.maxLoadTimeMs}ms`);
  }
  
  if (report.summary.avgParseTimeMs > report.thresholds.maxParseTimeMs) {
    report.passed = false;
    console.log(`[perf-profile] WARN: Avg parse time ${report.summary.avgParseTimeMs}ms exceeds threshold ${report.thresholds.maxParseTimeMs}ms`);
  }
  
  if (report.memory.delta.heapUsedMB > report.thresholds.maxMemoryDeltaMB) {
    report.passed = false;
    console.log(`[perf-profile] WARN: Memory delta ${report.memory.delta.heapUsedMB}MB exceeds threshold ${report.thresholds.maxMemoryDeltaMB}MB`);
  }
  
  ensureDir(OUTPUT_PATH);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  
  console.log('[perf-profile] Summary:');
  console.log(`  Total sites: ${report.summary.siteCount}`);
  console.log(`  Total samples: ${report.summary.totalSamples}`);
  console.log(`  Total file size: ${report.summary.totalFileSizeKB}KB`);
  console.log(`  Avg load time: ${report.summary.avgLoadTimeMs}ms`);
  console.log(`  Avg parse time: ${report.summary.avgParseTimeMs}ms`);
  console.log(`  Memory delta: ${report.memory.delta.heapUsedMB}MB`);
  console.log(`  Status: ${report.passed ? 'PASS' : 'WARN'}`);
  console.log(`\n[perf-profile] Output: ${path.relative(ROOT, OUTPUT_PATH)}`);
  
  process.exit(report.passed ? 0 : 1);
}

main();
