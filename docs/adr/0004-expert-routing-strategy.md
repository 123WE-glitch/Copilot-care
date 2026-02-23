# ADR 0004: Expert Routing Strategy

Status: Accepted
Date: 2026-02-22

## Context

The current system uses a basic routing mechanism. We need to specialize routing for different expert roles (Cardiology, GP, Metabolic, Safety) to improve accuracy and safety.

## Decision

Implement a role-based routing strategy using specific LLM providers for each role:

- **Cardiology:** DeepSeek (reasoning strength)
- **General Practice (GP):** Gemini (balanced)
- **Metabolic:** Gemini (context window)
- **Safety:** Kimi (safety guardrails)

Define KPIs for each role:
- Accuracy
- Safety
- Latency
- Cost

## Alternatives

1. **Single Provider (e.g., all Gemini or all OpenAI)**
   - Rejected due to lack of specialization. DeepSeek is preferred for complex reasoning (Cardiology), and Kimi is preferred for safety checks.

2. **Dynamic/Random Routing**
   - Rejected due to unpredictability and difficulty in tracing decisions/auditing.

## Consequences

- Improved specialization and potential accuracy/safety gains.
- Potential increased complexity in provider management and configuration (requires multiple API keys).
- Latency might vary between providers.

## Rollout/Backout

### Rollout
1. Configure `opencode.json` or environment variables to map roles to the selected providers.
2. Verify the mapping using the runtime architecture endpoint (`/architecture/experts`).

### Backout
1. Revert the configuration to use `auto` or a single provider (e.g., `Gemini` for all).
2. Remove role-specific overrides.
