# OpenCode Command Mapping

This table maps reference-architecture pseudo commands to executable commands for this repository.

| Reference/Pseudo Command | Status | Executable Replacement | Notes |
|---|---|---|---|
| `opencode config apply .opencode/superpower.yaml` | Not supported in CLI 1.2.6 | Use `opencode.json` + plugin auto-checks, then run `npm run gate:safety` | YAML is documentation source only. |
| `opencode agents list` | Partially different | `opencode agent list` | Actual subcommand is singular `agent`. |
| `opencode check safety --rules ...` | Not supported | `npm run gate:safety` | Implemented via `scripts/gate-checks.cjs`. |
| `opencode test run --suite scenarios ...` | Not supported | `npm run gate:scenarios` | Includes workspace test execution. |
| `opencode graph visualize --workflow ...` | Not supported | Document workflow in `.opencode/rules/workflow-gates.md` | No native graph command in current CLI. |
| `opencode compliance report ...` | Not supported | Use ADR + gate evidence docs | Compliance is tracked through docs and gates. |
| `opencode knowledge snapshot ...` | Not supported | Record decisions in `docs/adr/*.md` | Use ADR for versioned governance decisions. |
| `opencode knowledge rollback ...` | Not supported | Revert config/docs changes and update ADR | Backout handled by repo change control. |
| `opencode deliverable ...` | Not supported | Maintain deliverables in `docs/` + `group/` | Manual, auditable artifacts. |
| `opencode architecture workflow ...` | Not supported | `npm run devwf:arch`, `npm run devwf:iterate`, `npm run devwf:full` | Architecture-first automation is script-driven. |
| `plan todo board ...` (from submission plan process) | Not native | `npm run todos:status`, `npm run todos:next`, `npm run todos:list` | Backlog is driven by `docs/process/todos-workflow.v5_00.json`. |
| `plan milestone gate ...` | Not native | `npm run todos:milestone -- M6 --run` | Milestone check validates required TODOs, then runs mapped gate commands. |
| `plan task verify ...` | Not native | `npm run todos:verify -- <TODO_ID> --scope verify` | Per-task verification commands are defined in manifest. |
| `plan task close ...` | Not native | `npm run todos:done -- <TODO_ID> --note \"...\" --evidence <path>` | Evidence links are captured into workflow state file. |
| `security dependency scan ...` | Not native | `npm run security:audit`, `npm run security:baseline` | Baseline artifacts are written to `reports/security/`. |
| `secret leakage scan ...` | Not native | `npm run security:secrets` | Scans repository text files for high-risk key patterns. |
| `frontend perf budget check ...` | Not native | `npm run perf:check --workspace=@copilot-care/frontend` | Reads current Vite manifest graph and enforces size budgets. |
| `frontend perf baseline refresh ...` | Not native | `npm run perf:baseline --workspace=@copilot-care/frontend` | Updates `reports/metrics/frontend-build-budget.baseline.json`. |
| `release gate run ...` | Not native | `npm run gate:release` | Runs `typecheck + test + workspace build + gate:all` in one command. |

## Supported OpenCode Commands Used

- `opencode --version`
- `opencode run --agent <agent> "..."`
- `opencode agent list`
