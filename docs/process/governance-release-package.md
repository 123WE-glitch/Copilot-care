# Governance Release Package (M4)

## Goal

Before pilot release, enforce a single package that links:

- gate results,
- ADR status,
- audit evidence,
- reviewer pass/block decision.

## Required Artifacts

1. Gate evidence
- `typecheck` output
- `guard:imports` output
- `gate:safety` output
- `gate:workflow` output
- `gate:scenarios` output
- `gate:metrics` output
- `security:baseline` output
- `gate:release` output
- `devwf:full` output

2. ADR evidence
- ADR trigger check result
- required ADR file paths under `docs/adr/`

3. Audit evidence
- A-F replay evidence:
  - `src/backend/src/tests/scenarios/af-scenario-replay.test.ts`
- T-007~T-010 governance evidence:
  - `src/backend/src/tests/scenarios/enhanced-governance-replay.test.ts`
- metrics report:
  - `reports/metrics/m3.latest.json`
  - `docs/process/m3-metrics-report.md`
  - `reports/metrics/target-actual-ledger.latest.json`
  - `docs/process/metric-ledger.md`

4. Governance evidence
- risk-trigger matrix:
  - `docs/process/risk-trigger-matrix.md`
- stop-loss and rollback runbook:
  - `docs/process/stop-loss-rollback-runbook.md`
- pilot runbook and role matrix:
  - `docs/process/pilot-runbook-role-matrix.md`

## Reviewer Block Logic

Reviewer decision must be `BLOCK` if any of the following is true:

- any required gate fails,
- ADR trigger is hit but ADR evidence is missing,
- required audit evidence path is missing,
- risk-trigger / stop-loss evidence is missing.

When `BLOCK` is returned:

- `failedGateIds` must list gate IDs or evidence IDs,
- findings section must include missing artifact paths and remediation actions.
