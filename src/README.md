# Source Layout Note

The executable implementation for this project lives in:

- `src/backend`
- `src/frontend`
- `src/shared`

Legacy placeholder files under root-level `src/application`, `src/domain`,
`src/infrastructure`, and `src/interfaces` have been removed to prevent
duplicate architecture paths.

If a future iteration restores a multi-package hexagonal split at root level,
it must be introduced via ADR and wired into runtime/tests explicitly.
