import i18n from "../i18n"
import { toast } from "react-toastify"
import { ledsClient } from "./leds"

// Get constants from .env file
export const env = import.meta.env.MODE

export const appName = import.meta.env.VITE_APP_NAME

import { useSettingsStore } from "@tropo/core"

export const setLeds = import.meta.env.VITE_SET_LEDS || "no"

export const getCurrency = () => useSettingsStore.getState().general.currency

export const getLedsArtistsColor = () =>
  useSettingsStore.getState().hardware.ledsArtistsColor

export const getLedsStylesColor = () =>
  useSettingsStore.getState().hardware.ledsStylesColor

export const getLedsAlbumColor = () =>
  useSettingsStore.getState().hardware.ledsAlbumColor

// Function to validate settings, to be called from a React
// component (e.g. App.jsx)
export function validateSettings() {
  const missingFields = []

  // Check for required fields
  if (!appName) {
    missingFields.push("VITE_APP_NAME")
  }

  missingFields.forEach((f) =>
    toast.error(
      i18n.t("The {{field}} environment variable is required!", {
        field: f,
      }),
      { autoClose: false },
    ),
  )

  if (setLeds === "yes") {
    ledsClient.validateSettings((msg, params) =>
      toast.error(i18n.t(msg, params), { autoClose: false }),
    )
  }
}
