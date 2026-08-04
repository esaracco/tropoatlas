// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest"
import { useCollectionStore } from "./index.js"

describe("useCollectionStore", () => {
  // Reset the store before each test to ensure a clean state
  beforeEach(() => {
    useCollectionStore.setState({
      items: {},
      creators: [],
      categories: [],
      formats: [],
      selected: {
        creators: [],
        categories: [],
        formats: [],
      },
      sort: "added_desc",
    })
  })

  it("should initialize with default state", () => {
    const state = useCollectionStore.getState()
    expect(state.items).toEqual({})
    expect(state.selected.creators).toEqual([])
    expect(state.sort).toBe("added_desc")
  })

  it("should update filters correctly (setFilter)", () => {
    const store = useCollectionStore.getState()

    // Act
    store.setFilter("categories", ["Rock", "Electronic"])

    // Assert
    const newState = useCollectionStore.getState()
    expect(newState.selected.categories).toEqual(["Rock", "Electronic"])
    // Ensure others are untouched
    expect(newState.selected.creators).toEqual([])
  })

  it("should clear all filters correctly (clearFilters)", () => {
    // Arrange: Set some filters
    useCollectionStore.setState({
      selected: {
        creators: ["Pink Floyd"],
        categories: ["Rock"],
        formats: ["Vinyl"],
      },
    })

    // Act
    useCollectionStore.getState().clearFilters()

    // Assert
    const newState = useCollectionStore.getState()
    expect(newState.selected.creators).toEqual([])
    expect(newState.selected.categories).toEqual([])
    expect(newState.selected.formats).toEqual([])
  })

  it("should update sort order (setSort)", () => {
    const store = useCollectionStore.getState()

    // Act
    store.setSort("title_asc")

    // Assert
    expect(useCollectionStore.getState().sort).toBe("title_asc")
  })
})
