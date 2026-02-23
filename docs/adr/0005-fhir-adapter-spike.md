# 0005-fhir-adapter-spike.md

## Context

The CoPilot Care project requires interoperability capabilities to exchange patient data with external systems. The M7 milestone specifically calls for a "runtime FHIR adapter spike" to demonstrate mapping of internal data models (PatientProfile, HealthSignal, AuditEvent) to standard FHIR R4 resources (Patient, Observation, Provenance).

Currently, the system uses internal TypeScript interfaces (`@copilot-care/shared/types`) for all data exchange. There is no standard mechanism for external integration.

We need a solution that:
1. Demonstrates FHIR capability without the overhead of a full FHIR server (e.g., HAPI FHIR, Azure API for FHIR).
2. Is lightweight and fits within the existing Node.js/Express backend.
3. Provides a foundation for future SMART-on-FHIR integration (T30).

## Decision

We will implement a **lightweight, read-only FHIR adapter layer** within the existing backend infrastructure (`src/backend/src/infrastructure/fhir`).

This adapter will:
1. Define minimal TypeScript interfaces for required FHIR R4 resources (Patient, Observation, Provenance).
2. Implement pure functions/mappers to transform internal domain entities into these FHIR structures.
3. Expose these resources via a simple API endpoint or service method for the spike.

We will **NOT** import heavy FHIR libraries (like `fhir.js` or `node-fhir-server-core`) at this stage to keep the bundle size small and dependencies minimal. We will manually define the subset of the FHIR spec we need.

## Alternatives

1. **Full FHIR Server (e.g., HAPI FHIR sidecar)**:
   - *Pros*: Complete compliance, validation, storage.
   - *Cons*: High operational complexity, requires Java/Docker sidecar, overkill for a prototype spike.

2. **Heavy Node.js FHIR Library**:
   - *Pros*: Type safety, validation.
   - *Cons*: Large dependency tree, potential performance impact on the lightweight backend.

3. **No FHIR (Custom JSON)**:
   - *Pros*: Easiest to implement.
   - *Cons*: Fails M7 interoperability goal, creates vendor lock-in.

## Consequences

- **Positive**:
  - Low overhead implementation.
  - Immediate interoperability demonstration.
  - Type-safe mapping within existing TS project.
  - Easy to extend or replace with a full server later.

- **Negative**:
  - No built-in FHIR validation (we must ensure correctness manually).
  - Only supports a tiny subset of the FHIR spec.
  - Read-only focus initially.

## Rollout/Backout

- **Rollout**: Merge the `infrastructure/fhir` module. It is additive and does not affect the core triage flow.
- **Backout**: Delete the `infrastructure/fhir` directory. No database schema changes are involved.
