// @vitest-environment jsdom
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
  it("should return syncedListId and customFieldsInfo", () => {
    const plugin = new TMDBPlugin()
    expect(plugin.getPreservedKeys()).toEqual([
      "syncedListId",
      "customFieldsInfo",
    ])
  })
})

describe("TMDBPlugin - updateItem", () => {
  it("should serialize rating, place, and price into comment for PUT payload", async () => {
    const plugin = new TMDBPlugin({ listId: "12345" })
    let capturedBody = null

    globalThis.fetch = async (url, options) => {
      capturedBody = JSON.parse(options.body)
      return {
        ok: true,
        status: 200,
        json: async () => ({ status_code: 1 }),
      }
    }

    const item = { id: 999, media_type: "movie", comment: "" }
    await plugin.updateItem(item, { rating: 5, place: "42", price: "19.99" })

    expect(capturedBody).toEqual({
      items: [
        {
          media_type: "movie",
          media_id: 999,
          comment: "place: 42, price: 19.99, rating: 5",
        },
      ],
    })
  })

  it("should throw dedicated write permission error on status_code 36", async () => {
    const plugin = new TMDBPlugin({ listId: "12345" })

    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({
        status_code: 36,
        status_message:
          "This token hasn't been granted write permission by the user.",
      }),
    })

    const item = { id: 999, media_type: "movie", comment: "" }
    await expect(plugin.updateItem(item, { place: "42" })).rejects.toThrow(
      /write permission/i,
    )
  })

  it("should include TMDB status_message in error if present", async () => {
    const plugin = new TMDBPlugin({ listId: "12345" })

    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      json: async () => ({
        status_code: 34,
        status_message: "The resource you requested could not be found.",
      }),
    })

    const item = { id: 999, media_type: "movie", comment: "" }
    await expect(plugin.updateItem(item, { place: "42" })).rejects.toThrow(
      "TMDB API error (404): The resource you requested could not be found.",
    )
  })
})

describe("TMDBPlugin - custom fields and price sanitization", () => {
  it("should extract and sanitize numeric price from list comments", async () => {
    const plugin = new TMDBPlugin({ listId: "12345" })

    globalThis.fetch = async (url) => {
      const urlStr = String(url)
      if (urlStr.includes("genre/movie/list")) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ genres: [] }),
        }
      }
      if (urlStr.includes("4/list/12345")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              results: [
                {
                  id: 101,
                  media_type: "movie",
                  title: "Inception",
                  release_date: "2010-07-16",
                },
              ],
              comments: {
                "movie:101": "place: 3, price: 9,99 €, rating: 5",
              },
              total_pages: 1,
            }),
        }
      }
      if (urlStr.includes("movie/101")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              credits: {
                crew: [{ job: "Director", name: "Christopher Nolan" }],
                cast: [],
              },
            }),
        }
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({}),
      }
    }

    const collection = await plugin.getCollection()
    expect(collection[101].price).toBe("9.99")
    expect(collection[101].place).toBe("3")
    expect(collection[101].rating).toBe(5)
  })
})
