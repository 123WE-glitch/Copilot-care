#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const SECURITY_DIR = path.join(ROOT, 'reports', 'security');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function fail(message) {
  console.error(`[security-audit] FAIL: ${message}`);
  process.exit(1);
}

function extractJsonText(rawText) {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return rawText.slice(start, end + 1);
}

function runNpmAudit() {
  const result = spawnSync('npm audit --json', {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  const jsonText = extractJsonText(output);

  if (!jsonText) {
    fail('npm audit returned no parseable JSON payload.');
  }

  let payload;
  try {
    payload = JSON.parse(jsonText);
  } catch (error) {
    fail(`invalid npm audit JSON payload: ${error.message}`);
  }

  return {
    payload,
    exitCode: typeof result.status === 'number' ? result.status : 0,
  };
}

function getVulnerabilitySummary(payload) {
  const fallback = {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    total: 0,
  };

  const metadata = payload && payload.metadata;
  const vulnerabilities = metadata && metadata.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== 'object') {
    return fallback;
  }

  return {
    info: Number(vulnerabilities.info || 0),
    low: Number(vulnerabilities.low || 0),
    moderate: Number(vulnerabilities.moderate || 0),
    high: Number(vulnerabilities.high || 0),
    critical: Number(vulnerabilities.critical || 0),
    total: Number(vulnerabilities.total || 0),
  };
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function main() {
  const mode = process.argv[2] || 'latest';
  if (!['latest', 'baseline'].includes(mode)) {
    fail(`unsupported mode: ${mode}`);
  }

  ensureDir(SECURITY_DIR);
  const { payload, exitCode } = runNpmAudit();
  const summary = getVulnerabilitySummary(payload);

  const wrappedPayload = {
    generatedAt: nowIso(),
    mode,
    npmAuditExitCode: exitCode,
    summary,
    audit: payload,
  };

  const latestPath = path.join(SECURITY_DIR, 'npm-audit.latest.json');
  writeJson(latestPath, wrappedPayload);

  if (mode === 'baseline') {
    const baselinePath = path.join(
      SECURITY_DIR,
      `npm-audit.baseline.${todayDate()}.json`,
    );
    writeJson(baselinePath, wrappedPayload);
    console.log(
      `[security-audit] baseline saved: ${path.relative(ROOT, baselinePath)}`,
    );
  }

  console.log(`[security-audit] latest saved: ${path.relative(ROOT, latestPath)}`);
  console.log(
    `[security-audit] summary: total=${summary.total}, high=${summary.high}, critical=${summary.critical}`,
  );
}

main();
