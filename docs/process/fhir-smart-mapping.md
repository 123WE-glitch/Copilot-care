# FHIR/SMART Mapping Validation Baseline (M5)

## Scope

This mapping is documentation-only for interoperability validation.
Core backend/frontend/shared contracts remain unchanged.

## Resource Mapping

| Internal Contract | FHIR Resource | Key Fields | Mapping Note |
|---|---|---|---|
| `TriageRequest.profile.patientId` | `Patient.id` | patient identifier | one-to-one ID projection |
| `TriageRequest.profile.age/sex` | `Patient.birthDate` / `Patient.gender` | demographics | age converted to estimated birth year for transport layer |
| `TriageRequest.profile.vitals` | `Observation` | systolic/diastolic BP | `Observation.code` = blood pressure panel |
| `TriageRequest.profile.chronicDiseases` | `Condition` | condition code + status | chronic list mapped to active conditions |
| `DebateResult.status` + `errorCode` | `ServiceRequest.status` / `DetectedIssue` | triage disposition | `ESCALATE_TO_OFFLINE` maps to urgent service request |
| `DebateResult.finalConsensus.actions` | `CarePlan.activity` | recommended actions | action list preserved as activity detail |
| `DebateResult.auditTrail` | `Provenance` / `AuditEvent` | phase/event/timestamp | each audit event is retained for traceability |

## SMART on FHIR Authorization Baseline

| Actor | Required SMART Scope (example) | Purpose |
|---|---|---|
| Clinician reviewer | `patient/Observation.read` | review BP and risk evidence |
| Care coordinator | `patient/CarePlan.read` | follow-up plan execution |
| Governance reviewer | `patient/Provenance.read` | audit-chain inspection |

## Non-Goals

- No runtime FHIR API endpoint implementation in this iteration.
- No OAuth/SMART token exchange implementation in this iteration.
- No data migration or schema rewrite in this iteration.
