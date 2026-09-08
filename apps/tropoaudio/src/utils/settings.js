import i18n from "../i18n"
import { toast } from "react-toastify"
import { ledsClient } from "./leds"

// Get constants from .env file
export const env = import.meta.env.MODE

export const appName = import.meta.env.VITE_APP_NAME

export const setLeds = import.meta.env.VITE_SET_LEDS || "no"

export const getCurrency = () => import.meta.env.VITE_CURRENCY || "€"

export const getLedsCreatorsColor = () =>
  import.meta.env.VITE_LEDS_CREATORS_COLOR || "0,0,130"

export const getLedsCategoriesColor = () =>
  import.meta.env.VITE_LEDS_CATEGORIES_COLOR || "0,150,0"

export const getLedsWorkColor = () =>
  import.meta.env.VITE_LEDS_WORK_COLOR || "255,0,0"

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
