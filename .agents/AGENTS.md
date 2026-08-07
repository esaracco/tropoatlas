# TropoAtlas Agent Rules

This file defines the rules and conventions that the AI agent must follow when working on the `tropoatlas` project.

## General Rules
- **Discussion Mode**: If the user's prompt includes the `#discuss` keyword, you MUST NOT use any code editing or execution tools. Only analyze and discuss the topic.
- **Comments Language**: All code comments and documentation within the codebase MUST be written in **English**.
- **Commit Messages**: All git commit messages MUST be written in **English** (using Conventional Commits format).
- **Package Manager**: Use `npm`. Do not use `yarn`, `pnpm`, or `bun`.
- **No npm scripts**: DO NOT run `npm run` scripts (such as `npm run lint`, `npm run format`, `npm run pre-commit`, `npm run i18n:check`, etc.). The agent must not execute these commands.
- **Workspaces**: This is an npm workspace monorepo.
  - `apps/*`: Main applications (e.g., `tropodisc`).
  - `packages/*`: Shared libraries and components (e.g., `core`, `react`, `leds`).
  - `plugins/*`: Plugins (e.g., `discogs`).

## Architecture & Data Providers
- **Decoupling**: TropoAtlas uses a generic, plugin-based architecture. The main application (`apps/tropodisc`) MUST remain completely agnostic and MUST NOT contain code specific to a data provider (like Discogs).
- **Plugins**: Data fetching and API logic MUST be encapsulated in a plugin inside the `plugins/` directory (e.g., `plugins/discogs`).
- **Configuration**: The application selects the active provider via the `VITE_DATA_PROVIDER` environment variable. Plugin-specific variables (like `VITE_DISCOGS_USER`) must only be parsed and validated by their respective plugin.
- **Feature Ignorance**: Plugins MUST remain completely ignorant of app-level features (e.g., IoT LEDs). Any validation logic combining app settings (like `VITE_SET_LEDS`) with provider capabilities MUST be handled by the main application.
- **Terminology**: Use generic terms in the main application state and logic (e.g., `creator`, `categories`) rather than provider-specific terms (e.g., `artist`, `styles`).

## Presentation Site (`apps/tropodisc/docs/`)
- **Location**: Static presentation site files are located in `apps/tropodisc/docs/` (`index.html` for English, `index-fr.html` for French).
- **Bilingual Parity**: Any content or structure updates to the presentation site MUST be applied to both language versions (`index.html` and `index-fr.html`) to maintain 1-to-1 parity.
- **Styles**: All CSS styles MUST be placed in `apps/tropodisc/docs/index.css`. Do NOT use inline `style="..."` attributes.
- **Zero External Dependencies**: Pages MUST be 100% self-contained and MUST NOT make external network requests (use native system font stacks instead of third-party font services).

## LEDs Behavior
- **Filters**: LEDs are only controlled by the **Categories (Styles)** and **Creators (Artists)** filters, as well as **text searches** (when 3 or more characters are typed).
- **Formats**: The **Formats** filter does NOT interact with or modify LEDs in any way.
- **Multiple Filters**: When multiple filters are active (e.g., both Styles and Artists), their corresponding LEDs should light up independently. Multiple calls to the IoT server must be made sequentially using the `noreset` parameter to preserve the LEDs of the previous filter. If an album matches multiple active filters, the IoT controller does NOT blend colors; the last filter processed (Artists) overwrites the LED color for that specific album.
- **Color Scale Configuration**: All LED color configurations (e.g., environment variables) MUST use full 8-bit scale RGB values (0-255). Do not use low values to manually reduce brightness, as the microcontroller already handles global brightness scaling, and low values will cause severe precision loss. Any visual balancing (e.g., reducing green intensity) must be done proportionally within this full 0-255 scale.
