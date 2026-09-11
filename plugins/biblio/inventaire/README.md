# Inventaire Data Provider Plugin (`@tropo/inventaire`)

This plugin integrates **Inventaire.io** with **TropoBiblio**, enabling collection synchronization, private notes metadata parsing, and open knowledge enrichment (Wikipedia, Open Library, Wikidata).

## Features

- **Collection Synchronization**: Imports books and comics from personal Inventaire.io user accounts.
- **Private Notes Custom Metadata**: Extracts physical shelf locations (`#place`), purchase prices (`#price`), ratings (`#rating`), and genres (`#categories`) directly from user private notes.
- **Multi-Source Enrichment**: Automatically enriches books with synopses and authors from Wikipedia, Open Library, and Wikidata.
- **Image Proxying**: Routes cover artwork through `/api/inventaire-image/` to prevent CORS issues, support offline PWA caching, and enable instant client-side ZIP exports.
- **Rate-Limiting Protection**: Safe paced queries (60 requests/minute) with automatic backoff.

## Configuration

Environment variables for `apps/tropobiblio`:

```env
VITE_DATA_PROVIDER="inventaire"
VITE_INVENTAIRE_USER="<your_username_or_email>"
VITE_INVENTAIRE_PASSWORD="<your_password>"
```
