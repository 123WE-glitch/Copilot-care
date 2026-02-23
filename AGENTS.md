# AGENTS.md

## Build, Test & Lint Commands

### Root (Monorepo)
```bash
# Run tests in all workspaces
npm test

# Install dependencies for all workspaces
npm install
```

### Backend (src/backend)
```bash
# Build TypeScript
npm run build

# Run all tests
npm run test

# Run a single test file
npm run test -- path/to/test.ts

# Run tests matching a pattern
npm run test -- --testNamePattern="pattern"

# Start the server
npm start
```

### Frontend (src/frontend)
```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Shared (src/shared)
```bash
# Build TypeScript (no separate build script defined)
npx tsc
```

## Code Style Guidelines

### TypeScript
- **Target**: ES2020
- **Module**: CommonJS (backend), ES modules (frontend via Vite)
- **Strict mode**: Enabled
- **Always use explicit types** on public APIs and function parameters

### Naming Conventions
- **Classes**: PascalCase (e.g., `DebateEngine`, `AgentBase`)
- **Interfaces/Types**: PascalCase (e.g., `AgentOpinion`, `PatientProfile`)
- **Variables/functions**: camelCase (e.g., `calculateDissent`, `patientId`)
- **Abstract classes**: Prefix with descriptive naming (e.g., `AgentBase`)
- **Constants**: UPPER_SNAKE_CASE for true constants

### Imports & Dependencies
- Use explicit imports from shared package: `import { Type } from '@copilot-care/shared/types'`
- Group imports: external dependencies first, then internal modules
- Use path aliases where configured

### Formatting
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line length**: ~80-100 characters
- Use trailing commas in multi-line objects/arrays

### Error Handling
- Use typed errors or error codes - no raw string throws
- Infrastructure errors must be translated to application/domain errors at boundaries
- Prefer explicit error types over generic Error

### Architecture Rules (Enforced)

#### Layering (Dependency Direction)
- `src/domain/**` MUST NOT import from:
  - `src/infrastructure/**`
  - `src/interfaces/**`
- `src/application/**` MUST NOT import from:
  - `src/interfaces/**`
- `src/infrastructure/**` and `src/interfaces/**` MAY depend on `domain` and `application`

#### Ports & Adapters
- All I/O (DB, HTTP, Queue, FS, network) MUST be implemented in `infrastructure` (adapters)
- `domain` and `application` define interfaces (ports) and depend on abstractions only
- Adapters implement ports; wiring/composition happens in a single composition root

#### No Hidden Globals
- No singletons with hidden state in domain/application
- Side effects must be explicit and injected

## Testing Requirements

### Required for Any Feature/Bugfix
- At least 1 unit test for the happy path
- At least 2 edge cases (boundary/invalid inputs)
- If touching I/O: add integration test or adapter test (mock port or test container)

### Definition of Done
- Tests pass locally via `npm test`
- New public behavior includes tests
- Failure messages are meaningful

## ADR (Architecture Decision Records)

Create an ADR when:
- Adding new external dependency or framework
- Changing module boundaries / layering rules
- Public API change (request/response schema, SDK interfaces)
- Data model change requiring migration
- Cross-service contract change
- Security model change (authn/authz, token, secrets, encryption)
- Performance-critical design (caching, batching, async pipeline)
- Operational change (deployment, CI/CD strategy)

**Format**: Place in `docs/adr/NNNN-title-in-kebab-case.md`
Include: Context, Decision, Alternatives, Consequences, Rollout/Backout

## Project Structure

```
src/
├── domain/          # Business entities and rules (no external deps)
├── application/     # Use cases and application logic
├── infrastructure/  # External adapters (DB, HTTP, etc.)
├── interfaces/      # API/controllers/presenters
├── backend/         # Express.js API implementation
├── frontend/        # Vue 3 + Vite SPA
└── shared/          # Shared types and utilities
```

## Key Technologies

- **Backend**: Express.js, TypeScript, Jest, ts-jest, LangChain
- **Frontend**: Vue 3, Vite, TypeScript, Pinia, Vue Router, ECharts
- **Shared**: TypeScript type definitions
- **Testing**: Jest with ts-jest
