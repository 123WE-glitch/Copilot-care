# Superpower Plugin (OpenCode)

This plugin enforces project governance for CoPilot Care.

## What it does

- Applies model overrides from environment variables.
- Ensures required instruction files are configured and resolvable.
- Enforces strict permission behavior for Planner and Reviewer.
- Annotates tool executions with Superpower gate metadata.

## Environment Variables

- `OPENCODE_MODEL_PLAN`: override model for `plan` agent.
- `OPENCODE_MODEL_BUILD`: override model for `build` agent.
- `OPENCODE_MODEL_REVIEW`: override model for `reviewer` agent.

If these variables are absent, `opencode.json` defaults are used.

## Hook Coverage

- `config`: validates instruction targets and applies model overrides.
- `permission.ask`: enforces role-based guardrails and asks for mutating actions.
- `tool.execute.before`: injects gate metadata into tool args when possible.
- `tool.execute.after`: appends audit metadata and marks mutating tool calls.

## Troubleshooting

- Startup fails with missing instructions:
  - Ensure all files listed in `opencode.json.instructions` exist.
- Reviewer can still edit:
  - Verify `agent.reviewer.permission` and plugin path in `opencode.json`.
- Model override not applied:
  - Check environment variable names and restart OpenCode session.
