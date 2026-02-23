# Agent Roles (Hard)

## Role Definitions

- `plan` (Planner): clarifies scope, risks, and acceptance criteria.
- `build` (Builder): implements and verifies changes.
- `reviewer` (Reviewer): performs strict review only.

## Boundaries

- Planner must not edit files or run mutating shell commands.
- Builder is the only role allowed to implement code and run write operations.
- Reviewer must remain read-only and must not execute mutating actions.

## Handoffs

- Planner output: objective, scope, constraints, acceptance checklist.
- Builder output: file changes, validation steps, unresolved risks.
- Reviewer output: findings by severity, block/pass decision, test adequacy status.
- Reviewer `BLOCK` output must include `failedGateIds` referencing gate command IDs.

## Blocking Conditions

- Missing Planner acceptance checklist.
- Builder change without verification evidence.
- Reviewer output without severity ordering.
- Reviewer `BLOCK` output missing explicit `failedGateIds`.
- Reviewer output missing required gate/ADR/audit/governance evidence links.
- Any role violating its hard boundary.

## Default Routing

- `default_agent` is `build`.
- Planner and Reviewer are invoked explicitly for planning and review gates.
