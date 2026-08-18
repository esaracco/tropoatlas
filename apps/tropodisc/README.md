# tropodisc

TropoDisc is the main React application for the TropoAtlas project.

It serves as a universal music collection manager, decoupled from any specific data source. It relies on plugins (like `@tropo/discogs`) to fetch and update data through a common `CollectionProvider` interface.

Key features include:

- Fast collection exploration, search, and multi-criteria filtering
- Custom metadata and physical shelf location mapping
- Physical LED shelf locator integration via `@tropo/leds`
- Complete collection backup (metadata + cover artwork) and offline restore
- Modular settings management and multi-theme support

For full project details, architecture, and deployment instructions, please see the [main TropoAtlas README](../../README.md).
