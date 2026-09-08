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
  if (useAppStore.getState().isSyncing) return

  const setIsSyncing = useAppStore.getState().setIsSyncing
  const setProgress = useAppStore.getState().setProgress
  const setItems = useCollectionStore.getState().setItems
  const setCategories = useCollectionStore.getState().setCategories
  const setCreators = useCollectionStore.getState().setCreators
  const setDisplayCount = useAppStore.getState().setDisplayCount

  setIsSyncing(true)
  setProgress(0)

  try {
    const currentUser = plugin.activeUser
    const previousUser = getItem("syncedInventoryUser")
    const isUserChanged = Boolean(
      previousUser && currentUser && previousUser !== currentUser,
    )

    // Clear all previous caches if user changed or forceRefresh requested
    if (forceRefresh || isUserChanged) {
      await clearAllCaches()
      useCollectionStore.getState().clearFilters()
      useAppStore.getState().setSearchStr("")
    }

    const items = await plugin.getCollection((prog) => setProgress(prog), {
      forceRefresh: forceRefresh || isUserChanged,
      onWarning: (msg, params) => {
        toast.warn(i18n.t(msg, params), { autoClose: 8000 })
      },
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

    if (plugin.getCustomFieldsInfo) {
      try {
        const customFieldsInfo = await plugin.getCustomFieldsInfo()
        await setItem("customFieldsInfo", customFieldsInfo)
      } catch (err) {
        console.warn("Could not refresh custom fields info:", err)
      }
    }

    if (currentUser) {
      setItem("syncedInventoryUser", currentUser)
    }
  } catch (e) {
    setIsSyncing(false)
    console.error("Sync error:", e)
    const providerName = getProviderInfo().name
    const msg = e.message
      ? i18n.t(e.message, { provider: providerName })
      : i18n.t("An error occurred while using the {{provider}} API!", {
          provider: providerName,
        })
    toast.warn(msg, { autoClose: false })
  } finally {
    setIsSyncing(false)
  }
}
