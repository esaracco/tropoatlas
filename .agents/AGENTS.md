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

## Architecture & Data Providers
- **Decoupling**: TropoAtlas uses a generic, plugin-based architecture. The main application (`apps/tropodisc`) MUST remain completely agnostic and MUST NOT contain code specific to a data provider (like Discogs).
- **Plugins**: Data fetching and API logic MUST be encapsulated in a plugin inside the `plugins/` directory (e.g., `plugins/discogs`).
- **Configuration**: The application selects the active provider via the `VITE_DATA_PROVIDER` environment variable. Plugin-specific variables (like `VITE_DISCOGS_USER`) must only be parsed and validated by their respective plugin.
- **Terminology**: Use generic terms in the main application state and logic (e.g., `creator`, `categories`) rather than provider-specific terms (e.g., `artist`, `styles`).
