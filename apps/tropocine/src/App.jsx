import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import i18n from "i18next"
import { ToastContainer, cssTransition } from "react-toastify"

import * as Settings from "./utils/settings"
import { syncCollection } from "./utils/sync"

import Header from "./Header"
import About from "./About"
import Result from "./Result"
import InfoBar from "./Header/InfoBar"
import { PwaReloadPrompt } from "@tropo/react"
import {
  useAppStore,
  useCollectionStore,
  getLargeItem,
  getItem,
  setItem,
  buildCacheKey,
  STORAGE_SCHEMA_VERSION,
} from "@tropo/core"
import { clearAllCaches } from "./utils/storage"
import { plugin, validateProviderSettings } from "./provider"

import "react-toastify/dist/ReactToastify.css"
import "@tropo/react/src/global.css"

const ToastTransition = cssTransition({
  enter: "toast-fade-slide-enter",
  exit: "toast-fade-slide-exit",
  appendPosition: false,
})

const App = () => {
  const { t } = useTranslation()
  const setIsOnline = useAppStore((s) => s.setIsOnline)
  const setLoading = useAppStore((s) => s.setLoading)
  const setDisplayCount = useAppStore((s) => s.setDisplayCount)

  // Network online/offline status
  useEffect(() => {
    const onlineEvent = (e) => {
      setIsOnline(e.type === "online")
    }
    window.addEventListener("online", onlineEvent)
    window.addEventListener("offline", onlineEvent)

    return () => {
      window.removeEventListener("offline", onlineEvent)
      window.removeEventListener("online", onlineEvent)
    }
  }, [setIsOnline])

  // HTML page title & description
  useEffect(() => {
    document.documentElement.lang = i18n.language
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        "content",
        t(
          "Organize your collection, discover directors and actors, and explore your films",
        ),
      )
    }
    document.title = `TropoCine – ${t("A film collection manager")}`
  }, [t])

  // Initial data loading & validation
  useEffect(() => {
    Settings.validateSettings()
    validateProviderSettings()

    setLoading(true)

    const initData = async () => {
      const schemaVersionKey = buildCacheKey("schemaVersion")
      const cachedSchemaVersion = localStorage.getItem(schemaVersionKey)
      const currentSchemaVersion = String(STORAGE_SCHEMA_VERSION)

      if (cachedSchemaVersion !== currentSchemaVersion) {
        await clearAllCaches()
        localStorage.setItem(schemaVersionKey, currentSchemaVersion)
      }

      // Ensure sort order is supported by current provider
      const defaultSort = plugin.getDefaultSort?.() || "added_desc"
      const currentSort = useCollectionStore.getState().sort
      const [sortField] = (currentSort || "").split("_")
      const validSortFields = ["added", "year", "title", "creator", "rating"]
      if (!validSortFields.includes(sortField)) {
        useCollectionStore.getState().setSort(defaultSort)
      }

      const setItems = useCollectionStore.getState().setItems
      const setCategories = useCollectionStore.getState().setCategories
      const setCreators = useCollectionStore.getState().setCreators

      try {
        const currentCleanId = plugin.cleanListId(plugin.activeListId)
        const previousListId =
          getItem("syncedListId") ||
          plugin.cleanListId(import.meta.env.VITE_TMDB_LIST_ID)
        const isListChanged = Boolean(
          previousListId && currentCleanId && previousListId !== currentCleanId,
        )

        if (isListChanged) {
          await clearAllCaches()
          useCollectionStore.getState().clearFilters()
          useAppStore.getState().setSearchStr("")
        }

        const [cachedItems, cachedCategories, cachedCreators] =
          await Promise.all([
            getLargeItem("items"),
            Promise.resolve(getItem("categories")),
            Promise.resolve(getItem("creators")),
          ])

        if (
          !isListChanged &&
          cachedCategories &&
          cachedCategories.length &&
          cachedItems
        ) {
          if (!getItem("syncedListId") && currentCleanId) {
            setItem("syncedListId", currentCleanId)
          }
          setItems(cachedItems)
          setCategories(cachedCategories)
          if (cachedCreators && cachedCreators.length) {
            setCreators(cachedCreators)
          }
          setDisplayCount(Object.keys(cachedItems).length)
          setLoading(false)
        } else {
          // First load or list changed: trigger synchronization
          await syncCollection({ forceRefresh: isListChanged })
          setLoading(false)
        }
      } catch (e) {
        console.error("Error loading cache:", e)
        setLoading(false)
      }
    }

    initData()
  }, [setDisplayCount, setLoading])

  return (
    <div className="app-shell">
      <ToastContainer
        position="bottom-right"
        transition={ToastTransition}
        hideProgressBar={true}
      />
      <Header />
      <About />
      <Result />
      <InfoBar />
      <PwaReloadPrompt
        message={t("Update available! The app will be reloaded.")}
        buttonReload={t("Reload")}
        buttonClose={t("Close")}
      />
    </div>
  )
}

export default App
