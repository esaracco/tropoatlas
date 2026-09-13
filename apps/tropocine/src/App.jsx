import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import i18n from "i18next"
import { ToastContainer, cssTransition } from "react-toastify"

import * as Settings from "./utils/settings"
import { ExtraTabs } from "./ExtraTabs"
import { HeaderDetails } from "./HeaderDetails"
import { ExtraRows } from "./ExtraRows"
import workPlaceholder from "./assets/film.svg"

import { PwaReloadPrompt, Header, InfoBar, Result, About } from "@tropo/react"
import { useAppStore, initCollectionStorage } from "@tropo/core"
import { toast } from "react-toastify"
import { plugin, validateProviderSettings } from "./provider"
import { STORAGE_SCHEMA_VERSION } from "./utils/storage"
import { ledsClient } from "./utils/leds"

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

    initCollectionStorage({
      plugin,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      onWarning: (msg, params) =>
        toast.warn(t(msg, params), { autoClose: false }),
      onError: (msg, params) =>
        toast.error(t(msg, params), { autoClose: false }),
    })
  }, [setLoading])

  return (
    <div className="app-shell">
      <ToastContainer
        position="bottom-right"
        transition={ToastTransition}
        hideProgressBar={true}
      />
      <Header
        plugin={plugin}
        appName={Settings.appName}
        setLeds={Settings.setLeds}
        ledsClient={ledsClient}
        showFormats={false}
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
        renderExtraRows={(item, ctx) => <ExtraRows item={item} {...ctx} />}
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
