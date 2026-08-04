import i18n from "../i18n"
import { toast } from "react-toastify"

// Get constants from .env file
export const env = import.meta.env.MODE

export const appName = import.meta.env.VITE_APP_NAME
export const user = import.meta.env.VITE_DISCOGS_USER

export const currency = import.meta.env.VITE_CURRENCY || "€"

export const itemsPerRequest =
  Number(import.meta.env.VITE_DISCOGS_API_ITEMS_PER_REQUEST) || 250
export const requestDelay =
  Number(import.meta.env.VITE_DISCOGS_API_REQUEST_DELAY) || 2

export const formats = import.meta.env.VITE_DISCOGS_FORMATS || "all"
export const placeField = import.meta.env.VITE_DISCOGS_FIELD_PLACE
export const priceField = import.meta.env.VITE_DISCOGS_FIELD_PRICE
export const stylesField = import.meta.env.VITE_DISCOGS_FIELD_STYLES
export const fieldsRequired =
  import.meta.env.VITE_DISCOGS_FIELDS_REQUIRED || "no"

export const setLeds = import.meta.env.VITE_SET_LEDS || "no"
export const ledsArtistsColor =
  import.meta.env.VITE_LEDS_ARTISTS_COLOR || "0,0,25"
export const ledsStylesColor =
  import.meta.env.VITE_LEDS_STYLES_COLOR || "0,25,0"
export const ledsAlbumColor = import.meta.env.VITE_LEDS_ALBUM_COLOR || "25,0,0"

// Function to validate settings, to be called from a React
// component (e.g. App.jsx)
export function validateSettings() {
  const missingFields = []

  // Check for required fields
  if (!appName) {
    missingFields.push("VITE_APP_NAME")
  }
  if (!user) {
    missingFields.push("VITE_DISCOGS_USER")
  }

  missingFields.forEach((f) =>
    toast.error(
      i18n.t("The {{field}} environment variable is required!", {
        field: f,
      }),
      { autoClose: false },
    ),
  )

  // Check consistency (must define at least one if fieldsRequired is yes)
  if (fieldsRequired === "yes" && !(placeField || priceField || stylesField)) {
    toast.error(
      i18n.t(
        'With the {{required}} environment variable set to "yes" you must at least set one of the following variables: {{place}}, {{price}} or {{styles}}!',
        {
          required: "VITE_DISCOGS_FIELDS_REQUIRED",
          place: "VITE_DISCOGS_FIELD_PLACE",
          price: "VITE_DISCOGS_FIELD_PRICE",
          styles: "VITE_DISCOGS_FIELD_STYLES",
        },
      ),
      { autoClose: false },
    )
  }
}
