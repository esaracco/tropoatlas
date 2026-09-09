import {
  useAppStore,
  useCollectionStore,
  setLargeItem,
  getLargeItem,
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
    const isFullSync = forceRefresh || isUserChanged

    // Clear all previous caches if user changed or forceRefresh requested
    if (isFullSync) {
      await clearAllCaches()
      useCollectionStore.getState().clearFilters()
      useAppStore.getState().setSearchStr("")
    }

    const currentItems =
      useCollectionStore.getState().items || (await getLargeItem("items")) || {}
    const existingItems = isFullSync ? {} : currentItems

    const items = await plugin.getCollection((prog) => setProgress(prog), {
      forceRefresh: isFullSync,
      existingItems,
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
