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
- **Filters**: LEDs are only controlled by the **Categories (Styles)** and **Creators (Artists)** filters, and the **Album Modal** (focus mode). Text searches and the **Formats** filter do NOT interact with or modify LEDs.
- **Intensity and Draw Priority**: When multiple layers are active, both intensity and draw order follow a fixed semantic priority:
  - 1. **Categories**: Lowest priority, drawn first, background intensity.
  - 2. **Creators**: Medium priority, drawn second, medium intensity.
  - 3. **Modal**: Highest priority, drawn last, high intensity.
  This fixed order ensures that specific layers (like the modal) always overwrite broader ones (like categories) in the ESP32 buffer, and their brightness reflects their semantic importance.
- **Blink Effect**: The modal layer uses a blink effect (`blink: true`). The ESP32 firmware is designed to preserve this blink state even if another layer overwrites the LED color. Do not send `blink: false` from other layers, simply omit the parameter.
- **Color Scale Configuration**: All LED color configurations MUST use full 8-bit scale RGB values (0-255). Do not use low values to manually reduce brightness, as the system dynamically calculates and applies the `intensity` multiplier (0.0 - 1.0) before sending to the hardware.

## Settings & State Management
- **Centralized Settings Store**: Dynamic user settings are managed via `useSettingsStore` (Zustand) in `@tropo/core` and persisted to `localStorage`. Components must consume these settings reactively through the store (or through exposed getters in `utils/settings.js`) rather than directly from `import.meta.env` at runtime.
- **Cache Preservation**: The settings store cache key (`settings-v1` / `SETTINGS_STORE_KEY`) MUST be preserved when clearing caches (e.g., in `clearAllCaches()` in `packages/core/src/storage.js`).
- **Decoupled Settings UI**: The main application's settings modal (`SettingsModal.jsx`) dynamically renders plugin-specific settings forms based on a declarative JSON schema. Plugins must implement `getSettingsSchema()` returning a vanilla JS array of field definitions, and MUST NOT export React components. Plugins are responsible for updating their own isolated section of the store (`pluginsConfig`).
- **Build-Time Variables**: Environment variables that affect the Vite proxy or server build (such as `VITE_SET_LEDS`, `VITE_LEDS_API_PORT`, `VITE_AUDIOLIBRARY_URL`) must remain in `.env` as they are required at build/serve time. They serve as default fallback values for the settings store on initial hydration.

## UI & i18n Considerations
- **i18n in Plugins**: Since plugins are UI-agnostic and do not import `react-i18next`, strings that require translation (like schema labels) should be wrapped in a dummy marker function (`const _ = (s) => s`) within the plugin. This allows the static analyzer (`npm run i18n:check`) to detect the keys, while the main application applies the actual translation (`t(field.label)`) at render time.
- **Offcanvas and Modals (Mobile UI)**: Stacking Bootstrap Modals over an open Offcanvas menu can cause backdrop conflicts when the modal is closed. 
  - If a button opens a global root-level Modal (e.g., `SettingsModal`), the Offcanvas MUST be explicitly closed before opening the modal.
  - If a button opens an inline Modal (e.g., `ConfirmModal` inside `SynchroButton`), the Offcanvas MUST NOT be closed, otherwise the modal will be instantly unmounted.
  - Interactive dropdowns (Styles, Artists) MUST NOT close the Offcanvas, allowing users to select multiple options without reopening the menu.
