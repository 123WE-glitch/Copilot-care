# ADR Rules

## When an ADR is REQUIRED (any one triggers)
- New external dependency or framework (DB/ORM/message queue/auth/cache)
- Changes to module boundaries / layering rules
- Public API change (request/response schema, SDK interfaces)
- Data model change requiring migration
- Cross-service contract change
- Security model change (authn/authz, token, secrets, encryption)
- Performance-critical design (caching strategy, batching, async pipeline)
- Operational change (deployment topology, CI/CD strategy)

## ADR Format
- Must be placed in `docs/adr/`
- File name: `NNNN-title-in-kebab-case.md`
- Include: Context, Decision, Alternatives, Consequences, Rollout/Backout
