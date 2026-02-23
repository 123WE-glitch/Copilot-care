# Superpower Rules (Hard)

## Scope

These rules govern OpenCode execution for the CoPilot Care project. They are derived from the reference architecture and applied to the current TypeScript monorepo.

## Hard Limits

- Do not generate direct prescription decisions.
- Do not replace clinician final diagnosis responsibility.
- Do not recommend non-escalation when red-flag symptoms are present.
- Do not output deterministic diagnosis when confidence is below 0.7.

## Mandatory Checks

- Minimum information set (MIS) completeness validation.
- Blood pressure logical consistency check (`SBP > DBP`).
- Red-flag short-circuit check.
- Dissent Index (DI) threshold check.
- Full audit trace attachment for key decisions.

## Dissent Index

- `DI < 0.2`: consensus, continue to output.
- `0.2 <= DI < 0.4`: light debate allowed.
- `0.4 <= DI < 0.7`: deep debate and arbiter required.
- `DI >= 0.7`: escalation or conservative fallback required.

## Review Triggers

- Block terms implying direct diagnosis or prescribing authority.
- Block bypasses of red-flag routing.
- Warn on uncertainty handling without abstain/escalate path.

## Gate Expectations

- Architecture workflow gate must be present in workflow checks.
- Safety gate must fail when rule markers or required docs are missing.
- ADR gate must fail when ADR-triggering changes are introduced without a new ADR.
