# ADR 0002: Governance Automation and Interoperability Baseline

## Context

M4/M5 introduces governance-heavy requirements from v4.30:

- risk-trigger matrix automation,
- stop-loss and rollback guard,
- release package evidence blocking,
- FHIR/SMART mapping validation baseline.

These are operational/governance changes and must remain auditable.

## Decision

1. Add machine-checkable governance modules in backend infrastructure:
- `riskTriggerMatrix.ts`
- `stopLossGuard.ts`
- `KnowledgeVersionGovernor.ts`

2. Add automated architecture/scenario tests to enforce governance behavior.

3. Add release and interoperability documentation artifacts:
- governance release package checklist,
- risk-trigger matrix and stop-loss runbooks,
- FHIR/SMART mapping + validation record.

4. Keep existing public API and module boundaries unchanged in this iteration.

## Alternatives

1. Keep governance logic as docs only.
- Rejected: not machine-checkable; weak reviewer enforcement.

2. Implement full FHIR runtime APIs now.
- Rejected: exceeds current iteration scope and risks destabilizing baseline.

## Consequences

- Positive: governance constraints become executable and testable.
- Positive: reviewer block decisions can reference explicit evidence artifacts.
- Tradeoff: additional scripts/docs increase maintenance overhead.

## Rollout / Backout

Rollout:

1. Merge governance modules + tests.
2. Merge workflow docs and release package docs.
3. Run `npm run devwf:full` before milestone closure.

Backout:

1. Revert files introduced by this ADR.
2. Remove related gate references from docs/scripts.
3. Re-run `npm run gate:workflow` to confirm baseline consistency.
