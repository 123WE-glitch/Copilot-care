# 0006-smart-auth-scope-enforcement.md

## Context

The CoPilot Care project aims to support SMART on FHIR integration (M7 milestone) to allow secure, scoped access to patient data by third-party applications. While a full Identity Provider (IdP) integration is out of scope for the current phase, we need to validate the security model and ensure our backend can enforce granular access control based on OAuth2 scopes.

The SMART on FHIR v1 specification defines scopes in the format `role/resource.permission` (e.g., `patient/Observation.read`, `user/Patient.write`).

We need a mechanism to:
1. Parse these scopes from a mock introspection response or token.
2. Enforce these permissions when FHIR resources are accessed via the adapter layer (created in ADR 0005).

## Decision

We will implement a **Mock SMART Auth Scope Enforcer** within the `infrastructure/auth` module.

This module will:
1. Define a `SmartScope` structure to represent parsed permissions.
2. Implement a `SmartScopeParser` to validate and parse scope strings according to SMART v1 syntax.
3. Implement a `SmartAccessEnforcer` service that checks if a given set of granted scopes allows a specific operation on a resource.

This implementation will be **mock-first**:
- It will not connect to a real OAuth2 server yet.
- It will accept a mock "introspection response" (JSON object) as input to simulate a validated token.
- It will be designed to be easily plugged into an Express middleware later.

## Alternatives

1. **Full OAuth2 Server Integration**:
   - *Pros*: Real-world security.
   - *Cons*: High complexity, requires external infrastructure (Keycloak, Auth0), blocks development of the enforcement logic itself.

2. **Simple Role-Based Access Control (RBAC)**:
   - *Pros*: Simpler to implement.
   - *Cons*: Doesn't match FHIR/SMART standards, making future interoperability harder.

## Consequences

- **Positive**:
  - Validates the granular permission model early.
  - Decouples enforcement logic from the authentication source.
  - Enables testing of complex access scenarios (e.g., "can read Observation but not Patient").

- **Negative**:
  - Security is only "simulated" until a real IdP is connected.
  - Requires manual maintenance of scope definitions.

## Rollout/Backout

- **Rollout**: Merge `infrastructure/auth` module.
- **Backout**: Remove the module. No external dependencies are introduced.
