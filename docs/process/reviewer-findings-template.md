# Reviewer Findings Template

Use this template for `reviewer` output in every milestone review.

## 1) Decision

- Decision: `PASS` or `BLOCK`
- failedGateIds: comma-separated gate IDs when decision is `BLOCK` (or `none`)
- Scope reviewed:
- Reviewer:
- Date:

## 2) Findings (Ordered by Severity)

### Critical

- File:
- Finding:
- Impact:
- Required fix:

### High

- File:
- Finding:
- Impact:
- Required fix:

### Medium

- File:
- Finding:
- Impact:
- Suggested fix:

### Low

- File:
- Finding:
- Impact:
- Suggested fix:

## 3) Gate Status

- `typecheck`:
- `guard:imports`:
- `gate:safety`:
- `gate:workflow`:
- `gate:scenarios`:
- `gate:metrics`:
- `security:baseline`:
- `gate:release`:
- `devwf:arch`:
- `devwf:full`:

## 4) ADR Check

- ADR trigger hit: `yes/no`
- If yes, ADR file:
- If no ADR created when required, decision must be `BLOCK`.

## 5) Residual Risks and Deferred Items

- Risk:
- Why deferred:
- Owner/next iteration:

## 6) Evidence Links

- Gate evidence:
- ADR evidence:
- Audit evidence:
- Governance evidence:
- Missing evidence IDs (if any):

## 7) Change Summary (Secondary)

- Changed files:
- Validation commands run:
- Key outcomes:
