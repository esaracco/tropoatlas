import { describe, it, expect } from "vitest"
import { TMDBPlugin } from "./index.js"

describe("TMDBPlugin - cleanListId", () => {
  const plugin = new TMDBPlugin()

  it("should extract numeric id from a clean numeric string", () => {
    expect(plugin.cleanListId("8691537")).toBe("8691537")
  })

  it("should extract numeric id from slug string with name", () => {
    expect(plugin.cleanListId("8691537-liste-perso")).toBe("8691537")
  })

  it("should extract numeric id from full URL", () => {
    expect(
      plugin.cleanListId("https://www.themoviedb.org/list/8691537-liste-perso"),
    ).toBe("8691537")
  })

  it("should return null on null or undefined input", () => {
    expect(plugin.cleanListId(null)).toBeNull()
    expect(plugin.cleanListId(undefined)).toBeNull()
    expect(plugin.cleanListId("")).toBeNull()
  })
})

describe("TMDBPlugin - metadata and categories", () => {
  const plugin = new TMDBPlugin()

  it("should return correct provider info", () => {
    const info = plugin.getProviderInfo()
    expect(info.name).toBe("TMDB")
    expect(info.url).toBe("https://www.themoviedb.org")
    expect(info.multipleFormats).toBe(false)
  })

  it("should return max 1200 requests per minute", () => {
    expect(plugin.getMaxRequestsPerMinute()).toBe(1200)
  })

  it("should return default sort order added_desc", () => {
    expect(plugin.getDefaultSort()).toBe("added_desc")
  })

  it("should extract unique sorted categories from items map", () => {
    const items = {
      1: { categories: ["Action", "Science-Fiction"] },
      2: { categories: ["Drame", "Action"] },
      3: { categories: ["Comédie"] },
    }
    expect(plugin.getCategories(items)).toEqual([
      "Action",
      "Comédie",
      "Drame",
      "Science-Fiction",
    ])
  })
})

describe("TMDBPlugin - image proxying and devMode", () => {
  const plugin = new TMDBPlugin()
  const devPlugin = new TMDBPlugin({ devMode: true })

  it("should rewrite remote TMDB image URLs to local proxy endpoint", () => {
    expect(
      plugin.getImageProxyUrl("https://image.tmdb.org/t/p/w342/sample.jpg"),
    ).toBe("/api/tmdb-image/t/p/w342/sample.jpg")
  })

  it("should return already proxied URLs unchanged", () => {
    expect(plugin.getImageProxyUrl("/api/tmdb-image/t/p/w342/sample.jpg")).toBe(
      "/api/tmdb-image/t/p/w342/sample.jpg",
    )
  })

  it("should return null for getItemImage in devMode", async () => {
    const result = await devPlugin.getItemImage({ id: 123 })
    expect(result).toBeNull()
  })
})

describe("TMDBPlugin - getPreservedKeys", () => {
  it("should return syncedListId", () => {
    const plugin = new TMDBPlugin()
    expect(plugin.getPreservedKeys()).toEqual(["syncedListId"])
  })
})
