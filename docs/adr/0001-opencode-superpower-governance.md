# ADR 0001: OpenCode Superpower Governance Baseline

## Context

The repository uses a TypeScript monorepo (`backend/frontend/shared`) while the reference architecture includes broader conceptual commands and a Python-oriented example layout. We need a governance implementation that is executable in the current repository and compatible with OpenCode `1.2.6`.

## Decision

- Keep the existing TypeScript runtime architecture.
- Use `opencode.json` as the single runtime configuration entrypoint.
- Treat `.opencode/agents.yaml`, `.opencode/workflows.yaml`, and `.opencode/superpower.yaml` as documentation-source artifacts.
- Implement a Superpower plugin at `.opencode/plugins/superpower/index.js` for:
  - config validation and model override injection,
  - permission enforcement by role,
  - tool execution metadata annotation.
- Add hard gates via npm scripts:
  - `gate:safety`
  - `gate:workflow`
  - `gate:scenarios`

## Alternatives

1. Full migration to Python/FastAPI reference layout.
- Rejected due to high migration cost and mismatch with current codebase.

2. Keep conceptual docs only, no executable gates.
- Rejected due to low enforceability and weak auditability.

3. Maintain two runtime config standards (`opencode.json` and YAML runtime).
- Rejected due to drift risk and operational complexity.

## Consequences

- Governance is immediately enforceable in the existing repository.
- Reference architecture intent is preserved through mapped docs and rules.
- Some conceptual commands remain unavailable in current OpenCode CLI and are replaced by repository scripts.

## Rollout/Backout

Rollout:
1. Apply `opencode.json` updates and plugin registration.
2. Add rule/docs/ADR artifacts.
3. Run `npm run gate:safety` and `npm run gate:workflow`.
4. Run `npm run gate:scenarios` when tests are ready.

Backout:
1. Remove plugin entry from `opencode.json`.
2. Revert governance files introduced by this ADR.
3. Restore previous minimal OpenCode configuration.
