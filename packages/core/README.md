# @tropo/core

Core utilities, configuration constants, storage abstraction, collection backup/export, and global state management (Zustand) for the TropoAtlas project.

This package contains domain-agnostic logic shared across the React application and plugins:

- Storage abstraction (IndexedDB / LocalStorage) with schema versioning and segmented cache keys
- Rate-limited collection backup export (ZIP archive generation with binary artwork proxying, strict MIME validation, and metadata enrichment) and offline import
- BasePlugin contract definition (declarative settings schema, creators extraction, categories extraction, and image proxy routing)
- Dynamic duration estimation and parallel request sequencing
- Settings store (Zustand) and reactive state management
