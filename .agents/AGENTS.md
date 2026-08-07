# TropoAtlas Agent Rules

This file defines the rules and conventions that the AI agent must follow when working on the `tropoatlas` project.

## General Rules
- **Discussion Mode**: If the user's prompt includes the `#discuss` keyword, you MUST NOT use any code editing or execution tools. Only analyze and discuss the topic.
- **Comments Language**: All code comments and documentation within the codebase MUST be written in **English**.
- **Comment Placement**: Do NOT place comments at the end of a line of code (inline comments). Always place comments on the line(s) directly ABOVE the code they describe.
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
- **Centralized Logic**: All LED orchestration MUST be handled centrally by a single watcher (currently in `Result/index.jsx`). Individual components (like `Album` or Modals) MUST NOT call the `Leds` API directly.
- **Filters**: LEDs are only controlled by the **Categories (Styles)** and **Creators (Artists)** filters, **text searches** (when 3 or more characters are typed), and the **Album Modal** (focus mode). The **Formats** filter does NOT interact with or modify LEDs.
- **Decoupled Intensity and Draw Priority**: When multiple layers are active, two independent rules apply:
  - **Intensity (Chronology)**: The brightness of a layer is determined by its chronological age. Older filters are dimmed to push them into the background, while the newest filter is displayed at 100% brightness.
  - **Draw Order (Semantic Priority)**: The order in which layers are sent to the ESP32 (which dictates which color overwrites the other) is strictly defined by a fixed semantic array (`DISPLAY_PRIORITY`: styles -> artists -> search -> modal). This ensures that specific layers always overwrite broader ones regardless of the order they were clicked.
- **Blink Effect**: The search layer uses a blink effect (`blink: 1`). The ESP32 firmware is designed to preserve this blink state even if a higher-priority layer (like Artist) overwrites the LED color. Do not send `blink: 0` from higher-priority layers, simply omit the parameter.
- **Color Scale Configuration**: All LED color configurations MUST use full 8-bit scale RGB values (0-255). Do not use low values to manually reduce brightness, as the system dynamically calculates and applies the `intensity` multiplier (0.0 - 1.0) before sending to the hardware.
