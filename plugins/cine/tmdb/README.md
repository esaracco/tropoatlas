# TMDB Data Provider Plugin (`@tropo/tmdb`)

This plugin integrates **The Movie Database (TMDB)** API with **TropoCine**, allowing collection synchronization from custom TMDB lists.

## Features

- **List Synchronization**: Imports custom lists using either list ID (e.g. `8691537`) or formatted slugs (e.g. `8691537-liste-perso`).
- **Enriched Metadata**: Automatically extracts directors, main cast members, runtime, synopsis, posters, backdrops, and genres.
- **Unified Creators**: Extracts all unique directors and cast members (`getCreators`) for interactive people discovery and multi-criteria filtering.
- **Smart Incremental Refresh**: Skips already cached movies in IndexedDB for fast syncs, with full re-synchronization on demand.
- **Image Proxying**: Provides `/api/tmdb-image/` URL resolution (`getImageProxyUrl`) to bypass CORS restrictions during client-side ZIP exports.
- **Rate-Limiting Protection**: Safe paced queries (1200 requests/minute) with automatic backoff on HTTP 429 status.

## Configuration

Required environment variables for `apps/tropocine`:

```env
VITE_DATA_PROVIDER="tmdb"
VITE_TMDB_LIST_ID="8691537"
TMDB_TOKEN="<your_v4_read_access_token>"
```
