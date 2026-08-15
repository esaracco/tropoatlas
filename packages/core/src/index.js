import { create } from "zustand"
import { persist } from "zustand/middleware"
import { buildCacheKey, SETTINGS_STORE_KEY } from "./storage"

// Generic App UI Store
export const useAppStore = create((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  loading: false,
  isSyncing: false,
  searchStr: "",
  fromRuler: false,
  progress: 0,
  displayCount: 0,
  showAbout: false,

  setIsOnline: (isOnline) => set({ isOnline }),
  setLoading: (loading) => set({ loading }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setSearchStr: (searchStr) => set({ searchStr }),
  setFromRuler: (fromRuler) => set({ fromRuler }),
  setProgress: (progress) => set({ progress }),
  setDisplayCount: (displayCount) => set({ displayCount }),
  setShowAbout: (showAbout) => set({ showAbout }),
}))

// Generic Collection Store
export const useCollectionStore = create(
  persist(
    (set) => ({
      // Data
      items: {},
      creators: [],
      categories: [],
      formats: [],

      // UI State
      selected: {
        creators: [],
        categories: [],
        formats: [],
      },
      // 'creator', 'title', 'added_desc', etc.
      sort: "added_desc",

      // Actions
      setItems: (items) => set({ items }),
      setCreators: (creators) => set({ creators }),
      setCategories: (categories) => set({ categories }),
      setFormats: (formats) => set({ formats }),

      setFilter: (type, values) =>
        set((state) => {
          const newSelected = { ...state.selected, [type]: values }
          return { selected: newSelected }
        }),
      clearFilters: () =>
        set(() => ({
          selected: { creators: [], categories: [], formats: [] },
        })),

      setSort: (sort) => set({ sort }),
    }),
    {
      // unique name for localStorage
      name: buildCacheKey("ui-storage-v2"),
      partialize: (state) => ({
        sort: state.sort,
        selected: state.selected,
      }),
    },
  ),
)
// Settings Store
export const useSettingsStore = create(
  persist(
    (set) => ({
      general: {
        currency: import.meta.env.VITE_CURRENCY || "EUR",
      },
      hardware: {
        ledsArtistsColor: import.meta.env.VITE_LEDS_ARTISTS_COLOR || "0,0,130",
        ledsStylesColor: import.meta.env.VITE_LEDS_STYLES_COLOR || "0,150,0",
        ledsAlbumColor: import.meta.env.VITE_LEDS_ALBUM_COLOR || "255,0,0",
      },
      pluginsConfig: {
        discogs: {
          apiItemsPerRequest:
            parseInt(import.meta.env.VITE_DISCOGS_API_ITEMS_PER_REQUEST, 10) ||
            250,
          formats: import.meta.env.VITE_DISCOGS_FORMATS || "vinyl",
          fieldPlace: import.meta.env.VITE_DISCOGS_FIELD_PLACE || "",
          fieldPrice: import.meta.env.VITE_DISCOGS_FIELD_PRICE || "",
          fieldStyles: import.meta.env.VITE_DISCOGS_FIELD_STYLES || "",
          fieldsRequired: import.meta.env.VITE_DISCOGS_FIELDS_REQUIRED || "",
        },
      },
      setGeneral: (updates) =>
        set((state) => ({ general: { ...state.general, ...updates } })),
      setHardware: (updates) =>
        set((state) => ({ hardware: { ...state.hardware, ...updates } })),
      setPluginConfig: (pluginName, updates) =>
        set((state) => ({
          pluginsConfig: {
            ...state.pluginsConfig,
            [pluginName]: { ...state.pluginsConfig[pluginName], ...updates },
          },
        })),
    }),
    {
      name: buildCacheKey(SETTINGS_STORE_KEY),
      version: 2,
    },
  ),
)

export * from "./storage.js"
export * from "./utils.js"
export * from "./plugin.js"
export * from "./backup.js"

export const getPluginTerminology = (pluginName) => {
  const terminologies = {
    discogs: {
      creator: "Artist",
      creators: "Artists",
      item: "Release",
      items: "Releases",
      category: "Style",
      categories: "Styles",
    },
  }
  return terminologies[pluginName] || terminologies.discogs
}
