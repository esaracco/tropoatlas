import { describe, it, expect } from "vitest"
import {
  InventairePlugin,
  MIN_DESCRIPTION_LENGTH,
  isBiography,
  isTitleMatch,
} from "./index.js"

describe("InventairePlugin - metadata and default sorting", () => {
  const plugin = new InventairePlugin()

  it("should return correct provider info", () => {
    const info = plugin.getProviderInfo()
    expect(info.name).toBe("Inventaire")
    expect(info.url).toBe("https://inventaire.io")
    expect(info.multipleFormats).toBe(false)
  })

  it("should return default sort order added_desc", () => {
    expect(plugin.getDefaultSort()).toBe("added_desc")
  })

  it("should return preserved storage keys", () => {
    expect(plugin.getPreservedKeys()).toEqual([
      "syncedInventory",
      "customFieldsInfo",
    ])
  })

  it("should return max 60 requests per minute", () => {
    expect(plugin.getMaxRequestsPerMinute()).toBe(60)
  })

  it("should configure minDescriptionLength with default of 200", () => {
    expect(MIN_DESCRIPTION_LENGTH).toBe(200)
    expect(plugin.minDescriptionLength).toBe(200)
    const custom = new InventairePlugin({ minDescriptionLength: 150 })
    expect(custom.minDescriptionLength).toBe(150)
  })
})

describe("InventairePlugin - categories and creators extraction", () => {
  const plugin = new InventairePlugin()

  it("should extract unique sorted categories from items map", () => {
    const items = {
      1: { categories: ["Essai", "Philosophie"] },
      2: { categories: ["Histoire", "Essai"] },
      3: { categories: ["Roman"] },
    }
    expect(plugin.getCategories(items)).toEqual([
      "Essai",
      "Histoire",
      "Philosophie",
      "Roman",
    ])
  })

  it("should extract unique sorted creators from items map", () => {
    const items = {
      1: { creator: "Pierre Kropotkine" },
      2: { creator: "Jean-Paul Sartre" },
      3: { creator: "Pierre Kropotkine" },
    }
    expect(plugin.getCreators(items)).toEqual([
      "Jean-Paul Sartre",
      "Pierre Kropotkine",
    ])
  })

  it("should split multiple creators into unique individual authors", () => {
    const items = {
      1: {
        creator: "Félix Guattari, Gilles Deleuze",
        creators: ["Félix Guattari", "Gilles Deleuze"],
      },
      2: {
        creator: "Gilles Deleuze, Félix Guattari",
        creators: ["Gilles Deleuze", "Félix Guattari"],
      },
      3: {
        creator: "Pierre Kropotkine",
      },
      4: {
        creator: "Alan Sokal, Jean Bricmont",
      },
    }
    expect(plugin.getCreators(items)).toEqual([
      "Alan Sokal",
      "Félix Guattari",
      "Gilles Deleuze",
      "Jean Bricmont",
      "Pierre Kropotkine",
    ])
  })
})

describe("InventairePlugin - capabilities and image proxying", () => {
  const plugin = new InventairePlugin()

  it("should report draft capabilities based on configuration", () => {
    const caps = plugin.getDraftCapabilities({
      fieldPlace: "place",
      fieldPrice: "price",
      fieldRating: "rating",
    })
    expect(caps).toEqual({
      supportsPlace: true,
      supportsPrice: true,
      supportsRating: true,
      supportsCategories: true,
    })
  })

  it("should rewrite remote Inventaire image URLs to local proxy endpoint with 300x300 thumbnail", () => {
    expect(
      plugin.getImageProxyUrl("https://inventaire.io/img/entities/hash123"),
    ).toBe("/api/inventaire-image/img/entities/300x300/hash123")
    expect(
      plugin.getImageProxyUrl(
        "https://inventaire.io/img/entities/300x300/hash123",
      ),
    ).toBe("/api/inventaire-image/img/entities/300x300/hash123")
  })

  it("should return already proxied or external URLs unchanged", () => {
    expect(
      plugin.getImageProxyUrl(
        "/api/inventaire-image/img/entities/300x300/hash123",
      ),
    ).toBe("/api/inventaire-image/img/entities/300x300/hash123")
    expect(plugin.getImageProxyUrl("https://example.com/cover.jpg")).toBe(
      "https://example.com/cover.jpg",
    )
  })
})

