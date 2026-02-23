# M2 Evidence Bundle (A-F End-to-End Closure)

## Scope

This record closes milestone M2 from `docs/process/todos-workflow.v4_30.json`.

Covered TODOs:

- `T7` Run minimal backend core chain
- `T8` Implement red-flag short-circuit and conservative escalation
- `T9` Implement DI-based conflict routing
- `T10` Complete audit-event and decision-trace pipeline
- `T11` Automate T-001 to T-006 scenario tests
- `T12` Finish frontend minimal closed loop
- `T13` Publish M2 evidence bundle

## Executed Validation Commands

- `npm run devwf:arch`
- `npm run gate:scenarios`
- `npm run test --workspace=@copilot-care/backend`
- `npm run test --workspace=@copilot-care/frontend`

All commands passed in current workspace run.

## Scenario Evidence (T-001 to T-006)

Source of truth:

- `src/backend/src/tests/scenarios/fixtures/af-scenarios.ts`
- `src/backend/src/tests/scenarios/af-scenario-replay.test.ts`

Result:

- all six scenarios replayable in automated backend tests,
- expected status/error/range assertions enforced in CI-local test run,
- T-005 replay consistency now validated via same `sessionId` semantics.

## Governance and Routing Evidence

- red-flag short-circuit: `src/backend/src/tests/architecture/debate-governance-routing.test.ts`
- deep-dissent bounded routing: `src/backend/src/tests/architecture/debate-governance-routing.test.ts`
- audit phase trace coverage: `src/backend/src/tests/architecture/debate-governance-routing.test.ts`
- idempotency semantics: `src/backend/src/tests/architecture/usecase-idempotency.test.ts`

## Frontend Minimal Loop Evidence

- input -> API call -> board output view:
  - `src/frontend/src/views/ConsultationView.vue`
  - `src/frontend/src/services/triageApi.ts`

- architecture expert binding panel:
  - `GET /architecture/experts`
  - rendered in consultation board.

## Reviewer Decision Input

For reviewer pass/block decision:

- hard gates passed: safety/workflow/scenarios/arch
- A-F replay evidence exists and is test-backed
- frontend minimum loop is build-verified
- architecture and workflow docs remain instruction-resolvable

If any gate regresses in later changes, decision should be `BLOCK`.