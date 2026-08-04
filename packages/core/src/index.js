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
      sort: "added_desc", // 'creator', 'title', 'added_desc', etc.

      // Actions
      setItems: (items) => set({ items }),
      setCreators: (creators) => set({ creators }),
      setCategories: (categories) => set({ categories }),
      setFormats: (formats) => set({ formats }),

      setFilter: (type, values) =>
        set((state) => ({
          selected: { ...state.selected, [type]: values },
        })),
      clearFilters: () =>
        set({ selected: { creators: [], categories: [], formats: [] } }),

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
