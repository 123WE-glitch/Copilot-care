# Workflow Gates (Hard)

## Mandatory Gate Sequence

1. `plan` gate: objective, scope, constraints, acceptance must be explicit.
2. `build` gate: implementation and local verification must be recorded.
3. `review` gate: findings-first review and pass/block decision.

## Safety Gate

Run:

```bash
npm run gate:safety
```

Pass criteria:

- OpenCode config is valid.
- Superpower plugin is present.
- Required rule files exist and include mandatory markers.

## Workflow Gate

Run:

```bash
npm run gate:workflow
```

Pass criteria:

- Instructions resolve to existing files.
- Operation and command-mapping docs are present.
- ADR and architecture docs are available.
- Four expert agents must be wired in runtime (`Cardiology/GP/Metabolic/Safety`).
- Four expert provider env keys must exist in LLM factory mapping.

## Scenario Gate

Run:

```bash
npm run gate:scenarios
```

Pass criteria:

- Safety + workflow gates pass.
- Workspace tests pass.
- Architecture smoke tests pass.
- M5 batch replay report is generated with sample count >= 120.
- Report must include pass/fail breakdown.

## Metrics Gate

Run:

```bash
npm run gate:metrics
```

Pass criteria:

- M3 metric report is generated.
- Threshold checks pass for recall/explainability/latency/audit/input interception.
- Failed metric check blocks release decision.
- Failure output must include breached indicator IDs and actual-vs-target values.
- Target-vs-actual metric ledger is generated with
  `target/actual/deviation/corrective action` fields.
- Metric ledger includes at least one completed record for each milestone `M1`-`M5`.

## Architecture Workflow Gate

Run:

```bash
npm run devwf:arch
```

Pass criteria:

- Safety/workflow gates pass.
- Backend build passes.
- Backend architecture tests pass.

## Plan TODO Gate

Run:

```bash
npm run todos:doctor
npm run todos:status
npm run todos:next
```

Pass criteria:

- `docs/process/todos-workflow.v4_30.json` is valid and references the v4.30 plan.
- Milestones `M1` to `M5` exist with required TODO bindings.
- TODO commands are mapped to executable npm commands.

Milestone execution:

```bash
npm run todos:milestone -- <M1|M2|M3|M4|M5|M6|M7|M8|M9|M10|M11|M12|M13|M14|M15> --run
```

## Competition TODO Gate (v6.00)

Run:

```bash
npm run todos:doctor
npm run competition:status
npm run competition:next
```

Pass criteria:

- `docs/process/todos-workflow.v6_00.json` is valid and references competition plan.
- Milestones `W1` to `W4` exist with required TODO bindings.
- TODO commands are mapped to executable npm commands.

Milestone execution:

```bash
npm run todos:milestone -- <W1|W2|W3|W4> --run
```

Competition gates:

```bash
# Week 1 gate
npm run competition:week1

# Week 2 gate
npm run competition:week2

# Week 3 gate
npm run competition:week3

# Week 4 gate
npm run competition:week4

# Full competition gate
npm run competition:gate
```

If milestone checks fail, release decision is automatically `BLOCK`.

## ADR Gate

ADR is mandatory when any trigger in `.opencode/rules/adr.md` is met.
No ADR means release/block decision is automatically `BLOCK`.

## Stop-Loss Guard

- Repeated key failures must be evaluated by stop-loss policy.
- If stop-loss triggers, expansion work is frozen and rollback evidence is required.
- Runbook source: `docs/process/stop-loss-rollback-runbook.md`.

## Failure Policy

- Any failed gate blocks merge/release.
- Reviewer must report failed gate IDs and required remediation.
