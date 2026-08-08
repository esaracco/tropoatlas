/* eslint-disable no-unused-vars */

/**
 * @typedef {Object} ProviderInfo
 * @property {string} name - Name of the provider.
 * @property {string} url - URL of the provider.
 * @property {string} logo - Logo image import/path.
 * @property {boolean} multipleFormats - Whether it supports multiple formats.
 */

/**
 * @typedef {Object} CustomFieldsInfo
 * @property {boolean} supportsPlace - Provider supports place tracking.
 * @property {boolean} supportsPrice - Provider supports price tracking.
 * @property {boolean} supportsCategories - Provider supports custom categories.
 */

/**
 * BasePlugin defines the expected contract for all data providers in TropoAtlas.
 * Every plugin must extend this class and implement its abstract methods.
 */
export class BasePlugin {
  /**
   * Return basic metadata about the provider.
   * @returns {ProviderInfo}
   */
  getProviderInfo() {
    throw new Error("getProviderInfo() must be implemented by the plugin.")
  }

  /**
   * Return the plugin's configuration schema for dynamic UI generation.
   * @returns {Array<Object>}
   */
  getSettingsSchema() {
    return []
  }

  /**
   * Validates the configuration/environment variables for the plugin.
   * @param {function} onConfigError - Callback to trigger on error.
   */
  validateSettings(onConfigError) {
    throw new Error("validateSettings() must be implemented by the plugin.")
  }

  /**
   * Return information about which custom fields the provider supports based on a draft configuration.
   * This is a synchronous, offline check for UI reactivity.
   * @param {Object} config - The plugin's draft configuration object.
   * @returns {CustomFieldsInfo}
   */
  getDraftCapabilities(config) {
    return {
      supportsPlace: false,
      supportsPrice: false,
      supportsCategories: false,
    }
  }

  /**
   * Return information about which custom fields the provider supports.
   * @returns {Promise<CustomFieldsInfo>}
   */
  async getCustomFieldsInfo() {
    throw new Error("getCustomFieldsInfo() must be implemented by the plugin.")
  }

  /**
   * Fetches the entire collection of the user.
   * @param {function} onProgress - Callback to notify progress (0 to 100).
   * @returns {Promise<Object>} Map of collection items.
   */
  async getCollection(onProgress) {
    throw new Error("getCollection() must be implemented by the plugin.")
  }

  /**
   * Fetches detailed information for a specific item (e.g. tracklist).
   * @param {Object} item - The base item object.
   * @returns {Promise<Object>} The item with detailed information attached.
   */
  async getItemDetails(item) {
    throw new Error("getItemDetails() must be implemented by the plugin.")
  }

  /**
   * Fetches high-res and low-res images for the item.
   * @param {Object} item
   * @returns {Promise<{cover: string, thumb: string}|null>}
   */
  async getItemImages(item) {
    throw new Error("getItemImages() must be implemented by the plugin.")
  }

  /**
   * Updates user-specific data (custom fields, rating) for an item on the provider.
   * @param {Object} item
   * @param {Object} changes - The fields to update (rating, place, price, categories).
   * @returns {Promise<void>}
   */
  async updateItem(item, changes) {
    throw new Error("updateItem() must be implemented by the plugin.")
  }

  /**
   * Extracts unique categories/styles from a map of items.
   * @param {Object} items - Map of collection items.
   * @returns {string[]} Sorted array of category strings.
   */
  getCategories(items) {
    throw new Error("getCategories() must be implemented by the plugin.")
  }
}
