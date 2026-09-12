import i18n from "../i18n"
import { toast } from "react-toastify"
import { ledsClient } from "./leds"

export const appName = "tropobiblio"
export const setLeds = import.meta.env.VITE_SET_LEDS === "yes"
export const currency = import.meta.env.VITE_CURRENCY || "€"

export const ledsCreatorsColor =
  import.meta.env.VITE_LEDS_CREATORS_COLOR || "0,0,130"

export const ledsCategoriesColor =
  import.meta.env.VITE_LEDS_CATEGORIES_COLOR || "0,150,0"

export const ledsWorkColor = import.meta.env.VITE_LEDS_WORK_COLOR || "255,0,0"

export function validateSettings() {
  if (setLeds) {
    ledsClient.validateSettings((msg, params) =>
      toast.error(i18n.t(msg, params), { autoClose: false }),
    )
  }
}
