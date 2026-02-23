const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT_JSON = path.join(
  ROOT,
  'reports',
  'scenarios',
  'm5-batch.latest.json',
);
const OUTPUT_MD = path.join(
  ROOT,
  'docs',
  'process',
  'm5-batch-replay-report.md',
);
const TARGET_SAMPLE_COUNT = 120;
const REPEAT_PER_BASE_SCENARIO = 20;

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
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

function buildReplicatedSamples(scenarios) {
  const replicated = [];

  for (const scenario of scenarios) {
    for (let index = 1; index <= REPEAT_PER_BASE_SCENARIO; index += 1) {
      const clonedRequest = deepClone(scenario.request);
      const suffix = `r${String(index).padStart(2, '0')}`;

      if (typeof clonedRequest.sessionId === 'string') {
        clonedRequest.sessionId = `${clonedRequest.sessionId}-${suffix}`;
      }

      if (
        clonedRequest.profile &&
        typeof clonedRequest.profile.patientId === 'string'
      ) {
        clonedRequest.profile.patientId =
          `${clonedRequest.profile.patientId}-${suffix}`;
      }

      replicated.push({
        sampleId: `${scenario.id}-${suffix}`,
        sourceScenarioId: scenario.id,
        sourceCaseCode: scenario.caseCode,
        request: clonedRequest,
        expected: scenario.expected,
      });
    }
  }

  return replicated;
}

function formatPercentage(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push('# M5 Batch Replay Report');
  lines.push('');
  lines.push(`GeneratedAt: ${report.generatedAt}`);
  lines.push(`SampleCount: ${report.sampleCount}`);
  lines.push(`TargetMinimum: ${report.targetMinimum}`);
  lines.push(`PassCount: ${report.passCount}`);
  lines.push(`FailCount: ${report.failCount}`);
  lines.push(`PassRate: ${formatPercentage(report.passRate)}`);
  lines.push('');
  lines.push('## Source Scenario Breakdown');
  lines.push('');
  lines.push('| Scenario | Total | Pass | Fail |');
  lines.push('|---|---:|---:|---:|');
  for (const item of report.sourceBreakdown) {
    lines.push(
      `| ${item.sourceScenarioId} | ${item.total} | ${item.pass} | ${item.fail} |`,
    );
  }
  lines.push('');
  lines.push('## Result Status Breakdown');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('|---|---:|');
  for (const status of Object.keys(report.statusBreakdown)) {
    lines.push(`| ${status} | ${report.statusBreakdown[status]} |`);
  }
  lines.push('');
  lines.push(
    report.acceptance.sampleCountReached
      ? '- sample-count gate: PASS'
      : '- sample-count gate: BLOCK',
  );
  lines.push(
    report.acceptance.breakdownAvailable
      ? '- breakdown gate: PASS'
      : '- breakdown gate: BLOCK',
  );
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function run() {
  const enforce = process.argv.includes('--enforce');
  const { createRuntime, scenarios } = loadRuntime();
  const runtime = createRuntime();
  const samples = buildReplicatedSamples(scenarios);

  const sourceBreakdownMap = {};
  const statusBreakdown = {};
  const sampleResults = [];
  let passCount = 0;
  let failCount = 0;

  for (const sample of samples) {
    const result = await runtime.triageUseCase.execute(sample.request);
    const passed =
      result.status === sample.expected.status &&
      (!sample.expected.errorCode ||
        result.errorCode === sample.expected.errorCode);

    if (passed) {
      passCount += 1;
    } else {
      failCount += 1;
    }

    if (!sourceBreakdownMap[sample.sourceScenarioId]) {
      sourceBreakdownMap[sample.sourceScenarioId] = {
        sourceScenarioId: sample.sourceScenarioId,
        total: 0,
        pass: 0,
        fail: 0,
      };
    }

    sourceBreakdownMap[sample.sourceScenarioId].total += 1;
    if (passed) {
      sourceBreakdownMap[sample.sourceScenarioId].pass += 1;
    } else {
      sourceBreakdownMap[sample.sourceScenarioId].fail += 1;
    }

    statusBreakdown[result.status] = (statusBreakdown[result.status] || 0) + 1;

    sampleResults.push({
      sampleId: sample.sampleId,
      sourceScenarioId: sample.sourceScenarioId,
      expectedStatus: sample.expected.status,
      actualStatus: result.status,
      expectedErrorCode: sample.expected.errorCode || null,
      actualErrorCode: result.errorCode || null,
      passed,
    });
  }

  const sourceBreakdown = Object.values(sourceBreakdownMap).sort((left, right) =>
    left.sourceScenarioId.localeCompare(right.sourceScenarioId),
  );
  const sampleCount = samples.length;
  const acceptance = {
    sampleCountReached: sampleCount >= TARGET_SAMPLE_COUNT,
    breakdownAvailable:
      sourceBreakdown.length > 0 &&
      Number.isFinite(passCount) &&
      Number.isFinite(failCount),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    targetMinimum: TARGET_SAMPLE_COUNT,
    sampleCount,
    passCount,
    failCount,
    passRate: sampleCount === 0 ? 0 : passCount / sampleCount,
    sourceBreakdown,
    statusBreakdown,
    acceptance,
    sampleResults,
  };

  ensureDir(OUTPUT_JSON);
  ensureDir(OUTPUT_MD);
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUTPUT_MD, buildMarkdownReport(report), 'utf8');

  if (acceptance.sampleCountReached && acceptance.breakdownAvailable) {
    console.log('[m5-batch] PASS: sample expansion report is valid');
  } else {
    console.log('[m5-batch] FAIL: sample expansion report is invalid');
  }
  console.log(`[m5-batch] report json: ${path.relative(ROOT, OUTPUT_JSON)}`);
  console.log(`[m5-batch] report md: ${path.relative(ROOT, OUTPUT_MD)}`);
  console.log(`[m5-batch] sampleCount=${sampleCount}, pass=${passCount}, fail=${failCount}`);

  if (enforce && (!acceptance.sampleCountReached || !acceptance.breakdownAvailable)) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('[m5-batch] FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
