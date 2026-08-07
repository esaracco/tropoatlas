# TropoAtlas Data Providers

This folder contains the plugins that act as data providers for TropoAtlas applications.
TropoAtlas is decoupled from any specific music database (like Discogs). The `tropodisc` app interacts with the user's collection through a unified interface.

## Creating a new Provider Plugin

To create a new provider (e.g., `musicbrainz`), you must create a new package inside this `plugins/` directory that exports a class extending `BasePlugin` (from `@tropo/core`).

### Implementing the BasePlugin Interface

Your plugin class must implement the following methods:

- **`getProviderInfo()`**: Returns `{ name, url, logo, multipleFormats }`.
- **`validateSettings(onConfigError)`**: Validates that required environment variables are set.
- **`getCustomFieldsInfo()`**: Returns `{ supportsPlace, supportsPrice, supportsCategories }`.
- **`getCollection(onProgress)`**: Fetches all the lightweight items from the API, mapping them to the internal `Item` format.
- **`getItemDetails(item)`**: Fetches additional detailed data (tracklist, full notes, etc.) for a specific item.
- **`getItemImages(item)`**: Fetches the high and low resolution images `{ cover, thumb }` for an item.
- **`updateItem(item, changes)`**: Updates user-specific data on the remote service (e.g. rating, location/place, price, custom categories).
- **`getCategories(items)`**: Extracts and sorts all unique categories from the given collection of items.

### Example Plugin Skeleton

```javascript
import { BasePlugin } from "@tropo/core"

export class DummyPlugin extends BasePlugin {
  constructor(config = {}) {
    super()
    this.token = config.env.VITE_DUMMY_TOKEN
  }

  getProviderInfo() {
    return {
      name: "Dummy",
      url: "https://dummy.com",
      logo: null,
      multipleFormats: true,
    }
  }

  // ... implement all other abstract methods ...
}
```

### Integration

Once your plugin is ready, it is dynamically instantiated in `apps/tropodisc/src/provider/index.js` based on the `VITE_DATA_PROVIDER` environment variable.
