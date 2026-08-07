import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import i18n from "i18next"
import { ToastContainer, toast } from "react-toastify"

import * as Settings from "./utils/settings"
import * as Leds from "./utils/leds"

import Header from "./Header"
import About from "./About"
import Result from "./Result"
import { ScrollButton, PwaReloadPrompt } from "@tropo/react"
import {
  useAppStore,
  useCollectionStore,
  getLargeItem,
  setLargeItem,
  getItem,
  setItem,
  clearAllCaches,
  buildCacheKey,
} from "@tropo/core"
import { plugin, getProviderInfo, validateProviderSettings } from "./provider"

import "react-toastify/dist/ReactToastify.css"
import "@tropo/react/src/global.css"

// COMPONENT App
const App = () => {
  const [_] = useTranslation()
  const setIsOnline = useAppStore((s) => s.setIsOnline)
  const setLoading = useAppStore((s) => s.setLoading)
  const setProgress = useAppStore((s) => s.setProgress)
  const searchStr = useAppStore((s) => s.searchStr)

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
    let _unloadEvent

    if (Settings.setLeds === "yes") {
      _unloadEvent = () => {
        // Send the request in the background (keepalive) without blocking the
        // window close
        Leds.setLeds({ keepalive: true })
      }
      window.addEventListener("pagehide", _unloadEvent)
    }

    window.addEventListener("online", _onlineEvent)
    window.addEventListener("offline", _onlineEvent)

    return () => {
      window.removeEventListener("offline", _onlineEvent)
      window.removeEventListener("online", _onlineEvent)
      if (_unloadEvent) {
        window.removeEventListener("pagehide", _unloadEvent)
      }
    }
  }, [_])

  // EFFECT 2
  useEffect(() => {
    if (Settings.env !== "test") {
      document.documentElement.lang = i18n.language
      const meta = document.querySelector('meta[name="description"]')
      if (meta)
        meta.setAttribute(
          "content",
          _(
            "Organize your collection, enrich it with your own metadata, and optionally locate albums instantly using LED strips",
          ),
        )
      document.title = `TropoDisc – ${_("A universal music collection manager")}`
    }
  }, [_])

  // EFFECT Search tracking
  useEffect(() => {
    const toggleLayer = useCollectionStore.getState().toggleLayer
    toggleLayer("search", searchStr.length >= 3)
  }, [searchStr])

  // EFFECT 3
  useEffect(() => {
    toast.dismiss()
    Settings.validateSettings()
    validateProviderSettings()

    setLoading(true)

    const initData = async () => {
      // 1. Check version and clear cache if updated
      // eslint-disable-next-line no-undef
      const appVersion = __APP_VERSION__
      const versionKey = buildCacheKey("version")
      const cachedVersion = localStorage.getItem(versionKey)

      if (appVersion && cachedVersion !== appVersion) {
        await clearAllCaches([versionKey])
        localStorage.setItem(versionKey, appVersion)
      }

      const setItems = useCollectionStore.getState().setItems
      const setCategories = useCollectionStore.getState().setCategories

      try {
        const [cachedReleases, cachedStyles] = await Promise.all([
          getLargeItem("releases"),
          Promise.resolve(getItem("styles")),
        ])
        if (cachedStyles && cachedStyles.length) {
          // Restore from cache
          const releasesObj = cachedReleases || {}
          const stylesArr = cachedStyles || []

          // Populate Zustand store

          // Map legacy to new format for Zustand
          const mappedItems = {}
          Object.values(releasesObj).forEach((r) => {
            mappedItems[r.instanceid || r.id] = {
              ...r,
              creator: r.artist || r.creator,
              categories: r.styles || r.categories,
              id: r.instanceid || r.id,
            }
          })
          setItems(mappedItems)
          setCategories(stylesArr)
          setLoading(false)
        } else {
          // Fetch from provider
          plugin
            .getCollection((prog) => setProgress(prog))
            .then((items) => {
              setItems(items)

              const categories = new Set()

              Object.values(items).forEach((item) => {
                item.categories.forEach((c) => categories.add(c))
              })

              const stylesArray = Array.from(categories).sort()
              setCategories(stylesArray)

              // Save to cache
              setLargeItem("releases", items)
              setItem("styles", stylesArray)
            })
            .catch((e) => {
              console.error(e.message)
              toast.error(
                _(e.message) ||
                  _("An error occurred while using the {{provider}} API!", {
                    provider: getProviderInfo().name,
                  }),
                {
                  autoClose: false,
                },
              )
            })
            .finally(() => {
              setLoading(false)
            })
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
    <>
      <ToastContainer position="bottom-right" />
      <Header />
      <About />
      <Result />
      <ScrollButton />
      <PwaReloadPrompt
        onClearCaches={clearAllCaches}
        message={_("Update available! The app will be reloaded.")}
        buttonReload={_("Reload")}
        buttonClose={_("Close")}
      />
    </>
  )
}

export default App
