import {
  useAppStore,
  useCollectionStore,
  setLargeItem,
  setItem,
  getItem,
} from "@tropo/core"
import { clearAllCaches } from "./storage"
import { toast } from "react-toastify"
import i18n from "../i18n"
import { plugin, getProviderInfo } from "../provider"

export const syncCollection = async ({ forceRefresh = false } = {}) => {
  const setIsSyncing = useAppStore.getState().setIsSyncing
  const setProgress = useAppStore.getState().setProgress
  const setItems = useCollectionStore.getState().setItems
  const setCategories = useCollectionStore.getState().setCategories
  const setCreators = useCollectionStore.getState().setCreators
  const setDisplayCount = useAppStore.getState().setDisplayCount

  setIsSyncing(true)
  setProgress(0)

  try {
    const currentCleanId = plugin.cleanListId(plugin.activeListId)
    const previousListId = getItem("syncedListId")
    const isListChanged = Boolean(
      previousListId && currentCleanId && previousListId !== currentCleanId,
    )

    // Clear all previous caches if list changed or forceRefresh requested
    if (forceRefresh || isListChanged) {
      await clearAllCaches()
      useCollectionStore.getState().clearFilters()
      useAppStore.getState().setSearchStr("")
    }

    const items = await plugin.getCollection((prog) => setProgress(prog), {
      forceRefresh: forceRefresh || isListChanged,
    })

    setItems(items)
    setDisplayCount(Object.keys(items).length)

    const categories = plugin.getCategories(items)
    setCategories(categories)

    const creators = plugin.getCreators ? plugin.getCreators(items) : []
    setCreators(creators)

    await setLargeItem("items", items)
    await setItem("categories", categories)
    await setItem("creators", creators)

    if (currentCleanId) {
      setItem("syncedListId", currentCleanId)
    }
  } catch (e) {
    console.error("Sync error:", e)
    toast.error(
      e.message ||
        i18n.t("An error occurred while using the {{provider}} API!", {
          provider: getProviderInfo().name,
        }),
      { autoClose: false },
    )
  } finally {
    setIsSyncing(false)
  }
}
