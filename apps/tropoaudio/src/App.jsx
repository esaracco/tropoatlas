import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import i18n from "i18next"
import { ToastContainer, cssTransition } from "react-toastify"

import * as Settings from "./utils/settings"
import { ExtraTabs } from "./ExtraTabs"
import { HeaderDetails } from "./HeaderDetails"
import workPlaceholder from "./assets/album.svg"

import { PwaReloadPrompt, Header, InfoBar, Result, About } from "@tropo/react"
import { useAppStore, initCollectionStorage } from "@tropo/core"
import { toast } from "react-toastify"
import { plugin, validateProviderSettings, getProviderInfo } from "./provider"
import { STORAGE_SCHEMA_VERSION } from "./utils/storage"
import { ledsClient } from "./utils/leds"

import "react-toastify/dist/ReactToastify.css"
import "@tropo/react/src/global.css"

// Smooth fade-slide transition matching the PwaReloadPrompt animation
const ToastTransition = cssTransition({
  enter: "toast-fade-slide-enter",
  exit: "toast-fade-slide-exit",
  appendPosition: false,
})

const App = () => {
  const { t } = useTranslation()
  const setIsOnline = useAppStore((s) => s.setIsOnline)
  const setLoading = useAppStore((s) => s.setLoading)

  // Online / offline network status listeners
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

  // Page title & description
  useEffect(() => {
    document.documentElement.lang = (
      i18n.resolvedLanguage ||
      i18n.language ||
      "en"
    )
      .slice(0, 2)
      .toLowerCase()
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        "content",
        t(
          "Organize your collection, enrich it with your own metadata, and locate albums instantly using LED strips",
        ),
      )
    }
    document.title = `TropoAudio – ${t("An album collection manager")}`
  }, [t])

  // Initial data loading & validation
  useEffect(() => {
    Settings.validateSettings()
    validateProviderSettings()

    setLoading(true)

    initCollectionStorage({
      plugin,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      onWarning: (msg, params) =>
        toast.warn(t(msg, params), { autoClose: false }),
      onError: (msg, params) =>
        toast.error(t(msg, params), { autoClose: false }),
    })
  }, [])

  return (
    <div className="app-shell">
      <ToastContainer
        position="bottom-right"
        transition={ToastTransition}
        hideProgressBar={true}
      />
      <Header
        plugin={plugin}
        setLeds={Settings.setLeds}
        ledsClient={ledsClient}
        themeStorageKey="tropoaudio-theme"
        showFormats={getProviderInfo().multipleFormats}
      />
      <About plugin={plugin} appName={Settings.appName} />
      <Result
        plugin={plugin}
        placeholder={workPlaceholder}
        currency={Settings.currency}
        ledsColors={{
          categories: Settings.ledsCategoriesColor,
          creators: Settings.ledsCreatorsColor,
          work: Settings.ledsWorkColor,
        }}
        setLeds={Settings.setLeds}
        ledsClient={ledsClient}
        renderExtraTabs={(instanceId) => <ExtraTabs instanceId={instanceId} />}
        renderHeaderDetails={(item) => <HeaderDetails item={item} />}
      />
      <InfoBar plugin={plugin} />
      <PwaReloadPrompt
        message={t("Update available! The app will be reloaded.")}
        buttonReload={t("Reload")}
        buttonClose={t("Close")}
      />
    </div>
  )
}

export default App
