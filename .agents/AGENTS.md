# TropoAtlas Agent Rules

This file defines the rules and conventions that the AI agent must follow when working on the `tropoatlas` project.

## General Rules
- **Rule Scope & Governance**: Do NOT add user-specific personal preferences, transient UI styling choices, local variable names, or temporary bug-fix logic to `AGENTS.md`. Only document non-negotiable architectural invariants, system boundaries, hardware contracts, and monorepo guardrails.
- **Comments Language**: All code comments and documentation within the codebase MUST be written in **English**.
- **Comment Placement**: Do NOT place comments at the end of a line of code (inline comments). Always place comments on the line(s) directly ABOVE the code they describe.
- **Comment Line Length**: Code comments MUST NOT exceed 80 characters per line (including leading indentation and comment prefixes like `//`). Break long comments into multiple single-line comments directly above the code.
- **Commit Messages**: All git commit messages MUST be written in **English** (using Conventional Commits format). Use precise component/subsystem scopes (e.g., `header`, `navbar`, `search`, `leds`, `settings`, `agents`) rather than generic app scopes like `tropoaudio`.
- **Package Manager**: Use `npm`. Do not use `yarn`, `pnpm`, or `bun`.
- **Workspaces**: This is an npm workspace monorepo.
  - `apps/*`: Main applications (e.g., `tropoaudio`, `tropocine`).
  - `packages/*`: Shared libraries and components (e.g., `core`, `react`, `leds`).
  - `plugins/*/*`: Plugins organized by domain (e.g., `plugins/audio/discogs`, `plugins/cine/tmdb`).
- **Rule Abstraction**: Do NOT hardcode specific numeric raw values (e.g. pixel widths, arbitrary z-indices) in rule or documentation files. Document abstract design principles, responsive layout intentions, and architectural invariants instead. Exact numbers belong in code tokens and constants.
- **Code Sobriety & Single Access Path**: Avoid speculative code bloat for non-existent future requirements (KISS/YAGNI). Every class, utility method, or constant MUST have a single canonical export and access path. Avoid creating duplicate top-level function wrappers or redundant aliases for methods and constants that belong to a class or module.

## Architecture & Data Providers
- **Decoupling**: TropoAtlas uses a generic, plugin-based architecture. Applications (`apps/*`) and shared packages (`@tropo/core`) MUST remain completely agnostic and MUST NOT contain code specific to a data provider.
- **Core Agnosticism & Inversion of Control**: Shared core packages (`@tropo/core`) MUST remain strictly domain- and app-agnostic, with zero knowledge of specific data providers or consuming applications. Any provider-specific persistence needs or preserved cache keys MUST be declared dynamically by plugins via inversion of control, never hardcoded in shared libraries.
- **Plugins**: Data fetching and API logic MUST be encapsulated in a plugin inside the domain directory of `plugins/` (e.g., `plugins/audio/discogs`).
- **Configuration**: The application selects the active provider via the `VITE_DATA_PROVIDER` environment variable. Plugin-specific variables must only be parsed and validated by their respective plugin.
- **Feature Ignorance**: Plugins MUST remain completely ignorant of app-level features (e.g., IoT LEDs). Any validation logic combining app settings (like `VITE_SET_LEDS`) with provider capabilities MUST be handled by the main application.
- **Terminology**: Use generic terms in the main application state and logic (e.g., `creator`, `categories`) rather than provider-specific terms (e.g., `artist`, `styles`).
- **Development Mode Image Isolation**: In development mode (`devMode`), data provider plugins MUST NOT assign or fetch remote cover artwork URLs. This prevents API/CDN rate-limit exhaustion and unnecessary network traffic during local development.
- **Artwork & Network Agnosticism**: Application Service Workers and image cache layers MUST use generic routes and storage identifiers (e.g., `item-covers`, image proxy routes) without coupling cache names or request matching to specific third-party provider hostnames or endpoints.

## Presentation Sites (`apps/*/docs/`)
- **Location**: Static presentation site files are located in `apps/*/docs/` (`index.html` for English, `index-fr.html` for French).
- **Bilingual Parity**: Any content or structure updates to the presentation site MUST be applied to both language versions (`index.html` and `index-fr.html`) to maintain 1-to-1 parity.
- **Styles**: All CSS styles MUST be placed in `apps/*/docs/index.css`. Do NOT use inline `style="..."` attributes.
- **Zero External Dependencies**: Pages MUST be 100% self-contained and MUST NOT make external network requests (use native system font stacks instead of third-party font services).

