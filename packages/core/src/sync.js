import { useAppStore, useCollectionStore } from "./index.js"
import {
  setLargeItem,
  getLargeItem,
  setItem,
  getItem,
  clearAllCaches,
} from "./storage.js"

// Marker function for i18n static extraction
const _ = (s) => s

export const syncCollection = async ({
  plugin,
  forceRefresh = false,
  onProgress,
  onWarning,
  onError,
} = {}) => {
  if (useAppStore.getState().isSyncing) return

  const setIsSyncing = useAppStore.getState().setIsSyncing
  const setProgress = useAppStore.getState().setProgress
  const setItems = useCollectionStore.getState().setItems
  const setCategories = useCollectionStore.getState().setCategories
  const setCreators = useCollectionStore.getState().setCreators
  const setDisplayCount = useAppStore.getState().setDisplayCount

  setIsSyncing(true)
  setProgress(0)
  if (onProgress) onProgress(0)

  try {
    const currentSyncId = plugin.getSyncIdentifier()
    const previousSyncId = getItem("syncIdentifier")
    const isTargetChanged = Boolean(
      previousSyncId && currentSyncId && previousSyncId !== currentSyncId,
    )
    const isFullSync = forceRefresh || isTargetChanged

    if (isFullSync) {
      await clearAllCaches(plugin.getPreservedKeys())
      useCollectionStore.getState().clearFilters()
      useAppStore.getState().setSearchStr("")
    }

    const currentItems =
      useCollectionStore.getState().items || (await getLargeItem("items")) || {}
    const existingItems = isFullSync ? {} : currentItems

    const items = await plugin.getCollection(
      (prog) => {
        setProgress(prog)
        if (onProgress) onProgress(prog)
      },
      {
        forceRefresh: isFullSync,
        existingItems,
        onWarning,
      },
    )

    setItems(items)
    setDisplayCount(Object.keys(items).length)

    const categories = plugin.getCategories(items)
    setCategories(categories)

    const creators = plugin.getCreators ? plugin.getCreators(items) : []
    setCreators(creators)

    // Prune stale filter selections if items were removed
    const selected = useCollectionStore.getState().selected
    if (selected?.categories?.length) {
      const validCategories = selected.categories.filter((c) =>
        categories.includes(c),
      )
      if (validCategories.length !== selected.categories.length) {
        useCollectionStore.getState().setFilter("categories", validCategories)
      }
    }
    if (selected?.creators?.length) {
      const validCreators = selected.creators.filter((c) =>
        creators.includes(c),
      )
      if (validCreators.length !== selected.creators.length) {
        useCollectionStore.getState().setFilter("creators", validCreators)
      }
    }

    await setLargeItem("items", items)
    await setItem("categories", categories)
    await setItem("creators", creators)

    if (plugin.getCustomFieldsInfo) {
      try {
        const customFieldsInfo = await plugin.getCustomFieldsInfo()
        await setItem("customFieldsInfo", customFieldsInfo)
      } catch (err) {
        console.warn("Could not refresh custom fields info:", err)
      }
    }

    if (currentSyncId) {
      setItem("syncIdentifier", currentSyncId)
    }
  } catch (e) {
    console.error("Sync error:", e)
    const providerName = plugin.getProviderInfo().name
    if (onError) {
      const msg = e.message
        ? e.message
        : _("An error occurred while using the {{provider}} API!")
      onError(msg, { provider: providerName })
    }
  } finally {
    setIsSyncing(false)
  }
}

export const initCollectionStorage = async ({
  plugin,
  schemaVersion,
  onProgress,
  onWarning,
  onError,
} = {}) => {
  const setLoading = useAppStore.getState().setLoading
  setLoading(true)

  const schemaVersionKey = "schemaVersion"
  const cachedSchemaVersion = getItem(schemaVersionKey)
  const currentSchemaVersion = String(schemaVersion)

  const defaultSort = plugin.getDefaultSort?.() || "added_desc"
  const validSortFields = plugin.getValidSortFields?.() || ["added"]

  if (cachedSchemaVersion !== currentSchemaVersion) {
    await clearAllCaches(plugin.getPreservedKeys())
    useCollectionStore.getState().setSort(defaultSort)
    setItem(schemaVersionKey, currentSchemaVersion)
  }

  const currentSort = useCollectionStore.getState().sort
  const [sortField] = (currentSort || "").split("_")
  if (!validSortFields.includes(sortField)) {
    useCollectionStore.getState().setSort(defaultSort)
  }

  const setItems = useCollectionStore.getState().setItems
  const setCategories = useCollectionStore.getState().setCategories
  const setCreators = useCollectionStore.getState().setCreators
  const setDisplayCount = useAppStore.getState().setDisplayCount

  try {
    const currentSyncId = plugin.getSyncIdentifier()
    const previousSyncId = getItem("syncIdentifier")
    const isTargetChanged = Boolean(
      previousSyncId && currentSyncId && previousSyncId !== currentSyncId,
    )

    if (isTargetChanged) {
      await clearAllCaches(plugin.getPreservedKeys())
      useCollectionStore.getState().clearFilters()
      useAppStore.getState().setSearchStr("")
    }

    const [cachedItems, cachedCategories, cachedCreators] = await Promise.all([
      getLargeItem("items"),
      Promise.resolve(getItem("categories")),
      Promise.resolve(getItem("creators")),
    ])

    const hasCachedItems =
      cachedItems &&
      typeof cachedItems === "object" &&
      Object.keys(cachedItems).length > 0

    if (!isTargetChanged && hasCachedItems) {
      if (!previousSyncId && currentSyncId) {
        setItem("syncIdentifier", currentSyncId)
      }
      setItems(cachedItems)
      setCategories(cachedCategories || [])

      const creatorsList = plugin.getCreators
        ? plugin.getCreators(cachedItems)
        : cachedCreators && cachedCreators.length
          ? cachedCreators
          : []
      if (creatorsList.length) {
        setCreators(creatorsList)
      }

      setDisplayCount(Object.keys(cachedItems).length)
      setLoading(false)
    } else {
      await syncCollection({
        plugin,
        forceRefresh: isTargetChanged,
        onProgress,
        onWarning,
        onError,
      })
      setLoading(false)
    }
  } catch (e) {
    console.error("Error loading cache:", e)
    setLoading(false)
  }
}
