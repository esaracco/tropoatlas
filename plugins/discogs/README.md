# @tropo/discogs

The official Discogs Data Provider plugin for TropoAtlas.

It implements the generic `CollectionProvider` interface expected by TropoDisc, handling:

- Discogs API authentication and proxying
- Data fetching with pagination
- Mapping Discogs releases to the generic TropoAtlas items format
- Updating custom fields on Discogs
- Rate limiting compliance (60 requests per minute with automatic 429 retry backoff)
- Detail and artwork extraction for collection backup exports
