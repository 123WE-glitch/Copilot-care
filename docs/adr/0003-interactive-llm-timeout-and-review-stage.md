# ADR 0003: Interactive LLM Timeout Baseline and Explicit Review Stage

## Context

Iteration 1 surfaced two runtime consistency issues:

- interactive consultation requests could exceed frontend timeout under external
  LLM degradation because backend defaults were `30000ms` with `2` retries,
  multiplied across multi-agent and multi-round paths;
- the chapter 4 state-machine contract requires a `REVIEW` stage, but runtime
  trace coverage was not explicit on all orchestration branches.

These are runtime semantic constraints and must be fixed with auditable changes.

## Decision

1. Update backend LLM transport defaults for interactive operation:
- `COPILOT_CARE_LLM_TIMEOUT_MS`: `12000`
- `COPILOT_CARE_LLM_MAX_RETRIES`: `1`
- `COPILOT_CARE_LLM_RETRY_DELAY_MS`: unchanged (`300`)

2. Enforce explicit `REVIEW` stage in orchestration workflow trace:
- normal path: `... -> CONSENSUS -> REVIEW -> OUTPUT`
- red-flag short-circuit: include `REVIEW` with status `skipped` before `OUTPUT`

3. Harden workflow gate checks:
- reject temporary root files (`.tmp*`);
- ensure orchestrator source includes `REVIEW` stage;
- require plan extracted text path in TODO manifest to be non-temporary and
  resolvable.

## Alternatives

1. Keep prior timeout/retry defaults and increase frontend timeout.
- Rejected: hides backend latency amplification and delays failure recovery.

2. Omit `REVIEW` stage for escalation branches.
- Rejected: weakens state-machine observability and chapter 4 trace consistency.

3. Keep temporary extracted plan file path.
- Rejected: violates repository hygiene and makes baseline artifacts unstable.

## Consequences

- Positive: reduced worst-case latency under provider instability.
- Positive: workflow trace now matches chapter 4 gate expectations.
- Positive: hygiene and contract drift are blocked earlier by workflow gate.
- Tradeoff: lower retries may reduce successful recovery under transient network
  flakiness unless operators override env values.

## Rollout / Backout

Rollout:

1. Merge runtime, test, script, and doc updates.
2. Run `npm run devwf:arch` then `npm run devwf:full`.

Backout:

1. Revert this ADR's runtime/script changes.
2. Restore prior timeout/retry defaults and workflow stage behavior.
3. Re-run workflow gates to confirm baseline integrity.