describe("InventairePlugin - Wikipedia validation helpers", () => {
  it("should identify biographical Wikipedia summaries", () => {
    // Biographical description
    expect(
      isBiography({
        description: "philosophe canadien",
        extract: "Peter Hallward est un philosophe politique socialiste...",
      }),
    ).toBe(true)

    // Biographical opening sentence without explicit description
    expect(
      isBiography({
        description: "",
        extract:
          "Peter Hallward est un philosophe politique socialiste canadien...",
      }),
    ).toBe(true)

    // English biography
    expect(
      isBiography({
        description: "Canadian philosopher",
        extract: "Peter Hallward is a Canadian political philosopher...",
      }),
    ).toBe(true)
  })

  it("should distinguish creative works from biographies", () => {
    // Book with description
    expect(
      isBiography({
        description: "livre d'Alain Badiou",
        extract: "L'Être et l'Événement est un livre du philosophe français...",
      }),
    ).toBe(false)

    // Philosophical essay
    expect(
      isBiography({
        description: "essai philosophique",
        extract: "Deleuze est un essai...",
      }),
    ).toBe(false)

    // English novel
    expect(
      isBiography({
        description: "novel by George Orwell",
        extract: "Nineteen Eighty-Four is a dystopian novel...",
      }),
    ).toBe(false)

    // Unrelated concept (not a person, not a work)
    expect(
      isBiography({
        description: "concept philosophique",
        extract: "L'univocité de l'être est un concept philosophique...",
      }),
    ).toBe(false)

    // Null or empty payload
    expect(isBiography(null)).toBe(false)
    expect(isBiography({})).toBe(false)
  })

  it("should match exact titles, subtitles, and prefixes", () => {
    // Exact identical title
    expect(
      isTitleMatch("Différence et répétition", "Différence et répétition"),
    ).toBe(true)

    // Disambiguation suffix on Wikipedia
    expect(
      isTitleMatch(
        "Différence et répétition (livre)",
        "Différence et répétition",
      ),
    ).toBe(true)

    // Book title prefix (e.g. edition catalog includes years)
    expect(isTitleMatch("Pourparlers", "Pourparlers 1972-1990")).toBe(true)

    // Wikipedia title prefix
    expect(isTitleMatch("Pourparlers 1972-1990", "Pourparlers")).toBe(true)

    // Subtitle match
    expect(
      isTitleMatch("La clameur de l'Être", "Deleuze", "La clameur de l'Être"),
    ).toBe(true)

    // Combined title and subtitle match
    expect(
      isTitleMatch(
        "Deleuze : La clameur de l'Être",
        "Deleuze",
        "La clameur de l'Être",
      ),
    ).toBe(true)
  })

  it("should reject unrelated article titles as exact matches", () => {
    // Related concept article instead of book summary
    expect(isTitleMatch("Société de contrôle", "Pourparlers 1972-1990")).toBe(
      false,
    )

    // Biographer name
    expect(isTitleMatch("Peter Hallward", "Deleuze")).toBe(false)

    // Missing inputs
    expect(isTitleMatch(null, "Pourparlers")).toBe(false)
    expect(isTitleMatch("Pourparlers", null)).toBe(false)
  })
})

describe("InventairePlugin - item details sanitization", () => {
  const plugin = new InventairePlugin()

  it("should sanitize corrupted entity URIs in item.isbn", async () => {
    const item = {
      id: "1",
      hasDetails: true,
      hasWikipedia: true,
      isbn: "inv:6e59f968a1cd00dbedeb1964de9511d4",
    }
    const result = await plugin.getItemDetails(item)
    expect(result.isbn).toBe(null)
  })

  it("should preserve valid ISBNs in item.isbn", async () => {
    const item = {
      id: "1",
      hasDetails: true,
      hasWikipedia: true,
      isbn: "978-2-08-070090-2",
    }
    const result = await plugin.getItemDetails(item)
    expect(result.isbn).toBe("978-2-08-070090-2")
  })
})
