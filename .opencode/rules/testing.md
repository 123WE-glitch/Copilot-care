# Testing Rules (Hard)

## Required for any new feature/bugfix
- At least 1 unit test for the happy path
- At least 2 edge cases (boundary/invalid inputs)
- If touching I/O: add integration test or adapter test (mock port or test container)

## Definition of Done
- Tests pass locally via the project's standard command
- New public behavior includes tests
- Failure messages are meaningful
