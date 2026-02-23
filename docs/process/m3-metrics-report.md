# M3 Metrics Report

GeneratedAt: 2026-02-22T17:27:45.840Z

## Summary

- overallPass: true
- scenarioCount: 6
- scenarioPassRate: 100%

## Metric Ledger (target / actual / deviation / action)

| Metric | Target | Actual | Deviation | Pass | Action |
|---|---:|---:|---:|:---:|---|
| highRiskRecall | 0.9 | 1 | 0.1 | Y | maintain current baseline and continue monitoring |
| explainabilityRate | 0.95 | 1 | 0.05 | Y | maintain current baseline and continue monitoring |
| averageLatencyMs | 120000 | 0.82 | -119999.18 | Y | maintain current baseline and continue monitoring |
| auditCoverageRate | 1 | 1 | 0 | Y | maintain current baseline and continue monitoring |
| invalidInputInterceptRate | 1 | 1 | 0 | Y | maintain current baseline and continue monitoring |
| scenarioPassRate | 0.9 | 1 | 0.1 | Y | maintain current baseline and continue monitoring |

## Scenario Snapshot

| Scenario | Status | ErrorCode | LatencyMs | Explainable | Audit |
|---|---|---|---:|:---:|:---:|
| T-001 | OUTPUT | - | 3.73 | Y | Y |
| T-002 | OUTPUT | - | 0.4 | Y | Y |
| T-003 | ERROR | ERR_MISSING_REQUIRED_DATA | 0.08 | Y | Y |
| T-004 | OUTPUT | - | 0.44 | Y | Y |
| T-005 | OUTPUT | - | 0.17 | Y | Y |
| T-006 | ESCALATE_TO_OFFLINE | ERR_ESCALATE_TO_OFFLINE | 0.08 | Y | Y |

## Acceptance Decision

- PASS: all M3 threshold gates are satisfied.

