import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import i18n from "i18next"
import { ToastContainer, toast, cssTransition } from "react-toastify"

import * as Settings from "./utils/settings"

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
  buildCacheKey,
} from "@tropo/core"
import { clearAllCaches, STORAGE_SCHEMA_VERSION } from "./utils/storage"
import { syncCollection } from "./utils/sync"
import { plugin, validateProviderSettings } from "./provider"

import "react-toastify/dist/ReactToastify.css"
import "@tropo/react/src/global.css"

// Smooth fade-slide transition matching the PwaReloadPrompt animation
const ToastTransition = cssTransition({
  enter: "toast-fade-slide-enter",
  exit: "toast-fade-slide-exit",
  appendPosition: false,
})

// COMPONENT App
const App = () => {
  const { t } = useTranslation()
  const setIsOnline = useAppStore((s) => s.setIsOnline)
  const setLoading = useAppStore((s) => s.setLoading)
  const setDisplayCount = useAppStore((s) => s.setDisplayCount)

  // EFFECT 1
  useEffect(() => {
    const _onlineEvent = (e) => {
      setIsOnline(e.type === "online")
      if (e.type === "online" && "serviceWorker" in navigator) {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "REPLAY_QUEUES",
          })
        }
      }
    }
    window.addEventListener("online", _onlineEvent)
    window.addEventListener("offline", _onlineEvent)

    return () => {
      window.removeEventListener("offline", _onlineEvent)
      window.removeEventListener("online", _onlineEvent)
    }
  }, [])

  // EFFECT 2
  useEffect(() => {
    if (Settings.env !== "test") {
      document.documentElement.lang = i18n.language
      const meta = document.querySelector('meta[name="description"]')
      if (meta)
        meta.setAttribute(
          "content",
          t(
            "Organize your collection, enrich it with your own metadata, and locate albums instantly using LED strips",
          ),
        )
      document.title = `TropoAudio – ${t("An album collection manager")}`
    }
  }, [t])

  // EFFECT 3
  useEffect(() => {
    toast.dismiss()
    Settings.validateSettings()
    validateProviderSettings()

    setLoading(true)

    const initData = async () => {
      // 1. Check storage schema version and clear cache if updated
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
      const validSortFields = [
        "added",
        "year",
        "title",
        "creator",
        "place",
        "price",
        "rating",
      ]
      if (!validSortFields.includes(sortField)) {
        useCollectionStore.getState().setSort(defaultSort)
      }

      const setItems = useCollectionStore.getState().setItems
      const setCategories = useCollectionStore.getState().setCategories

      try {
        const [cachedItems, cachedCategories] = await Promise.all([
          getLargeItem("items"),
          Promise.resolve(getItem("categories")),
        ])
        if (cachedCategories && cachedCategories.length && cachedItems) {
          // Restore from cache
          const itemsObj = cachedItems || {}
          const categoriesArr = cachedCategories || []

          // Populate Zustand store
          const mappedItems = {}
          Object.values(itemsObj).forEach((r) => {
            mappedItems[r.id] = r
          })
          setItems(mappedItems)
          setCategories(categoriesArr)
          setDisplayCount(Object.keys(mappedItems).length)
          setLoading(false)
        } else {
          // First load or schema changed: trigger synchronization
          await syncCollection()
          setLoading(false)
        }
      } catch (e) {
        console.error("Error loading cache", e)
        setLoading(false)
      }
    }

    initData()
  }, [])

  // RENDER
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
