const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const ROOT = process.cwd();
const OUTPUT_JSON = path.join(ROOT, 'reports', 'metrics', 'm3.latest.json');
const OUTPUT_MD = path.join(ROOT, 'docs', 'process', 'm3-metrics-report.md');

const DEFAULT_THRESHOLDS = {
  highRiskRecallMin: 0.9,
  explainabilityRateMin: 0.95,
  averageLatencyMsMax: 120000,
  auditCoverageRateMin: 1,
  invalidInputInterceptRateMin: 1,
  scenarioPassRateMin: 0.9,
};

const SCENARIO_TRUTH = {
  'T-001': { highRiskTruth: false, invalidInputTruth: false },
  'T-002': { highRiskTruth: true, invalidInputTruth: false },
  'T-003': { highRiskTruth: false, invalidInputTruth: true },
  'T-004': { highRiskTruth: true, invalidInputTruth: false },
  'T-005': { highRiskTruth: false, invalidInputTruth: false },
  'T-006': { highRiskTruth: true, invalidInputTruth: false },
};

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadThresholds() {
  const raw = process.env.COPILOT_CARE_M3_THRESHOLDS;
  if (!raw) {
    return DEFAULT_THRESHOLDS;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `invalid COPILOT_CARE_M3_THRESHOLDS json: ${error.message}`,
    );
  }

  const merged = { ...DEFAULT_THRESHOLDS };
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in merged)) {
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`invalid threshold value for ${key}`);
    }
    merged[key] = value;
  }

  return merged;
}

function normalizePercentage(value) {
  return Number((value * 100).toFixed(2));
}

function safeDivide(numerator, denominator) {
  if (denominator === 0) {
    return 1;
  }
  return numerator / denominator;
}

function isHighRiskPrediction(result) {
  if (result.status === 'ESCALATE_TO_OFFLINE') {
    return true;
  }
  const riskLevel = result.finalConsensus && result.finalConsensus.riskLevel;
  return riskLevel === 'L2' || riskLevel === 'L3';
}

function hasExplainability(result) {
  if (result.status === 'OUTPUT' && result.finalConsensus) {
    const reasoning =
      typeof result.finalConsensus.reasoning === 'string'
        ? result.finalConsensus.reasoning.trim()
        : '';
    const citations = Array.isArray(result.finalConsensus.citations)
      ? result.finalConsensus.citations
      : [];
    const actions = Array.isArray(result.finalConsensus.actions)
      ? result.finalConsensus.actions
      : [];

    return Boolean(reasoning) && citations.length > 0 && actions.length > 0;
  }

  return Array.isArray(result.notes) && result.notes.length > 0;
}

function hasAuditCoverage(result) {
  return Array.isArray(result.auditTrail) && result.auditTrail.length > 0;
}

function hasInvalidInputInterception(result) {
  return result.status === 'ERROR' && result.errorCode === 'ERR_MISSING_REQUIRED_DATA';
}

function calculateDeviation(metricName, actual, threshold) {
  if (metricName === 'averageLatencyMs') {
    return Number((actual - threshold).toFixed(2));
  }
  return Number((actual - threshold).toFixed(4));
}

function recommendedAction(metricName, pass) {
  if (pass) {
    return 'maintain current baseline and continue monitoring';
  }

  if (metricName === 'highRiskRecall') {
    return 'tighten red-flag routing and risk-level mapping before release';
  }
  if (metricName === 'explainabilityRate') {
    return 'enforce conclusion + evidence + action output schema in arbitration layer';
  }
  if (metricName === 'averageLatencyMs') {
    return 'optimize orchestration path and reduce retries in constrained environments';
  }
  if (metricName === 'auditCoverageRate') {
    return 'block release and patch missing audit events immediately';
  }
  if (metricName === 'invalidInputInterceptRate') {
    return 'strengthen interface validation and required-field checks';
  }
  return 'investigate failed threshold and create remediation patch';
}

