# Architecture Overview

## Purpose

This file freezes the first-round architecture baseline for autonomous
development under the v4.30 project plan.

Primary objective for this round:

- close architecture loop,
- keep quality gates stable,
- keep module contracts explicit and testable.

Not included in this round:

- deep model optimization,
- UI polish,
- performance deep tuning,
- large scenario expansion.

## Runtime Topology

- `src/backend`: orchestration runtime and HTTP interface.
- `src/frontend`: minimal consultation view and API integration.
- `src/shared`: cross-layer request/response and error contracts.
- `.opencode`: agent/gate/superpower governance system.

## Dependency Direction (Frozen)

Backend dependency direction is fixed as:

1. `src/backend/src/application/**`
- may depend on domain contracts and shared types.
- must not import from `interfaces` or framework adapters.

2. `src/backend/src/infrastructure/**`
- may implement application ports.
- may depend on external I/O clients and core engines.

3. `src/backend/src/interfaces/**`
- handles transport concerns (HTTP parsing, response mapping).
- must not contain business arbitration rules.

4. `src/backend/src/bootstrap/**`
- single composition root.
- responsible for explicit wiring only.

Critical baseline files:

- `src/backend/src/bootstrap/createBackendApp.ts`
- `src/backend/src/bootstrap/createRuntime.ts`
- `src/backend/src/interfaces/http/createTriageRouter.ts`
- `src/backend/src/application/usecases/RunTriageSessionUseCase.ts`
- `src/backend/src/infrastructure/orchestration/DebateEngineOrchestrator.ts`

## Public I/O Contract (Frozen v1)

Endpoint:

- `POST /orchestrate_triage`
- `POST /orchestrate_triage/stream` (NDJSON stream)

Input (`@copilot-care/shared/types`):

- `TriageRequest`
- `requestId?: string`
- `profile: PatientProfile`
- `signals?: HealthSignal[]`
- `symptomText?: string`
- `contextVersion?: string`
- `consentToken?: string`
- `sessionId?: string` (backward compatible)

Output:

- `TriageApiResponse`
- success path: `DebateResult`
  - includes `routing`, `triageResult`, `explainableReport`, `workflowTrace`
- error path: `TriageErrorResponse`
  - includes optional `requiredFields` for missing MIS path
- stream path: `TriageStreamEvent` sequence
  - `stage_update` -> runtime stage + status + detail
  - `reasoning_step` -> routing/debate reasoning snapshot
  - `clarification_request` -> required fields and question
  - `token` -> incremental output token
  - `final_result` -> terminal `TriageApiResponse`
  - `error` -> typed stream error event

Runtime rule:

- `consentToken` is validated in intake phase.
- missing/invalid token returns `ERR_MISSING_REQUIRED_DATA` with
  `requiredFields=["consentToken"]`.

Operational endpoint:

- `GET /health` -> `{ "status": "ok" }`
- `GET /architecture/experts` -> expert-provider runtime snapshot.

## Error Code Contract (Frozen v1)

The following error codes are release-gated and must remain stable:

- `ERR_MISSING_REQUIRED_DATA`
- `ERR_INVALID_VITAL_SIGN`
- `ERR_LOW_CONFIDENCE_ABSTAIN`
- `ERR_CONFLICT_UNRESOLVED`
- `ERR_ESCALATE_TO_OFFLINE`
- `ERR_GUIDELINE_EVIDENCE_MISSING`
- `ERR_ADVERSARIAL_PROMPT_DETECTED`

Boundary rule:

- interface boundary returns structured error responses only,
- no raw string exceptions cross API boundary.

## Core Module Contract Template

All core modules follow this contract schema:

- `Input`
- `Process`
- `Output`
- `Error`
- `DoneDefinition`

### Module A: Structured Intake

- Input: `PatientProfile` + user symptom text.
- Process: required-field completeness and vital sanity checks.
- Output: validated triage input payload.
- Error: `ERR_MISSING_REQUIRED_DATA`, `ERR_INVALID_VITAL_SIGN`.
- DoneDefinition: missing-field interception is deterministic and test-covered.

### Module B: Risk Evaluation (Safety Mainline)

