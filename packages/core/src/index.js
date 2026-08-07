import { create } from "zustand"
import { persist } from "zustand/middleware"
import { buildCacheKey } from "./storage"

// Generic App UI Store
export const useAppStore = create((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  loading: false,
  searchStr: "",
  fromRuler: false,
  progress: 0,
  displayCount: 0,
  showAbout: false,

  setIsOnline: (isOnline) => set({ isOnline }),
  setLoading: (loading) => set({ loading }),
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
      // Tracks filter activation chronology: e.g. ['search', 'categories', 'creators']
      activeLayers: [],

      // Actions
      setItems: (items) => set({ items }),
      setCreators: (creators) => set({ creators }),
      setCategories: (categories) => set({ categories }),
      setFormats: (formats) => set({ formats }),

      toggleLayer: (layerId, isActive) =>
        set((state) => {
          const current = state.activeLayers
          const exists = current.includes(layerId)
          if (isActive && !exists) {
            return { activeLayers: [...current, layerId] }
          } else if (!isActive && exists) {
            return { activeLayers: current.filter((id) => id !== layerId) }
          }
          return state
        }),

      setFilter: (type, values) =>
        set((state) => {
          const newSelected = { ...state.selected, [type]: values }
          let newLayers = [...state.activeLayers]
          const hasValues = values && values.length > 0
          const exists = newLayers.includes(type)

          if (hasValues && !exists) newLayers.push(type)
          if (!hasValues && exists)
            newLayers = newLayers.filter((l) => l !== type)

          return { selected: newSelected, activeLayers: newLayers }
        }),
      clearFilters: () =>
        set((state) => ({
          selected: { creators: [], categories: [], formats: [] },
          activeLayers: state.activeLayers.filter(
            (l) => l !== "creators" && l !== "categories" && l !== "formats",
          ),
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

export * from "./storage.js"
export * from "./utils.js"
export * from "./plugin.js"

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
