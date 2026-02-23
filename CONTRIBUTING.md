# Contributing Guide

## Governance Entry

This project uses OpenCode + Superpower governance.

- Runtime config: `opencode.json`
- Governance plugin source: `.opencode/plugins/superpower/index.js`
  (do not add it to `opencode.json` `plugin` list)
- Rules: `.opencode/rules/*.md`
- Process docs: `docs/process/*.md`

## Required Role Flow

1. Planner (`plan`) defines objective, scope, and acceptance.
2. Builder (`build`) implements and validates.
3. Reviewer (`reviewer`) performs findings-first review.

`build` is the default agent.

## Required Gates

Run these before considering work complete:

```bash
npm install
npm run gate:safety
npm run gate:workflow
npm run gate:scenarios
npm run gate:metrics
```

Or run all:

```bash
npm run gate:all
```

## Architecture-First Workflow

```bash
npm run devwf:arch
npm run devwf:iterate
npm run devwf:full
```

Run `devwf:arch` before detailed feature implementation.

## Plan-Constrained TODO Workflow

The autonomous backlog is defined in:

- `docs/process/todos-workflow.v4_30.json`

Core commands:

```bash
npm run todos:doctor
npm run todos:init
npm run todos:status
npm run todos:next
```

Per-task closure requires evidence:

```bash
npm run todos:done -- <TODO_ID> --note "accepted" --evidence <path1,path2>
```

Milestone closure:

```bash
npm run todos:milestone -- <M1|M2|M3|M4|M5> --run
```

## Test Commands

```bash
npm test
```

Workspace-specific commands are defined in `AGENTS.md`.
Current baseline includes backend architecture tests, frontend build smoke test, and shared contract type-check test.

## ADR Requirement

Create/update ADR under `docs/adr/` when any trigger from `.opencode/rules/adr.md` applies.

## Failure Handling

- If `gate:safety` fails: fix config/plugin/rule issues first.
- If `gate:workflow` fails: fix doc/instruction resolution issues.
- If `gate:scenarios` fails: resolve tests before review pass.
- Reviewer must output explicit `BLOCK` decision when any required gate fails.
- If TODO verification commands fail, do not mark task `done`.
- If milestone check fails, keep milestone in blocked state and remediate required TODOs first.

## Role Handoff Artifacts

- `plan` -> `build`:
  - objective, scope, non-goals,
  - acceptance criteria,
  - ADR trigger decision.
- `build` -> `reviewer`:
  - changed files and rationale,
  - executed commands and key outputs,
  - known risks and deferred items.
- `reviewer` -> merge/release decision:
  - findings by severity,
  - explicit `PASS` or `BLOCK`,
  - required remediation when blocked.

Use reviewer report format:

- `docs/process/reviewer-findings-template.md`

## Iteration Closeout Artifacts

For Iteration 1 closeout, keep these files updated:

- `docs/process/iteration-01-task-status.md`
- `docs/process/iteration-01-milestone-record.md`
- `docs/process/iteration-01-closeout.md`
