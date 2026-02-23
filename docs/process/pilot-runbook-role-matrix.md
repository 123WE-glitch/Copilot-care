# Pilot Runbook and Role Matrix (M4)

## Scope

This runbook defines pilot responsibilities, required inputs, and expected
outputs for governance-controlled release decisions.

## Role Matrix

| Phase | Owner | Collaborators | Required Input | Expected Output |
|---|---|---|---|---|
| Scope lock | `plan` | `build`, `reviewer` | TODO card + plan chapter refs | explicit scope/non-goal/acceptance |
| Build execution | `build` | `plan` | approved task scope + baseline contracts | implementation + test evidence |
| Gate verification | `build` | `reviewer` | changed files + verify commands | gate command logs + reports |
| Review decision | `reviewer` | `plan`, `build` | findings template + gate outputs + ADR status | `PASS` or `BLOCK` with `failedGateIds` |
| Pilot release prep | `reviewer` | `build` | risk matrix + stop-loss + rollback evidence | release checklist result |
| Pilot handover | `plan` | `build`, `reviewer` | accepted release package | operator-facing runbook and fallback plan |

## Pilot Acceptance Evidence Checklist

- `gate:safety` result recorded.
- `gate:workflow` result recorded.
- `gate:scenarios` result recorded.
- `gate:metrics` result recorded.
- `devwf:full` result recorded.
- reviewer decision has explicit `PASS/BLOCK` and `failedGateIds`.
- ADR status checked for trigger-hit tasks.
- risk-trigger matrix evidence attached:
  - `docs/process/risk-trigger-matrix.md`
- stop-loss and rollback evidence attached:
  - `docs/process/stop-loss-rollback-runbook.md`
- scenario evidence attached:
  - `src/backend/src/tests/scenarios/af-scenario-replay.test.ts`
  - `src/backend/src/tests/scenarios/enhanced-governance-replay.test.ts`

## Handover Output Package

Minimum package for pilot handover:

- architecture baseline: `docs/architecture.md`
- operation guide: `docs/process/opencode-operation-guide.md`
- reviewer template: `docs/process/reviewer-findings-template.md`
- risk and rollback runbooks:
  - `docs/process/risk-trigger-matrix.md`
  - `docs/process/stop-loss-rollback-runbook.md`
