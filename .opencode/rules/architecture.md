# Architecture Rules (Hard)

## Layering (Dependency Direction)

- `src/domain/**` MUST NOT import from:
  - `src/infrastructure/**`
  - `src/interfaces/**`
- `src/application/**` MUST NOT import from:
  - `src/interfaces/**`
- `src/infrastructure/**` and `src/interfaces/**` MAY depend on `domain` and `application`.

## Ports and Adapters

- All I/O (DB, HTTP, Queue, FS, network) MUST be implemented in `infrastructure` adapters.
- `domain` and `application` define interfaces (ports) and depend on abstractions only.
- Adapters implement ports; wiring/composition happens in a single composition root (for example `src/main.ts` or `src/bootstrap/**`).

## Error Handling

- Domain/application errors must use typed errors or error codes.
- No raw string throws in domain/application code.
- Infrastructure errors must be translated at boundaries before surfacing upstream.

## No Hidden Globals

- No singletons with hidden mutable state in domain/application.
- Side effects must be explicit and injected.

## Required Review Checklist

- New module: explain boundary and dependency direction.
- New I/O: include port interface, adapter implementation, and tests.
