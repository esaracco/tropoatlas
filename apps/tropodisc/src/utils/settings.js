import i18n from "../i18n"
import { toast } from "react-toastify"

// Get constants from .env file
export const env = import.meta.env.MODE

export const appName = import.meta.env.VITE_APP_NAME

export const currency = import.meta.env.VITE_CURRENCY || "€"

export const setLeds = import.meta.env.VITE_SET_LEDS || "no"
export const ledsArtistsColor =
  import.meta.env.VITE_LEDS_ARTISTS_COLOR || "0,0,255"
export const ledsStylesColor =
  import.meta.env.VITE_LEDS_STYLES_COLOR || "0,255,0"
export const ledsAlbumColor = import.meta.env.VITE_LEDS_ALBUM_COLOR || "255,0,0"
export const ledsSearchColor =
  import.meta.env.VITE_LEDS_SEARCH_COLOR || "255,165,0"

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
}
