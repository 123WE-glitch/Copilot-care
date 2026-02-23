# SMART Auth Scope Enforcement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a mock SMART on FHIR authorization scope enforcement mechanism to validate access control design.

**Architecture:** Create a `SmartAuthService` in `infrastructure/auth` that parses SMART scopes (e.g., `patient/Observation.read`) and validates them against requested resources. This will be a mock implementation simulating an OAuth2 introspection response.

**Tech Stack:** TypeScript, Node.js

---

### Task 1: Create ADR 0006

**Files:**
- Create: `docs/adr/0006-smart-auth-scope-enforcement.md`

**Step 1: Write ADR content**
Document the decision to implement a mock SMART auth scope enforcer to validate the security model without a full IdP integration.

**Step 2: Verify**
Ensure file exists.

### Task 2: Define SMART Types

**Files:**
- Create: `src/backend/src/infrastructure/auth/smartTypes.ts`

**Step 1: Define interfaces**
Define `SmartScope` (parsed object with role, resource, permission), `IntrospectionResponse` (mock OAuth2 response), and `SmartContext` (patient context).

**Step 2: Verify**
Run `npm run build --workspace=@copilot-care/backend`.

### Task 3: Implement Scope Parser

**Files:**
- Create: `src/backend/src/infrastructure/auth/SmartScopeParser.ts`
- Create: `src/backend/src/infrastructure/auth/__tests__/SmartScopeParser.test.ts`

**Step 1: Write failing test**
Test `parseScope("patient/Observation.read")` returns correct structure.

**Step 2: Implement parser**
Implement regex-based parser for SMART v1 scopes (`role/resource.permission`).

**Step 3: Verify**
Run `npm test --workspace=@copilot-care/backend src/backend/src/infrastructure/auth/__tests__/SmartScopeParser.test.ts`.

### Task 4: Implement Access Enforcer

**Files:**
- Create: `src/backend/src/infrastructure/auth/SmartAccessEnforcer.ts`
- Create: `src/backend/src/infrastructure/auth/__tests__/SmartAccessEnforcer.test.ts`

**Step 1: Write failing test**
Test `enforce(scopes, "Observation", "read")` returns true/false correctly.

**Step 2: Implement enforcer**
Implement logic to check if any granted scope matches the requested resource and permission.

**Step 3: Verify**
Run `npm test --workspace=@copilot-care/backend src/backend/src/infrastructure/auth/__tests__/SmartAccessEnforcer.test.ts`.
