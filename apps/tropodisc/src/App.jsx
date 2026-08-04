import React, { useState, useEffect } from "react"
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
  useCollectionStore,
  getLargeItem,
  setLargeItem,
  getItem,
  setItem,
  clearAllCaches,
  buildCacheKey,
} from "@tropo/core"
import { plugin } from "./utils/discogs"

import "react-toastify/dist/ReactToastify.css"
import "@tropo/react/src/global.css"

// COMPONENT App
const App = () => {
  const [_] = useTranslation()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [loading, setLoading] = useState(false)
  const [searchStr, setSearchStr] = useState("")
  const [fromRuler, setFromRuler] = useState(false)
  const [progress, setProgress] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const [showAbout, setShowAbout] = useState(false)

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
      window.removeEventListener("online", _onlineEvent)
      window.removeEventListener("offline", _onlineEvent)
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
      document.title = `TropoDisc – ${_("A Discogs collection manager")}`
    }
  }, [_])

  // EFFECT 3
  useEffect(() => {
    toast.dismiss()
    Settings.validateSettings()

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
          // Fetch from Discogs
          plugin
            .getCollection((prog) => setProgress(prog))
            .then((items) => {
              setItems(items)

              const categories = new Set()
              const legacyReleases = {}
              const legacyStyles = new Set()

              Object.values(items).forEach((item) => {
                item.categories.forEach((c) => categories.add(c))
                legacyReleases[item.id] = {
                  ...item,
                  artist: item.creator,
                  styles: item.categories,
                  instanceid: item.id,
                }
                item.categories.forEach((s) => legacyStyles.add(s))
              })

              const stylesArray = Array.from(categories).sort()
              setCategories(stylesArray)

              // Save to cache
              setLargeItem("releases", legacyReleases)
              setItem("styles", stylesArray)
            })
            .catch((e) => {
              console.error(e.message)
              toast.error(
                _(e.message) ||
                  _("An error occurred while using the Discogs API!"),
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
      <Header
        setFromRuler={setFromRuler}
        searchStr={searchStr}
        setSearchStr={setSearchStr}
        loading={loading}
        displayCount={displayCount}
        isOnline={isOnline}
        setShowAbout={setShowAbout}
      />
      <About
        isOnline={isOnline}
        showAbout={showAbout}
        setShowAbout={setShowAbout}
      />
      <Result
        fromRuler={fromRuler}
        setFromRuler={setFromRuler}
        searchStr={searchStr}
        loading={loading}
        progress={progress}
        setDisplayCount={setDisplayCount}
      />
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
