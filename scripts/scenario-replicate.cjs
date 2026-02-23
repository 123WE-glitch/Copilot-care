const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function parseArgs(argv) {
  const parsed = {
    setId: 'site-alpha',
    repeat: 20,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--set-id') {
      const value = argv[index + 1];
      if (value) {
        parsed.setId = value.trim();
        index += 1;
      }
      continue;
    }
    if (token === '--repeat') {
      const value = Number(argv[index + 1]);
      if (Number.isFinite(value) && value > 0) {
        parsed.repeat = Math.floor(value);
      }
      index += 1;
    }
  }

  return parsed;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadBaseScenarios() {
  const modulePath = path.join(
    ROOT,
    'src',
    'backend',
    'dist',
    'scenarios',
    'fixtures',
    'af-scenarios.js',
  );
  const scenarioModule = require(modulePath);
  return scenarioModule.AF_SCENARIOS;
}

function buildReplicatedSet(baseScenarios, setId, repeat) {
  const samples = [];

  for (const scenario of baseScenarios) {
    for (let index = 1; index <= repeat; index += 1) {
      const suffix = `${setId}-r${String(index).padStart(3, '0')}`;
      const request = deepClone(scenario.request);

      if (typeof request.sessionId === 'string') {
        request.sessionId = `${request.sessionId}-${suffix}`;
      }
      if (request.profile && typeof request.profile.patientId === 'string') {
        request.profile.patientId = `${request.profile.patientId}-${suffix}`;
      }

      samples.push({
        sampleId: `${scenario.id}-${suffix}`,
        sourceScenarioId: scenario.id,
        sourceCaseCode: scenario.caseCode,
        request,
        expected: scenario.expected,
      });
    }
  }

  return samples;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseScenarios = loadBaseScenarios();
  const samples = buildReplicatedSet(baseScenarios, args.setId, args.repeat);
  const outputPath = path.join(
    ROOT,
    'reports',
    'scenarios',
    'replicated',
    `${args.setId}.json`,
  );

  const payload = {
    setId: args.setId,
    generatedAt: new Date().toISOString(),
    source: 'A-F baseline scenarios',
    repeatPerSourceScenario: args.repeat,
    sourceScenarioCount: baseScenarios.length,
    sampleCount: samples.length,
    samples,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`[replicate] setId=${args.setId}`);
  console.log(`[replicate] sourceScenarios=${baseScenarios.length}`);
  console.log(`[replicate] sampleCount=${samples.length}`);
  console.log(`[replicate] output=${path.relative(ROOT, outputPath)}`);
}

main();
