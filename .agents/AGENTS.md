# TropoAtlas Agent Rules

This file defines the rules and conventions that the AI agent must follow when working on the `tropoatlas` project.

## General Rules
- **Comments Language**: All code comments and documentation within the codebase MUST be written in **English**.
- **Commit Messages**: All git commit messages MUST be written in **English** (using Conventional Commits format).
- **Package Manager**: Use `npm`. Do not use `yarn`, `pnpm`, or `bun`.
- **Workspaces**: This is an npm workspace monorepo.
  - `apps/*`: Main applications (e.g., `tropodisc`).
  - `packages/*`: Shared libraries and components (e.g., `core`, `react`, `leds`).
  - `plugins/*`: Plugins (e.g., `discogs`).

## Architecture & Data Providers
- **Decoupling**: TropoAtlas uses a generic, plugin-based architecture. The main application (`apps/tropodisc`) MUST remain completely agnostic and MUST NOT contain code specific to a data provider (like Discogs).
- **Plugins**: Data fetching and API logic MUST be encapsulated in a plugin inside the `plugins/` directory (e.g., `plugins/discogs`).
- **Configuration**: The application selects the active provider via the `VITE_DATA_PROVIDER` environment variable. Plugin-specific variables (like `VITE_DISCOGS_USER`) must only be parsed and validated by their respective plugin.
- **Terminology**: Use generic terms in the main application state and logic (e.g., `creator`, `categories`) rather than provider-specific terms (e.g., `artist`, `styles`).

## Presentation Site (`apps/tropodisc/docs/`)
- **Location**: Static presentation site files are located in `apps/tropodisc/docs/` (`index.html` for English, `index-fr.html` for French).
- **Bilingual Parity**: Any content or structure updates to the presentation site MUST be applied to both language versions (`index.html` and `index-fr.html`) to maintain 1-to-1 parity.
- **Styles**: All CSS styles MUST be placed in `apps/tropodisc/docs/index.css`. Do NOT use inline `style="..."` attributes.
- **Zero External Dependencies**: Pages MUST be 100% self-contained and MUST NOT make external network requests (use native system font stacks instead of third-party font services).
