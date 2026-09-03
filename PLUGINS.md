# TropoAtlas Data Providers

This folder contains the plugins that act as data providers for TropoAtlas applications.
TropoAtlas is decoupled from any specific media database (like Discogs or TMDB). Applications interact with the user's collection through a unified interface.

Plugins are categorized by media domain:
- `plugins/audio/*`: Audio providers (e.g. `plugins/audio/discogs`)
- `plugins/cine/*`: Film and TV providers (e.g. `plugins/cine/tmdb`)
- `plugins/biblio/*`: Book and comic providers (e.g. `plugins/biblio/openlibrary`)

## Creating a new Provider Plugin

To create a new provider (e.g., `musicbrainz`), you must create a new package inside the corresponding domain directory (`plugins/<domain>/<provider>`) that exports a class extending `BasePlugin` (from `@tropo/core`).

### Implementing the BasePlugin Interface

Your plugin class must implement the following methods:

- **`getProviderInfo()`**: Returns `{ name, url, logo, multipleFormats }`.
- **`validateSettings(onConfigError)`**: Validates that required environment variables are set.
- **`getCustomFieldsInfo()`**: Returns `{ supportsPlace, supportsPrice, supportsCategories }`.
- **`getCollection(onProgress)`**: Fetches all the lightweight items from the API, mapping them to the internal `Item` format.
- **`getItemDetails(item)`**: Fetches additional detailed data (tracklist, full notes, etc.) for a specific item.
- **`getItemImage(item)`**: Fetches the artwork image `{ cover }` for an item.
- **`updateItem(item, changes)`**: Updates user-specific data on the remote service (e.g. rating, location/place, price, custom categories).
- **`getCategories(items)`**: Extracts and sorts all unique categories from the given collection of items.
- **`getMaxRequestsPerMinute()`**: Returns the maximum allowed API requests per minute (defaults to `60` if omitted or higher).

### Example Plugin Skeleton

```javascript
import { BasePlugin } from "@tropo/core"

export class DummyPlugin extends BasePlugin {
  constructor(config = {}) {
    super()
    const env = config.env || {}
    this.user = env.VITE_DUMMY_USER || config.user
    this.devMode = config.devMode || false
    this.apiBase = config.apiBase || "https://api.dummy.com"
  }

  getProviderInfo() {
    return {
      name: "Dummy",
      url: "https://www.dummy.com",
      logo: null,
      multipleFormats: true,
    }
  }

  // ... implement all other abstract methods ...
}
```

### Integration

Once your plugin is ready, it is dynamically instantiated in `apps/tropoaudio/src/provider/index.js` based on the `VITE_DATA_PROVIDER` environment variable.
