# @tropo/core

Core utilities, configuration constants, storage abstraction, collection backup/export, and global state management (Zustand) for the TropoAtlas project.

This package contains domain-agnostic logic shared across the React application and plugins:

- Storage abstraction (IndexedDB / LocalStorage) with schema versioning
- Rate-limited collection backup export (ZIP archive generation with binary artwork and metadata enrichment) and offline import
- Dynamic duration estimation and parallel request sequencing
- Settings store and reactive state management
