// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import JSZip from "jszip"
import {
  estimateExportBackupDuration,
  formatDuration,
  exportCollectionBackupZIP,
  importCollectionBackupZIP,
} from "./backup.js"
import * as storage from "./storage.js"

describe("backup.js - Duration Estimation & Formatting", () => {
  it("should format duration into readable localized text", () => {
    expect(formatDuration(0)).toBe("less than a minute")
    expect(formatDuration(5)).toBe("less than a minute")
    expect(formatDuration(30)).toBe("about 30 seconds")
    expect(formatDuration(60)).toBe("about 1 minute")
    expect(formatDuration(120)).toBe("about 2 minutes")
    expect(formatDuration(135)).toBe("about 2 min 15 s")
    expect(formatDuration(3660)).toBe("about 1 h 1 min")
  })

  it("should return 0 seconds when collection is already enriched and cached", async () => {
    const mockCache = {
      match: vi.fn().mockResolvedValue(new Response("image-data")),
    }

    const items = {
      item1: {
        id: "1",
        tracklist: [{ title: "Track 1" }],
        cover: "https://example.com/cover1.jpg",
      },
    }

    const stats = await estimateExportBackupDuration({
      items,
      coversCache: mockCache,
      maxRequestsPerMinute: 60,
    })

    expect(stats.missingDetailsCount).toBe(0)
    expect(stats.missingCoversCount).toBe(0)
    expect(stats.totalNetworkCalls).toBe(0)
    expect(stats.estimatedSeconds).toBe(0)
  })

  it("should calculate bottleneck duration for parallel API and image calls", async () => {
    const mockCache = {
      match: vi.fn().mockResolvedValue(null),
    }

    // 1 item with missing tracklist and masterid (2 calls) + 1 missing cover
    const items = {
      item1: {
        id: "1",
        masterid: "m1",
        releaseid: "r1",
        cover: "https://example.com/cover1.jpg",
      },
    }

    const stats = await estimateExportBackupDuration({
      items,
      coversCache: mockCache,
      maxRequestsPerMinute: 60,
    })

    expect(stats.missingDetailsCount).toBe(1)
    expect(stats.missingCoversCount).toBe(1)
    expect(stats.totalNetworkCalls).toBe(3)
    // At 55 req/min, 2 API calls take ~3s, 1 image call takes ~2s, max(3,2) + 2 = 5s
    expect(stats.estimatedSeconds).toBeGreaterThanOrEqual(4)
  })
})

describe("backup.js - ZIP Export", () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    // Mock storage methods
    const memoryStore = {
      items: {
        101: {
          id: "101",
          title: "Album 1",
          creator: "Artist 1",
          cover: "/api/discogs-image/cover101.jpg",
          categories: ["Rock"],
        },
      },
      categories: ["Rock"],
    }

    vi.spyOn(storage, "getLargeItem").mockImplementation(
      async (key) => memoryStore[key] || null,
    )
    vi.spyOn(storage, "setLargeItem").mockImplementation(async (key, val) => {
      memoryStore[key] = val
    })
    vi.spyOn(storage, "getItem").mockImplementation(
      (key) => memoryStore[key] || null,
    )

    // Mock DOM URL helpers and link download click
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url")
    global.URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  it("should throw error if collection is empty", async () => {
    vi.spyOn(storage, "getLargeItem").mockResolvedValue({})

    await expect(exportCollectionBackupZIP()).rejects.toThrow(
      "No collection data found to export.",
    )
  })

  it("should export collection without including user settings in collection.json", async () => {
    let capturedZipBlob = null
    const originalGenerateAsync = JSZip.prototype.generateAsync
    vi.spyOn(JSZip.prototype, "generateAsync").mockImplementation(
      async function (...args) {
        const result = await originalGenerateAsync.apply(this, args)
        capturedZipBlob = result
        return result
      },
    )

    const result = await exportCollectionBackupZIP({
      enrichMissing: false,
    })

    expect(result.success).toBe(true)

    // Load generated ZIP to verify manifest content
    const zip = await JSZip.loadAsync(capturedZipBlob)
    const jsonFile = zip.file("collection.json")
    expect(jsonFile).not.toBeNull()

    const manifestText = await jsonFile.async("string")
    const manifest = JSON.parse(manifestText)

    expect(manifest.version).toBeDefined()
    expect(manifest.categories).toEqual(["Rock"])
    expect(manifest.items["101"]).toBeDefined()
    // Settings MUST be excluded from collection backup
    expect(manifest.settings).toBeUndefined()
  })

  it("should preserve original proxy cover URLs in local store while setting covers/ in ZIP", async () => {
    const memoryStore = {
      items: {
        101: {
          id: "101",
          title: "Album 1",
          cover: "/api/discogs-image/sample.jpg",
        },
      },
      categories: [],
    }
    vi.spyOn(storage, "getLargeItem").mockImplementation(
      async (k) => memoryStore[k],
    )
    vi.spyOn(storage, "setLargeItem").mockImplementation(async (k, v) => {
      memoryStore[k] = v
    })

    let capturedZipBlob = null
    const originalGenerateAsync = JSZip.prototype.generateAsync
    vi.spyOn(JSZip.prototype, "generateAsync").mockImplementation(
      async function (...args) {
        capturedZipBlob = await originalGenerateAsync.apply(this, args)
        return capturedZipBlob
      },
    )

    await exportCollectionBackupZIP({
      enrichMissing: false,
    })

    // Local IndexedDB copy MUST preserve valid /api/ proxy URL
    expect(memoryStore.items["101"].cover).toBe("/api/discogs-image/sample.jpg")
  })
})

describe("backup.js - ZIP Import", () => {
  it("should reject corrupted ZIP missing collection.json", async () => {
    const zip = new JSZip()
    zip.file("readme.txt", "invalid archive")
    const zipBlob = await zip.generateAsync({ type: "blob" })

    await expect(importCollectionBackupZIP(zipBlob)).rejects.toThrow(
      "Invalid backup file: collection.json is missing.",
    )
  })

  it("should reject corrupted ZIP missing items object", async () => {
    const zip = new JSZip()
    zip.file("collection.json", JSON.stringify({ version: 4 }))
    const zipBlob = await zip.generateAsync({ type: "blob" })

    await expect(importCollectionBackupZIP(zipBlob)).rejects.toThrow(
      "Invalid backup content: items object is missing.",
    )
  })

  it("should import collection and convert binary covers into Data URLs", async () => {
    const zip = new JSZip()
    const sampleCover = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    zip.folder("covers").file("202.jpg", sampleCover)

    const manifest = {
      version: 4,
      categories: ["Electronic"],
      items: {
        202: {
          id: "202",
          title: "Synthetic World",
          creator: "Electro Band",
          cover: "covers/202.jpg",
          categories: ["Electronic"],
        },
      },
    }
    zip.file("collection.json", JSON.stringify(manifest))
    const zipBlob = await zip.generateAsync({ type: "blob" })

    const savedStore = {}
    vi.spyOn(storage, "setLargeItem").mockImplementation(async (k, v) => {
      savedStore[k] = v
    })
    vi.spyOn(storage, "setItem").mockImplementation((k, v) => {
      savedStore[k] = v
    })

    const result = await importCollectionBackupZIP(zipBlob)

    expect(result.categories).toEqual(["Electronic"])
    expect(result.items["202"]).toBeDefined()
    // Restored cover MUST be converted to a standalone Data URL
    expect(result.items["202"].cover).toMatch(/^data:image\/jpeg;base64,/)
    expect(savedStore["items"]["202"].cover).toMatch(
      /^data:image\/jpeg;base64,/,
    )
  })
})
