# CoPilot Care Chapter 3-6 Architecture Blueprint (Execution Baseline)

## Scope

This blueprint is the mandatory architecture contract for autonomous
development. It is extracted from plan chapter 3/4/5/6 and converted into
implementation constraints.

## Chapter 3 -> Decision Core

### 3.2 Dual-Path Decision

- Normal case: parallel consensus path.
- Complex case: bounded deep debate path.
- Hard cap: `Max_Steps = 3`.
- If still unresolved after max rounds: conservative abstain/escalation.

### 3.3 DI Thresholds

- `< 0.2`: consensus.
- `0.2 - 0.4`: light debate.
- `0.4 - 0.7`: deep debate + review.
- `>= 0.7`: conservative escalation.

### 3.6 Complexity Routing

- Route priority: red-flag first, then complexity score.
- Score `0-2`: `FAST_CONSENSUS`.
- Score `3-5`: `LIGHT_DEBATE`.
- Score `>=6`: `DEEP_DEBATE`.
- Missing minimum information set: must not enter fast consensus.

## Chapter 4 -> System Architecture

### State Machine (frozen)

- `START -> INFO_GATHER -> RISK_ASSESS -> ROUTING -> DEBATE -> REVIEW -> OUTPUT`
- Any red-flag can short-circuit to `ESCALATION`.

### Seven-Layer Mapping to Current Repo

- Interaction layer: `src/frontend`
- Intake layer: `MinimumInfoSetService`
- Orchestration layer: `ComplexityRoutedOrchestrator`
- Assessment layer: `RuleFirstRiskAssessmentService` + agent opinions
- Arbitration layer: `DebateEngine`
- Output layer: `FollowupPlanningService` + `ExplainableReportService`
- Governance layer: `.opencode`, audit trail, gates, ADR

## Chapter 5 -> Module Contracts (A-E)

### A Smart Intake

- Input: symptom text + profile + signals.
- Process: normalize/validate MIS.
- Output: normalized profile or required-field list.
- Error: `ERR_MISSING_REQUIRED_DATA`, `ERR_INVALID_VITAL_SIGN`.

### B Rule-First Risk

- Input: normalized profile + signals.
- Process: red-flag short-circuit + risk stratification.
- Output: rule risk snapshot (`riskLevel`, `triageLevel`, evidence).

### C Multi-Agent Arbitration

- Input: specialist opinions.
- Process: DI computation + bounded debate + consensus selection.
- Output: single executable consensus or conservative fallback.

### D Follow-Up Planning

- Input: risk level + triage level + department.
- Process: map risk to follow-up actions and schedule.
- Output: structured triage plan.

### E Explainable Report

- Input: consensus + rule evidence + routing decision + follow-up plan.
- Process: build conclusion-evidence-basis-action structure.
- Output: clinician/patient readable report.

## Chapter 6 -> Interface and Runtime Semantics

### Request Contract

- `orchestrate_triage` accepts:
  - `requestId?`
  - `profile`
  - `signals?`
  - `symptomText?`
  - `contextVersion?`
  - `consentToken?`
  - `sessionId?` (backward compatible)

### Response Contract

- Success:
  - `status`
  - `routing`
  - `triageResult`
  - `explainableReport`
  - `workflowTrace`
  - `auditRef`
- Error:
  - typed `errorCode`
  - `requiredFields?`
  - `auditRef?`

### Consent Gate

- `consentToken` is mandatory at runtime and validated before MIS checks.
- tokens must match allowlist policy (`consent_local_demo` or configured allowlist).
- missing/invalid token must return:
  - `errorCode=ERR_MISSING_REQUIRED_DATA`
  - `requiredFields=["consentToken"]`

### Runtime Constraints

- Idempotency: `requestId`/`sessionId` key within 24h.
- Timeout default: backend risk path `12000ms`; frontend orchestration `120000ms`.
- Retry default: recoverable retries up to `1` with backoff.
- Consistency: return and audit trace remain coupled in same response payload.

## Hard Gates

- Any code change touching orchestration must preserve state-machine trace.
- Any code change touching request/response contract must update shared types first.
- Any change to error semantics must keep `ERR_*` typed path.
- Any runtime semantic change requires ADR update.
