import { DiscogsPlugin } from "@tropo/discogs"
import * as Settings from "./settings"
import i18n from "../i18n"
import { toast } from "react-toastify"

export const plugin = new DiscogsPlugin({
  apiBase: "/api/discogs",
  user: Settings.user,
  itemsPerRequest: Settings.itemsPerRequest,
  requestDelay: Settings.requestDelay,
  formats: Settings.formats,
  placeField: Settings.placeField,
  priceField: Settings.priceField,
  stylesField: Settings.stylesField,
  fieldsRequired: Settings.fieldsRequired,
  devMode: Settings.env === "development",
})

import { setItem } from "@tropo/core"

// Initialize Discogs user custom fields ids
plugin
  .getFieldsId()
  .then((fieldsId) => {
    setItem("discogsFields", fieldsId)
  })
  .catch((e) => toast.error(i18n.t(e.message), { autoClose: false }))

export const getMaster = plugin.getMaster.bind(plugin)
export const getRelease = plugin.getRelease.bind(plugin)
export const updateUserData = plugin.updateUserData.bind(plugin)
export const extractStyles = plugin.extractStyles.bind(plugin)

const discogs = {
  plugin,
  getMaster,
  getRelease,
  updateUserData,
  extractStyles,
}

export default discogs
