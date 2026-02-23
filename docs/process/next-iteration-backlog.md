# Next Iteration Backlog Seed (from M5 Residual Risks)

## Source Rule

Every item below is derived from unresolved risk entries in:

- `docs/process/m5-closeout-report.md`

## Prioritized Backlog

| Backlog ID | Priority | Work Item | Source Risk |
|---|---|---|---|
| N1 | P0 | Define expert-role provider routing strategy (cardio/gp/metabolic/safety) with measurable quality KPIs | role specialization not fully tuned |
| N2 | P0 | Add adversarial scenario expansion set and red-team replay bundle | adversarial distribution coverage limited |
| N3 | P0 | Implement runtime FHIR adapter spike (`Patient/Observation/Provenance`) | FHIR mapping is docs-only |
| N4 | P1 | Implement SMART auth scope enforcement plan (design + mock integration) | no SMART auth runtime path |
| N5 | P1 | Add multi-site replication verification (`site-beta` and `site-gamma`) | cross-site validation is limited |
| N6 | P1 | Add frontend clinician workflow enhancements (review queue + evidence drawer) | frontend still minimal |
| N7 | P1 | Add governance dashboard draft from ledger + trigger matrix outputs | governance visibility can improve |
| N8 | P2 | Add performance profiling for replicated replay pipeline | replay scale may expose latency drift |
| N9 | P2 | Add longitudinal follow-up scenario family (week-over-week progression) | follow-up depth not expanded |
| N10 | P2 | Define pilot-to-production cutover checklist version 1 | release governance needs production handoff detail |

## Optimization Backlog (Post v5.00 Deep Audit)

| Backlog ID | Priority | Work Item | Source Risk |
|---|---|---|---|
| N11 | P0 | Add workspace-level typecheck gate and make it a required daily/CI command | compile-only regressions can pass tests but break releases |
| N12 | P0 | Add frontend type-safe workflow/event model regression coverage | stream status/event shape drift can silently break UI |
| N13 | P0 | Add backend dist hygiene guard (no nested output, no test artifact leakage) | build artifact contamination can cause runtime drift |
| N14 | P1 | Add enforceable backend layering import-boundary checks | architecture rules currently rely on manual discipline |
| N15 | P1 | Unify shared package type artifacts and remove dual-source drift risk | `types.ts` and generated declaration drift can desync contracts |
| N16 | P1 | Establish dependency vulnerability baseline and remediation workflow | unresolved vulnerabilities create operational and supply-chain risk |
| N17 | P2 | Add release-ready composite gate (`typecheck + test + build + gates`) | fragmented checks increase release omission probability |
| N18 | P2 | Refresh workflow and governance docs to reflect new quality gates | process docs lag behind runtime behavior and tooling |

## Competition Delivery Backlog (Post M14 Hardening)

| Backlog ID | Priority | Work Item | Source Risk |
|---|---|---|---|
| N27 | P0 | Prefetch and cache report-export runtime module before operator click | first export interaction may stall demo rhythm |
| N28 | P1 | Split ConsultationView into section-level presentation modules | single-view complexity slows iteration and increases regression risk |
| N29 | P1 | Expand critical-path integration regression (export fallback / red-flag branch) | competition demo path lacks broad interaction regression guard |
| N30 | P0 | Add repository secret-leak guard command and workflow wiring | local secrets can be committed accidentally without guardrails |

## Entry Criteria for Next Cycle

- all N* items must include acceptance criteria and owner role.
- P0 items must have executable verification commands before implementation start.
- FHIR/SMART runtime items require ADR update before code changes.
- architecture/gate workflow updates require synchronized manifest + state evidence.
