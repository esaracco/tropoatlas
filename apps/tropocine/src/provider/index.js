import { setItem } from "@tropo/core"
import { TMDBPlugin } from "@tropo/tmdb"
import i18n from "../i18n"
import { toast } from "react-toastify"

const providerName = import.meta.env.VITE_DATA_PROVIDER || "tmdb"

let PluginClass
if (providerName === "tmdb") {
  PluginClass = TMDBPlugin
} else {
  throw new Error(`Unknown data provider: ${providerName}`)
}

export const plugin = new PluginClass({
  env: import.meta.env,
  apiBase: `/api/${providerName}`,
  devMode: import.meta.env.VITE_DEV_MODE === "yes",
})

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

export const getItemDetails = plugin.getItemDetails.bind(plugin)
export const getItemImage = plugin.getItemImage.bind(plugin)
export const getCategories = plugin.getCategories.bind(plugin)
export const getCreators = plugin.getCreators
  ? plugin.getCreators.bind(plugin)
  : () => []
export const getProviderInfo = plugin.getProviderInfo.bind(plugin)
export const getMaxRequestsPerMinute = plugin.getMaxRequestsPerMinute
  ? plugin.getMaxRequestsPerMinute.bind(plugin)
  : () => 1200

export const getImageProxyUrl = plugin.getImageProxyUrl
  ? plugin.getImageProxyUrl.bind(plugin)
  : (url) => url

export const updateItem = plugin.updateItem.bind(plugin)
export const getCustomFieldsInfo = plugin.getCustomFieldsInfo.bind(plugin)
export const getDraftCapabilities = plugin.getDraftCapabilities
  ? plugin.getDraftCapabilities.bind(plugin)
  : () => ({})
export const getCurrentConfig = plugin.getCurrentConfig
  ? plugin.getCurrentConfig.bind(plugin)
  : () => ({})

const provider = {
  plugin,
  getItemDetails,
  getItemImage,
  getImageProxyUrl,
  getCategories,
  getCreators,
  getProviderInfo,
  getMaxRequestsPerMinute,
  updateItem,
  getCustomFieldsInfo,
  getDraftCapabilities,
  getCurrentConfig,
}

export default provider
