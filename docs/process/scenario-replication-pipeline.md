# Scenario Replication Pipeline (M5)

## Purpose

Provide a repeatable command to replicate baseline scenarios for new sites or
new batches without changing core fixtures.

## Command

```bash
npm run scenarios:replicate -- --set-id <set-id> --repeat <count>
```

Defaults:

- `set-id`: `site-alpha`
- `repeat`: `20`

Output:

- `reports/scenarios/replicated/<set-id>.json`

## Replication Format

Each replicated sample includes:

- `sampleId`
- `sourceScenarioId`
- `sourceCaseCode`
- `request`
- `expected`

`sessionId` and `patientId` are suffixed for deterministic uniqueness.

## Baseline Validation Procedure

After generating a replicated set:

1. run scenario gate:
   - `npm run gate:scenarios`
2. run full workflow:
   - `npm run devwf:full`

If either fails, the replicated set is not accepted for transfer.
