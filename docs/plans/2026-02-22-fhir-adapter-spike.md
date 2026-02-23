# FHIR Adapter Spike Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a runtime FHIR adapter spike to map internal patient data to FHIR R4 resources (Patient, Observation, Provenance).

**Architecture:** Create a new `infrastructure/fhir` module in the backend. Define lightweight FHIR interfaces (avoiding heavy libraries for now) and implement mappers for `PatientProfile` -> `Patient`, `HealthSignal` -> `Observation`, and audit events -> `Provenance`.

**Tech Stack:** TypeScript, Node.js (Backend)

---

### Task 1: Create ADR 0005

**Files:**
- Create: `docs/adr/0005-fhir-adapter-spike.md`

**Step 1: Write ADR content**
Create the ADR document explaining the decision to implement a lightweight FHIR adapter spike for interoperability, rather than a full FHIR server.

**Step 2: Verify**
Ensure the file exists and follows the ADR format.

### Task 2: Define FHIR Interfaces

**Files:**
- Create: `src/backend/src/infrastructure/fhir/types.ts`

**Step 1: Define basic FHIR types**
Define `FHIRResource`, `Patient`, `Observation`, `Provenance` interfaces with essential fields only (id, resourceType, identifier, name, status, code, value, etc.).

**Step 2: Verify**
Run `npm run build --workspace=@copilot-care/backend` to ensure types compile.

### Task 3: Implement Patient Mapper

**Files:**
- Create: `src/backend/src/infrastructure/fhir/PatientMapper.ts`
- Create: `src/backend/src/infrastructure/fhir/__tests__/PatientMapper.test.ts`

**Step 1: Write failing test**
Create a test that expects `mapToFHIR(patientProfile)` to return a valid FHIR Patient resource.

**Step 2: Implement mapper**
Implement the `PatientMapper` class with a static `toFHIR` method.

**Step 3: Verify**
Run `npm test --workspace=@copilot-care/backend src/backend/src/infrastructure/fhir/__tests__/PatientMapper.test.ts`

### Task 4: Implement Observation Mapper

**Files:**
- Create: `src/backend/src/infrastructure/fhir/ObservationMapper.ts`
- Create: `src/backend/src/infrastructure/fhir/__tests__/ObservationMapper.test.ts`

**Step 1: Write failing test**
Create a test that expects `mapToFHIR(healthSignal)` to return a valid FHIR Observation resource.

**Step 2: Implement mapper**
Implement the `ObservationMapper` class.

**Step 3: Verify**
Run `npm test --workspace=@copilot-care/backend src/backend/src/infrastructure/fhir/__tests__/ObservationMapper.test.ts`

### Task 5: Implement Provenance Mapper

**Files:**
- Create: `src/backend/src/infrastructure/fhir/ProvenanceMapper.ts`
- Create: `src/backend/src/infrastructure/fhir/__tests__/ProvenanceMapper.test.ts`

**Step 1: Write failing test**
Create a test that expects `mapToFHIR(auditEvent)` to return a valid FHIR Provenance resource.

**Step 2: Implement mapper**
Implement the `ProvenanceMapper` class.

**Step 3: Verify**
Run `npm test --workspace=@copilot-care/backend src/backend/src/infrastructure/fhir/__tests__/ProvenanceMapper.test.ts`
