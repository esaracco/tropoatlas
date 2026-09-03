import i18n from "../i18n"
import { toast } from "react-toastify"

export const env = import.meta.env.MODE
export const appName = import.meta.env.VITE_APP_NAME

export function validateSettings() {
  const missingFields = []

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