## LEDs Behavior
- **Centralized Logic**: All LED orchestration MUST be handled centrally by a single watcher (currently in `Result/index.jsx`). Individual components (like item cards or Modals) MUST NOT call the `Leds` API directly.
- **Filters**: LEDs are only controlled by the **Categories** and **Creators** filters, and the **Item Modal** (focus mode). Text searches and secondary filters (e.g., formats) do NOT interact with or modify LEDs.
- **Intensity and Draw Priority**: When multiple layers are active, both intensity and draw order follow a fixed semantic priority:
  - 1. **Categories**: Lowest priority, drawn first, background intensity.
  - 2. **Creators**: Medium priority, drawn second, medium intensity.
  - 3. **Modal**: Highest priority, drawn last, high intensity.
  This fixed order ensures that specific layers (like the modal) always overwrite broader ones (like categories) in the ESP32 buffer, and their brightness reflects their semantic importance.
- **Blink Effect**: The modal layer uses a blink effect (`blink: true`). The ESP32 firmware is designed to preserve this blink state even if another layer overwrites the LED color. Do not send `blink: false` from other layers, simply omit the parameter.
- **Color Scale Configuration**: All LED color configurations MUST use full 8-bit scale RGB values (0-255). Do not use low values to manually reduce brightness, as the system dynamically calculates and applies the `intensity` multiplier (0.0 - 1.0) before sending to the hardware.

## Settings & State Management
- **Centralized Settings Store**: Dynamic user settings are managed via `useSettingsStore` (Zustand) in `@tropo/core` and persisted to `localStorage`. Components must consume these settings reactively through the store (or through exposed getters in `utils/settings.js`) rather than directly from `import.meta.env` at runtime.
- **Cache Preservation**: User preference and settings stores MUST be preserved when clearing caches.
- **Application Storage Autonomy**: Each application independently governs its own local storage schema and data lifecycle. Schema versioning is strictly application-scoped so that structural migrations or cache invalidations in one application never cascade to other applications in the monorepo.
- **Interchange Format Decoupling**: Portable backup and export archive formats represent transport specifications and MUST remain completely decoupled from internal, transient local storage schemas.
- **Decoupled Settings UI**: Application settings modals (`SettingsModal.jsx`) dynamically render plugin-specific settings forms based on a declarative JSON schema. Plugins must implement `getSettingsSchema()` returning a vanilla JS array of field definitions, and MUST NOT export React components. Plugins are responsible for updating their own isolated section of the store (`pluginsConfig`).
- **Build-Time Variables**: Environment variables that configure the Vite server, proxy targets, or host hardware build parameters must remain in `.env` as they are required at build/serve time. They serve as default fallback values for the settings store on initial hydration.

## UI & i18n Considerations
- **i18n in Non-UI Packages & Plugins**: Since non-UI packages (e.g., `@tropo/core`, `@tropo/leds`) and plugins are UI-agnostic and do not import `react-i18next`, any user-facing strings or error messages requiring translation MUST be wrapped in a dummy marker function (`const t = (s) => s`). This allows the static analyzer (`npm run i18n:check`) to detect the keys, while the main application applies the actual translation (`t(...)`) at render time.
- **Offcanvas and Modals (Mobile UI)**: Stacking Bootstrap Modals over an open Offcanvas menu can cause backdrop conflicts when the modal is closed. 
  - If a button opens a global root-level Modal (e.g., `SettingsModal`), the Offcanvas MUST be explicitly closed before opening the modal.
  - If a button opens an inline Modal declared within a sub-component, the Offcanvas MUST NOT be closed, otherwise the modal will be instantly unmounted.
  - Interactive filter dropdowns (e.g., categories, creators) MUST NOT close the Offcanvas, allowing users to select multiple options without reopening the menu.

## Lifecycle & Header Navigation Architecture
- **Unreliable Page Unload Events**: Do NOT rely on browser window unload events (`pagehide`, `beforeunload`, `unload`) to execute critical I/O operations or network requests (e.g., turning off hardware LEDs or clearing storage). Hardware teardown and session cleanup must rely on explicit user actions or server/firmware TTL timeouts.
- **Header Layout & Separation of Concerns**: The main navigation header separates collection exploration controls (filters, search, sort) centered in the primary bar from system tools & preferences (settings, sync, LEDs, theme) consolidated into a single right-anchored `OptionsMenu` dropdown.
- **Theme Hydration & FOUC Prevention**: Initial theme hydration (`data-theme`) MUST be executed synchronously via an inline script in the `<head>` of `index.html` before initial DOM paint to prevent Flash of Unstyled Content (FOUC). React components MUST NOT duplicate initial hydration logic on page reload.
