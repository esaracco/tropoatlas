import localforage from "localforage"

// Current version of the storage schema. Increment when local storage
// structure changes to force a re-sync.
export const STORAGE_SCHEMA_VERSION = 5

export const SETTINGS_STORE_KEY = "settings-v1"

export const buildCacheKey = (...parts) => {
  const appName = import.meta.env.VITE_APP_NAME || "tropoatlas"
  const name = parts.filter(Boolean).join("-")
  return name.startsWith(appName) ? name : `${appName}-${name}`
}

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

export const setItem = (name, value) =>
  localStorage.setItem(buildCacheKey(name), JSON.stringify(value))

export const getItem = (name) =>
  JSON.parse(localStorage.getItem(buildCacheKey(name)))

export const removeItem = (name) => localStorage.removeItem(buildCacheKey(name))

// Keys that must never be removed during cache clears (user preferences,
// UI state, and structural schema version metadata).
export const DEFAULT_PRESERVED_KEYS = [
  SETTINGS_STORE_KEY,
  "theme",
  "ui-storage-v2",
  "schemaVersion",
  "customFieldsInfo",
]

export const clearAllCaches = async (keysToPreserve = []) => {
  const appName = import.meta.env.VITE_APP_NAME || "tropoatlas"
  const prefix = `${appName}-`

  const preservedKeys = new Set(
    [...DEFAULT_PRESERVED_KEYS, ...keysToPreserve].map(buildCacheKey),
  )

  // 1. Caches API
  const cacheNames = await caches.keys()
  for (const cname of cacheNames) {
    if (cname.startsWith(prefix) || cname === buildCacheKey("item-covers")) {
      await caches.delete(cname)
    }
  }

  // 2. LocalStorage
  const lsKeysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix) && !preservedKeys.has(key)) {
      lsKeysToRemove.push(key)
    }
  }
  lsKeysToRemove.forEach((key) => localStorage.removeItem(key))

  // 3. LocalForage (IndexedDB)
  try {
    const keys = await localforage.keys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith(prefix))
        .map((key) => localforage.removeItem(key)),
    )
  } catch (e) {
    console.error("Error clearing localforage", e)
  }
}