function toMetricRecord(metricName, actual, threshold, pass) {
  return {
    metricName,
    targetValue: threshold,
    actualValue: actual,
    deviation: calculateDeviation(metricName, actual, threshold),
    pass,
    correctiveAction: recommendedAction(metricName, pass),
  };
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push('# M3 Metrics Report');
  lines.push('');
  lines.push(`GeneratedAt: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- overallPass: ${report.overallPass}`);
  lines.push(`- scenarioCount: ${report.scenarioCount}`);
  lines.push(`- scenarioPassRate: ${normalizePercentage(report.metrics.scenarioPassRate)}%`);
  lines.push('');
  lines.push('## Metric Ledger (target / actual / deviation / action)');
  lines.push('');
  lines.push('| Metric | Target | Actual | Deviation | Pass | Action |');
  lines.push('|---|---:|---:|---:|:---:|---|');

  for (const record of report.metricLedger) {
    lines.push(
      `| ${record.metricName} | ${record.targetValue} | ${record.actualValue} | ${record.deviation} | ${record.pass ? 'Y' : 'N'} | ${record.correctiveAction} |`,
    );
  }

  lines.push('');
  lines.push('## Scenario Snapshot');
  lines.push('');
  lines.push('| Scenario | Status | ErrorCode | LatencyMs | Explainable | Audit |');
  lines.push('|---|---|---|---:|:---:|:---:|');
  for (const scenario of report.scenarioResults) {
    lines.push(
      `| ${scenario.id} | ${scenario.status} | ${scenario.errorCode || '-'} | ${scenario.latencyMs} | ${scenario.explainable ? 'Y' : 'N'} | ${scenario.auditCovered ? 'Y' : 'N'} |`,
    );
  }

  lines.push('');
  lines.push('## Acceptance Decision');
  lines.push('');
  lines.push(
    report.overallPass
      ? '- PASS: all M3 threshold gates are satisfied.'
      : '- BLOCK: at least one M3 threshold gate failed.',
  );
  if (!report.overallPass && report.breachedMetrics.length > 0) {
    lines.push('- Breached indicators:');
    for (const item of report.breachedMetrics) {
      lines.push(`  - ${item}`);
    }
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function loadRuntime() {
  const runtimeModule = require(path.join(
    ROOT,
    'src',
    'backend',
    'dist',
    'bootstrap',
    'createRuntime.js',
  ));
  const scenarioModule = require(path.join(
    ROOT,
    'src',
    'backend',
    'dist',
    'scenarios',
    'fixtures',
    'af-scenarios.js',
  ));

  return {
    createRuntime: runtimeModule.createRuntime,
    scenarios: scenarioModule.AF_SCENARIOS,
  };
}

function formatBreach(record) {
  if (record.metricName === 'averageLatencyMs') {
    return `${record.metricName} actual=${record.actualValue} exceeds max=${record.targetValue}`;
  }
  return `${record.metricName} actual=${record.actualValue} below min=${record.targetValue}`;
}

async function run() {
  const enforce = process.argv.includes('--enforce');
  const thresholds = loadThresholds();
  const { createRuntime, scenarios } = loadRuntime();
  const runtime = createRuntime();

  const scenarioResults = [];
  let highRiskTotal = 0;
  let highRiskDetected = 0;
  let explainableCount = 0;
  let auditCoveredCount = 0;
  let invalidInputTotal = 0;
  let invalidInputIntercepted = 0;
  let scenarioPassCount = 0;
  let totalLatencyMs = 0;

  for (const scenario of scenarios) {
    const begin = performance.now();
    const result = await runtime.triageUseCase.execute(scenario.request);
    const latencyMs = Number((performance.now() - begin).toFixed(2));
    totalLatencyMs += latencyMs;

    const truth = SCENARIO_TRUTH[scenario.id] || {
      highRiskTruth: false,
      invalidInputTruth: false,
    };

    const highRiskPredicted = isHighRiskPrediction(result);
    if (truth.highRiskTruth) {
      highRiskTotal += 1;
      if (highRiskPredicted) {
        highRiskDetected += 1;
      }
    }

    const explainable = hasExplainability(result);
    if (explainable) {
      explainableCount += 1;
    }

    const auditCovered = hasAuditCoverage(result);
    if (auditCovered) {
      auditCoveredCount += 1;
    }

    if (truth.invalidInputTruth) {
      invalidInputTotal += 1;
      if (hasInvalidInputInterception(result)) {
        invalidInputIntercepted += 1;
      }
    }

    const scenarioPass =
      result.status === scenario.expected.status &&
      (!scenario.expected.errorCode || result.errorCode === scenario.expected.errorCode);
    if (scenarioPass) {
      scenarioPassCount += 1;
    }

    scenarioResults.push({
      id: scenario.id,
      caseCode: scenario.caseCode,
      status: result.status,
      errorCode: result.errorCode,
      latencyMs,
      explainable,
      auditCovered,
      highRiskTruth: truth.highRiskTruth,
      highRiskPredicted,
      scenarioPass,
    });
  }

  const scenarioCount = scenarioResults.length;
  const metrics = {
    highRiskRecall: safeDivide(highRiskDetected, highRiskTotal),
    explainabilityRate: safeDivide(explainableCount, scenarioCount),
    averageLatencyMs: Number((totalLatencyMs / Math.max(1, scenarioCount)).toFixed(2)),
    auditCoverageRate: safeDivide(auditCoveredCount, scenarioCount),
    invalidInputInterceptRate: safeDivide(invalidInputIntercepted, invalidInputTotal),
    scenarioPassRate: safeDivide(scenarioPassCount, scenarioCount),
  };

  const metricLedger = [
    toMetricRecord(
      'highRiskRecall',
      Number(metrics.highRiskRecall.toFixed(4)),
      thresholds.highRiskRecallMin,
      metrics.highRiskRecall >= thresholds.highRiskRecallMin,
    ),
    toMetricRecord(
      'explainabilityRate',
      Number(metrics.explainabilityRate.toFixed(4)),
      thresholds.explainabilityRateMin,
      metrics.explainabilityRate >= thresholds.explainabilityRateMin,
    ),
    toMetricRecord(
      'averageLatencyMs',
      metrics.averageLatencyMs,
      thresholds.averageLatencyMsMax,
      metrics.averageLatencyMs <= thresholds.averageLatencyMsMax,
    ),
    toMetricRecord(
      'auditCoverageRate',
      Number(metrics.auditCoverageRate.toFixed(4)),
      thresholds.auditCoverageRateMin,
      metrics.auditCoverageRate >= thresholds.auditCoverageRateMin,
    ),
    toMetricRecord(
      'invalidInputInterceptRate',
      Number(metrics.invalidInputInterceptRate.toFixed(4)),
      thresholds.invalidInputInterceptRateMin,
      metrics.invalidInputInterceptRate >= thresholds.invalidInputInterceptRateMin,
    ),
    toMetricRecord(
      'scenarioPassRate',
      Number(metrics.scenarioPassRate.toFixed(4)),
      thresholds.scenarioPassRateMin,
      metrics.scenarioPassRate >= thresholds.scenarioPassRateMin,
    ),
  ];

  const breachedMetrics = metricLedger
    .filter((item) => !item.pass)
    .map((item) => formatBreach(item));
  const overallPass = metricLedger.every((item) => item.pass);

  const report = {
    generatedAt: new Date().toISOString(),
    planVersion: 'v4.30',
    source: 'A-F scenarios + runtime replay',
    thresholds,
    scenarioCount,
    metrics,
    metricLedger,
    breachedMetrics,
    scenarioResults,
    overallPass,
  };

  ensureDir(OUTPUT_JSON);
  ensureDir(OUTPUT_MD);
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUTPUT_MD, buildMarkdownReport(report), 'utf8');

  if (overallPass) {
    console.log('[metrics] PASS: M3 metrics thresholds satisfied');
  } else {
    console.log('[metrics] FAIL: M3 metrics thresholds not satisfied');
    if (breachedMetrics.length > 0) {
      console.log(`[metrics] breached indicators: ${breachedMetrics.join('; ')}`);
    }
  }
  console.log(`[metrics] report json: ${path.relative(ROOT, OUTPUT_JSON)}`);
  console.log(`[metrics] report md: ${path.relative(ROOT, OUTPUT_MD)}`);

  if (enforce && !overallPass) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('[metrics] FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
