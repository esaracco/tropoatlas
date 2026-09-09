import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { DiscogsPlugin, getArtistName } from "./index.js"

describe("DiscogsPlugin - getDefaultSort", () => {
  it("should return default sort order added_desc", () => {
    const plugin = new DiscogsPlugin()
    expect(plugin.getDefaultSort()).toBe("added_desc")
  })
})

describe("DiscogsPlugin - getPreservedKeys", () => {
  it("should return customFieldsInfo", () => {
    const plugin = new DiscogsPlugin()
    expect(plugin.getPreservedKeys()).toEqual(["customFieldsInfo"])
  })
})

describe("DiscogsPlugin - getArtistName", () => {
  it("should return name when no ANV is provided", () => {
    expect(getArtistName({ name: "Pink Floyd" })).toBe("Pink Floyd")
  })

  it("should return name when both name and ANV are in latin script", () => {
    expect(getArtistName({ name: "Björk", anv: "Bjork" })).toBe("Björk")
  })

  it("should return latin ANV when primary name is non-latin", () => {
    expect(
      getArtistName({ name: "Владимир Высоцкий", anv: "Vladimir Vissotski" }),
    ).toBe("Vladimir Vissotski")
  })

  it("should keep non-latin name if ANV is also non-latin", () => {
    expect(getArtistName({ name: "亜蘭知子", anv: "アラントモコ" })).toBe(
      "亜蘭知子",
    )
  })

  it("should fallback to ANV if name is missing or empty", () => {
    expect(getArtistName({ name: "", anv: "Iron Maiden" })).toBe("Iron Maiden")
  })

  it("should return empty string if no artist object or empty object is passed", () => {
    expect(getArtistName()).toBe("")
    expect(getArtistName({})).toBe("")
  })
})

describe("DiscogsPlugin - differential synchronization", () => {
  let plugin

  beforeEach(() => {
    plugin = new DiscogsPlugin({
      user: "testuser",
      token: "testtoken",
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should preserve existing cached items and remove deleted items", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url)
      if (urlStr.includes("users/testuser/collection/fields")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          text: () => Promise.resolve(JSON.stringify({ fields: [] })),
        })
      }
      if (urlStr.includes("per_page=1")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          text: () =>
            Promise.resolve(JSON.stringify({ pagination: { items: 2 } })),
        })
      }
      if (urlStr.includes("page=1")) {
        // Remote collection contains instance 101 and 103 (102 was removed)
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                releases: [
                  {
                    instance_id: 101,
                    folder_id: 0,
                    rating: 5,
                    date_added: "2026-01-01",
                    basic_information: {
                      id: 1,
                      master_id: 10,
                      year: 1973,
                      title: "The Dark Side of the Moon",
                      formats: [{ name: "Vinyl" }],
                      artists: [{ name: "Pink Floyd" }],
                    },
                  },
                  {
                    instance_id: 103,
                    folder_id: 0,
                    rating: 4,
                    date_added: "2026-02-01",
                    basic_information: {
                      id: 3,
                      master_id: 30,
                      year: 1975,
                      title: "Wish You Were Here",
                      formats: [{ name: "Vinyl" }],
                      artists: [{ name: "Pink Floyd" }],
                    },
                  },
                ],
              }),
            ),
        })
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({})),
      })
    })

    const existingItems = {
      101: {
        id: 101,
        title: "The Dark Side of the Moon",
        tracklist: [{ title: "Speak to Me" }, { title: "Breathe" }],
        notes: "Detailed gatefold notes",
        country: "UK",
      },
      102: {
        id: 102,
        title: "Deleted Album",
      },
    }

    const collection = await plugin.getCollection(null, {
      forceRefresh: false,
      existingItems,
    })

    // Item 101 must be preserved with its enriched details
    expect(collection[101]).toBe(existingItems[101])
    expect(collection[101].tracklist).toEqual([
      { title: "Speak to Me" },
      { title: "Breathe" },
    ])
    expect(collection[101].notes).toBe("Detailed gatefold notes")

    // Item 102 was deleted on Discogs and must not be in collection
    expect(collection[102]).toBeUndefined()

    // Item 103 is newly added and normalized
    expect(collection[103]).toBeDefined()
    expect(collection[103].title).toBe("Wish You Were Here")
  })
})
