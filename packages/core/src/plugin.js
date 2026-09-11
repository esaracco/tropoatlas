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
   * Return storage keys specific to this provider that should be preserved
   * across cache clears.
   * @returns {string[]}
   */
  getPreservedKeys() {
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
   * Return information about which custom fields the provider supports.
   * @returns {Promise<CustomFieldsInfo>}
   */
  async getCustomFieldsInfo() {
    throw new Error("getCustomFieldsInfo() must be implemented by the plugin.")
  }

  /**
   * Fetches the entire collection of the user.
   * @param {function} onProgress - Callback to notify progress (0 to 100).
   * @param {Object} [options={}] - Additional sync options (e.g. { forceRefresh: false }).
   * @returns {Promise<Object>} Map of collection items.
   */
  async getCollection(onProgress, options = {}) {
    throw new Error("getCollection() must be implemented by the plugin.")
  }

  /**
   * Fetches detailed information for a specific item (e.g. additional metadata).
   * @param {Object} item - The base item object.
   * @returns {Promise<Object>} The item with detailed information attached.
   */
  async getItemDetails(item) {
    throw new Error("getItemDetails() must be implemented by the plugin.")
  }

  /**
   * Fetches high-res cover image for the item.
   * @param {Object} item
   * @returns {Promise<{cover: string}|null>}
   */
  async getItemImage(item) {
    throw new Error("getItemImage() must be implemented by the plugin.")
  }

  /**
   * Return local proxy URL for a remote artwork/image URL to bypass CORS.
   * Defaults to identity (no transformation).
   * @param {string} url
   * @returns {string}
   */
  getImageProxyUrl(url) {
    return url
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
   * Extracts unique categories from a map of items.
   * @param {Object} items - Map of collection items.
   * @returns {string[]} Sorted array of category strings.
   */
  getCategories(items) {
    throw new Error("getCategories() must be implemented by the plugin.")
  }

  /**
   * Extracts unique creators from a map of items.
   * @param {Object} items - Map of collection items.
   * @returns {string[]} Sorted array of creator strings.
   */
  getCreators(items = {}) {
    const set = new Set()
    for (const item of Object.values(items)) {
      if (item.creator) set.add(item.creator)
    }
    return Array.from(set).sort()
  }

  /**
   * Returns the maximum allowed API requests per minute.
   * @returns {number}
   */
  getMaxRequestsPerMinute() {
    return 60
  }

  /**
   * Return the default sort criteria for the provider.
   * @returns {string}
   */
  getDefaultSort() {
    return "added_desc"
  }

  /**
   * Return the array of valid sort keys supported by this provider.
   * Must be implemented by the specific plugin.
   * @returns {string[]}
   */
  getValidSortFields() {
    throw new Error("getValidSortFields() must be implemented by the plugin.")
  }

  /**
   * Return a unique identifier representing the active user/list/collection target.
   * If this changes between syncs, the storage cache is automatically refreshed.
   * Must be implemented by the specific plugin.
   * @returns {string|null}
   */
  getSyncIdentifier() {
    throw new Error("getSyncIdentifier() must be implemented by the plugin.")
  }

  /**
   * Return whether the provider allows resetting an item rating to unrated (0).
   * Defaults to true.
   * @returns {boolean}
   */
  canResetRating() {
    return true
  }

  /**
   * Return the aspect ratio (height / width multiplier) for item cover images.
   * Defaults to 1.0 (square 1:1, suitable for audio vinyls/CDs).
   * Plugins for books or movie posters can override this (e.g. 1.5).
   * @returns {number}
   */
  getCoverAspectRatio() {
    return 1.0
  }

  /**
   * Return terminology mapping for domain concepts.
   * @returns {Object}
   */
  getTerminology() {
    return {
      creator: "Creator",
      creators: "Creators",
      item: "item",
      items: "items",
      category: "Category",
      categories: "Categories",
      communityRating: "Community rating",
      searchPlaceholder: "Search...",
      newCategoryPlaceholder: "New category...",
      viewOnProvider: "View on {{provider}}",
    }
  }

  /**
   * Return whether an item already has detailed metadata loaded.
   * @param {Object} item
   * @returns {boolean}
   */
  isItemDetailed(item) {
    if (!item) return false
    return Boolean(item.hasDetails)
  }

  /**
   * Return normalized public or community rating for an item.
   * @param {Object} item - Collection item.
   * @returns {{ score: number, max: number, label?: string }|null}
   */
  getPublicRating(item) {
    return null
  }
}
