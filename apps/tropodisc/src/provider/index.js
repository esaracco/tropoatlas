import { DiscogsPlugin } from "@tropo/discogs"
import * as Settings from "../utils/settings"
import i18n from "../i18n"
import { toast } from "react-toastify"
import { setItem } from "@tropo/core"

const providerName = import.meta.env.VITE_DATA_PROVIDER || "discogs"

let PluginClass
if (providerName === "discogs") {
  PluginClass = DiscogsPlugin
} else {
  throw new Error(`Unknown data provider: ${providerName}`)
}

export const plugin = new PluginClass({
  env: import.meta.env,
  apiBase: `/api/${providerName}`,
  devMode: Settings.env === "development",
})

// i18n static analyzer hints for dynamically translated plugin messages
// Added to IGNORE_KEYS in scripts/check_i18n.js
export const validateProviderSettings = () => {
  plugin.validateSettings((msg, params) => {
    toast.error(i18n.t(msg, params), { autoClose: false })
  })
}

// Initialize provider custom fields info
plugin
  .getCustomFieldsInfo()
  .then((info) => {
    setItem("customFieldsInfo", info)
  })
  .catch((e) => toast.error(i18n.t(e.message), { autoClose: false }))

export const getMaster = plugin.getMaster.bind(plugin)
export const getItemDetails = plugin.getItemDetails.bind(plugin)
export const getCustomFieldsInfo = plugin.getCustomFieldsInfo.bind(plugin)
export const refreshItemImage = plugin.refreshItemImage.bind(plugin)
export const updateUserData = plugin.updateUserData.bind(plugin)
export const extractCategories = plugin.extractCategories.bind(plugin)
export const getProviderInfo = plugin.getProviderInfo.bind(plugin)

const provider = {
  plugin,
  getItemDetails,
  getCustomFieldsInfo,
  refreshItemImage,
  updateUserData,
  extractCategories,
  getProviderInfo,
}

export default provider
