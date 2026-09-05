import { clearAllCaches as coreClearAllCaches } from "@tropo/core"
import { plugin } from "../provider"

// Clears all caches while dynamically preserving active provider keys
export const clearAllCaches = () =>
  coreClearAllCaches(plugin?.getPreservedKeys?.() || [])
