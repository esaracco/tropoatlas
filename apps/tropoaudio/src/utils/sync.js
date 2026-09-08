import {
  useAppStore,
  useCollectionStore,
  setLargeItem,
  setItem,
} from "@tropo/core"
import { clearAllCaches } from "./storage"
import { toast } from "react-toastify"
import i18n from "../i18n"
import { plugin, getProviderInfo } from "../provider"

// Synchronizes the user collection with the active provider.
// When forceRefresh is true, clears all caches and resets current filters.
// Otherwise, performs a differential sync preserving cached cover images.
export const syncCollection = async ({ forceRefresh = false } = {}) => {
  if (useAppStore.getState().isSyncing) return

  const setIsSyncing = useAppStore.getState().setIsSyncing
  const setProgress = useAppStore.getState().setProgress
  const setItems = useCollectionStore.getState().setItems
  const setCategories = useCollectionStore.getState().setCategories
  const setDisplayCount = useAppStore.getState().setDisplayCount

  setIsSyncing(true)
  setProgress(0)

  try {
    if (forceRefresh) {
      await clearAllCaches()
      useCollectionStore.getState().clearFilters()
      useAppStore.getState().setSearchStr("")
    }

    const items = await plugin.getCollection((prog) => setProgress(prog))

    setItems(items)
    setDisplayCount(Object.keys(items).length)

    const categories = plugin.getCategories(items)
    setCategories(categories)

    await setLargeItem("items", items)
    await setItem("categories", categories)

    if (plugin.getCustomFieldsInfo) {
      try {
        const customFieldsInfo = await plugin.getCustomFieldsInfo()
        await setItem("customFieldsInfo", customFieldsInfo)
      } catch (err) {
        console.warn("Could not refresh custom fields info:", err)
      }
    }
  } catch (e) {
    console.error("Sync error:", e)
    const providerName = getProviderInfo().name
    const msg = e.message
      ? i18n.t(e.message, { provider: providerName })
      : i18n.t("An error occurred while using the {{provider}} API!", {
          provider: providerName,
        })
    toast.error(msg, { autoClose: false })
  } finally {
    setIsSyncing(false)
  }
}