- Input: validated profile + vitals context.
- Process: risk-level assessment with red-flag short-circuit.
- Output: agent opinions and preliminary risk bands.
- Error: `ERR_ESCALATE_TO_OFFLINE`.
- DoneDefinition: high-risk red flag always prefers conservative escalation.

### Module B.1: Complexity Routing (Chapter 4 alignment)

- Input: validated profile and triage context.
- Process:
  - first perform department triage (cardiology/metabolic/general practice),
  - red-flag boundary check has highest priority,
  - compute `ComplexityScore`,
  - if minimum information set is incomplete, force at least `LIGHT_DEBATE`,
  - route by threshold:
    - `0-2` -> `FAST_CONSENSUS`,
    - `3-5` -> `LIGHT_DEBATE`,
    - `>=6` -> `DEEP_DEBATE`.
- Output: route mode + department + collaboration mode metadata.
- Error: red-flag route returns `ERR_ESCALATE_TO_OFFLINE`.
- DoneDefinition:
  - normal case uses same-specialty multi-model panel,
  - complex case uses multi-disciplinary consultation.

### Module C: Multi-Agent Arbitration

- Input: specialist/general/metabolic/safety opinions.
- Process: dissent index calculation and threshold routing.
- Output: consensus, abstain, or escalation decision.
- Error: `ERR_CONFLICT_UNRESOLVED`, `ERR_LOW_CONFIDENCE_ABSTAIN`.
- DoneDefinition: max debate rounds bounded and auditable.

### Module D: Follow-up Task Scheduling

- Input: final risk output + status.
- Process: map triage level to executable follow-up actions.
- Output: action list and follow-up cadence.
- Error: inherited from upstream decision status.
- DoneDefinition: each status maps to a deterministic action template.

### Module E: Explainable Output and Audit

- Input: final result + decision trace + evidence.
- Process: shape clinician/patient-facing output and audit events.
- Output: explainable report fields and `AuditEvent[]`.
- Error: upstream error code is preserved.
- DoneDefinition: output contains conclusion + evidence + action set.

## Composition Root and No-Hidden-Global Rule

`createRuntime` is the only runtime assembly point. It must:

- instantiate agents explicitly,
- inject optional LLM clients explicitly,
- expose architecture snapshot for audit,
- avoid hidden mutable globals in application logic.

If provider config is missing or invalid, runtime must degrade to local heuristic
behavior and preserve system availability.

## First-Round Gate Mapping

- `npm run gate:safety`: config/rule/plugin hard checks.
- `npm run gate:workflow`: docs, runtime wiring, workflow consistency.
- `npm run gate:scenarios`: gate chain + workspace tests.
- `npm run devwf:arch`: architecture-first release gate.
- `npm run devwf:full`: full baseline release gate.

## Runtime Semantics (Frozen)

- idempotency: same `requestId` (or fallback `sessionId`) + same payload reuses
  cached result for `24h`.
- idempotency conflict: same `requestId/sessionId` with different payload is blocked with
  `ERR_CONFLICT_UNRESOLVED`.
- timeout defaults: `COPILOT_CARE_LLM_TIMEOUT_MS=12000`.
- retry defaults: `COPILOT_CARE_LLM_MAX_RETRIES=1`,
  `COPILOT_CARE_LLM_RETRY_DELAY_MS=300`.
- degrade rule: low confidence or unresolved conflict prefers abstain/escalate
  instead of forced output.
- workflow trace rule: successful orchestration must include `REVIEW` before
  `OUTPUT`; red-flag short-circuit must mark `REVIEW` as `skipped`.

## Plan Mapping (v4.30)

This frozen architecture maps directly to plan requirements:

- chapter `5.3`: module contracts use input-process-output-error-done schema.
- chapter `6.4`: error codes are explicit and typed.
- chapter `6.14`: runtime semantics stay deterministic at boundaries.
- chapter `7.14`: reviewer gate decisions depend on executable evidence.

## A-F Scenario Source of Truth

Iteration baseline scenario fixtures and replay tests are maintained at:

- `src/backend/src/tests/scenarios/fixtures/af-scenarios.ts`
- `src/backend/src/tests/scenarios/af-scenario-replay.test.ts`

This keeps `T-001` to `T-006` deterministic and replayable in local gates.
