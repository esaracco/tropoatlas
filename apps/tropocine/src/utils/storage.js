import { clearAllCaches as coreClearAllCaches } from "@tropo/core"
import { plugin } from "../provider"

// Storage schema version for TropoCine
export const STORAGE_SCHEMA_VERSION = 1

// Clears all caches while dynamically preserving active provider keys
export const clearAllCaches = () =>
  coreClearAllCaches(plugin?.getPreservedKeys?.() || [])
