import { clearAllCaches as coreClearAllCaches } from "@tropo/core"
import { plugin } from "../provider"

// Storage schema version for TropoAudio
export const STORAGE_SCHEMA_VERSION = 2

// Clears all caches while dynamically preserving active provider keys
export const clearAllCaches = () =>
  coreClearAllCaches(plugin?.getPreservedKeys?.() || [])
