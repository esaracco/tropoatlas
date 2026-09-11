import { create } from "zustand"
import { persist } from "zustand/middleware"
import { buildCacheKey } from "./storage"

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

export * from "./storage.js"
export * from "./utils.js"
export * from "./plugin.js"
export * from "./backup.js"
export * from "./sync.js"

// Canonical item field names across data providers and apps
export const FIELD_PLACE = "place"
export const FIELD_PRICE = "price"
export const FIELD_CATEGORIES = "categories"
export const FIELD_RATING = "rating"

// Resolves terminology from a plugin instance or returns generic defaults
export const getPluginTerminology = (plugin) => {
  if (plugin && typeof plugin.getTerminology === "function") {
    return plugin.getTerminology()
  }
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
