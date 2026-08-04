# TropoAtlas Agent Rules

This file defines the rules and conventions that the AI agent must follow when working on the `tropoatlas` project.

## General Rules
- **Comments Language**: All code comments and documentation within the codebase MUST be written in **English**.
- **Package Manager**: Use `npm`. Do not use `yarn`, `pnpm`, or `bun`.
- **Workspaces**: This is an npm workspace monorepo.
  - `apps/*`: Main applications (e.g., `tropodisc`).
  - `packages/*`: Shared libraries and components (e.g., `core`, `react`, `leds`).
  - `plugins/*`: Plugins (e.g., `discogs`).

## Code Style & Formatting
- **Formatting**: Use Prettier. Run `npm run format` after significant changes to ensure formatting consistency.
- **Linting**: ESLint is used. Ensure new code passes `npm run lint`. Fix issues with `npm run lint-fix` if needed.

## Testing
- **Framework**: Vitest is used for testing.
- **Running Tests**: Use `npm test` to run the test suite. Ensure tests pass before concluding tasks.

## Code Quality
- Ensure that the project builds correctly after changes (`npm run build`).
- Before finalizing a task that involves significant changes, run the `pre-commit` script (`npm run pre-commit`) to ensure everything is compliant.
