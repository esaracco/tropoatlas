import localforage from "localforage"

export const buildCacheKey = (...parts) => parts.filter(Boolean).join("-")

export const setLargeItem = async (name, value) => {
  try {
    await localforage.setItem(buildCacheKey(name), value)
  } catch (err) {
    console.error(`Error saving ${buildCacheKey(name)} to IndexedDB:`, err)
  }
}

export const getLargeItem = async (name) => {
  try {
    const value = await localforage.getItem(buildCacheKey(name))
    return value
  } catch (err) {
    console.error(`Error reading ${buildCacheKey(name)} from IndexedDB:`, err)
    return null
  }
}

export const removeLargeItem = async (name) => {
  try {
    await localforage.removeItem(buildCacheKey(name))
  } catch (err) {
    console.error(`Error removing ${buildCacheKey(name)} from IndexedDB:`, err)
  }
}

export const setItem = (name, value) => {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(buildCacheKey(name), JSON.stringify(value))
  } catch (err) {
    console.warn(`Error writing ${name} to localStorage:`, err)
  }
}

export const getItem = (name) => {
  if (typeof localStorage === "undefined") return null
  try {
    const item = localStorage.getItem(buildCacheKey(name))
    return item ? JSON.parse(item) : null
  } catch (err) {
    console.warn(`Error reading ${name} from localStorage:`, err)
    return null
  }
}

export const removeItem = (name) => {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.removeItem(buildCacheKey(name))
  } catch (err) {
    console.warn(`Error removing ${name} from localStorage:`, err)
  }
}

// Keys that must never be removed during cache clears (user preferences,
// UI state, and structural schema version metadata).
export const DEFAULT_PRESERVED_KEYS = [
  "theme",
  "ui-storage-v2",
  "schemaVersion",
]

export const clearAllCaches = async (keysToPreserve = []) => {
  const preservedKeys = new Set(
    [...DEFAULT_PRESERVED_KEYS, ...keysToPreserve].map((key) =>
      buildCacheKey(key),
    ),
  )

  // 1. Caches API
  if (typeof caches !== "undefined") {
    try {
      const cacheNames = await caches.keys()
      for (const cname of cacheNames) {
        if (!preservedKeys.has(cname)) {
          await caches.delete(cname)
        }
      }
    } catch (e) {
      console.error("Error clearing caches API", e)
    }
  }

  // 2. LocalStorage
  if (typeof localStorage !== "undefined") {
    const lsKeysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !preservedKeys.has(key)) {
        lsKeysToRemove.push(key)
      }
    }
    lsKeysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  // 3. LocalForage (IndexedDB)
  try {
    const keys = await localforage.keys()
    await Promise.all(
      keys
        .filter((key) => !preservedKeys.has(key))
        .map((key) => localforage.removeItem(key)),
    )
  } catch (e) {
    console.error("Error clearing localforage", e)
  }
}
