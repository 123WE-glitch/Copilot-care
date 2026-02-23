# Risk Trigger Matrix (v4.30 / M4)

Machine-checkable source:

- `src/backend/src/infrastructure/governance/riskTriggerMatrix.ts`
- validation test: `src/backend/src/tests/architecture/risk-trigger-matrix.test.ts`

## Runtime Trigger -> Action

| Trigger ID | Condition | Error Code | Action | Release Block |
|---|---|---|---|---|
| `RTM-001` | required field missing | `ERR_MISSING_REQUIRED_DATA` | `REQUEST_DATA_COMPLETION` | No |
| `RTM-002` | invalid vital sign pair | `ERR_INVALID_VITAL_SIGN` | `REJECT_INVALID_INPUT` | No |
| `RTM-003` | low confidence output | `ERR_LOW_CONFIDENCE_ABSTAIN` | `ABSTAIN_AND_OFFLINE_REVIEW` | No |
| `RTM-004` | unresolved conflict | `ERR_CONFLICT_UNRESOLVED` | `ABSTAIN_AND_OFFLINE_REVIEW` | No |
| `RTM-005` | safety red-flag/escalation | `ERR_ESCALATE_TO_OFFLINE` | `ESCALATE_TO_OFFLINE_IMMEDIATELY` | No |
| `RTM-006` | missing guideline evidence | `ERR_GUIDELINE_EVIDENCE_MISSING` | `BLOCK_OUTPUT_UNTIL_EVIDENCE` | Yes |
| `RTM-007` | adversarial prompt detected | `ERR_ADVERSARIAL_PROMPT_DETECTED` | `SECURITY_BLOCK_AND_AUDIT` | Yes |

## Release Trigger -> Action

| Trigger ID | Condition | Action | Gate Command |
|---|---|---|---|
| `RTM-008` | key metrics breach threshold | `BLOCK_RELEASE` | `npm run gate:metrics` |
| `RTM-009` | review package missing gate evidence | `BLOCK_RELEASE` | `npm run gate:all` |

## ERR Path Mapping Policy

All `ERR_*` values in `src/shared/types.ts` must map to exactly one runtime
trigger rule in the matrix.

The automated test enforces:

- complete `ERR_*` coverage,
- deterministic one-to-one mapping (no duplicates),
- release-block trigger presence for governance failures.
