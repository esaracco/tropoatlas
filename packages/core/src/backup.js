import JSZip from "jszip"
import {
  STORAGE_SCHEMA_VERSION,
  buildCacheKey,
  getLargeItem,
  setLargeItem,
  getItem,
  setItem,
} from "./storage.js"
import { useCollectionStore } from "./index.js"

// Dummy marker function allowing static analyzer to extract i18n keys.
const t = (s) => s

// Convert a Blob object into a Base64 Data URL string.
const blobToDataURL = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Convert a Base64 Data URL string back into a Blob object.
const dataURLToBlob = (dataUrl) => {
  const parts = dataUrl.split(",")
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg"
  const bstr = atob(parts[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

// Shared state to track proxy availability and prevent repeated 404 errors.
let isProxyAvailable = true

// Helper to retrieve an image blob from Cache Storage API or local proxy.
const getCachedImageBlob = async (
  url,
  coversCache,
  allowNetwork = true,
  throttledFetch = null,
) => {
  if (!url) return null

  // If already a Data URL, convert directly to Blob
  if (url.startsWith("data:")) {
    try {
      return dataURLToBlob(url)
    } catch {
      return null
    }
  }

  // Check browser Cache Storage API first
  if (coversCache) {
    try {
      let match = await coversCache.match(url)
      if (!match && url.includes("?")) {
        match = await coversCache.match(url.split("?")[0])
      }
      if (match) {
        const blob = await match.blob()
        // Reject opaque responses which produce empty 0-byte blobs
        if (blob && blob.size > 0) {
          return blob
        }
      }
    } catch (err) {
      console.warn("Failed to read image from Cache API:", err.message)
    }
  }

  // If network fetching is disabled, stop here without calling proxy
  if (!allowNetwork) {
    return null
  }

  // Fetch via local image proxy if available
  if (isProxyAvailable) {
    try {
      // Route Discogs CDN artwork URLs through dedicated proxy
      let proxyUrl
      if (url.startsWith("/api/")) {
        proxyUrl = url
      } else if (url.startsWith("https://i.discogs.com/")) {
        proxyUrl = `/api/discogs-image/${url.replace("https://i.discogs.com/", "")}`
      } else {
        proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`
      }

      const doFetch = () => fetch(proxyUrl)
      const response = throttledFetch
        ? await throttledFetch(doFetch)
        : await doFetch()

      if (response.ok) {
        const blob = await response.blob()
        if (blob && blob.size > 0) {
          // Cache valid response for subsequent operations
          if (coversCache) {
            try {
              await coversCache.put(
                url,
                new Response(blob, {
                  headers: { "Content-Type": blob.type || "image/jpeg" },
                }),
              )
            } catch (e) {
              console.warn(
                "Failed to store proxy image in Cache API:",
                e.message,
              )
            }
          }
          return blob
        }
      } else if (response.status === 404) {
        // Disable proxy attempts if route is not configured on web server
        isProxyAvailable = false
        console.warn(
          "Image proxy returned 404. " +
            "Skipping external image fetching during backup export.",
        )
      }
    } catch (err) {
      console.warn("Failed to fetch image via proxy:", err.message)
    }
  }

  return null
}

// Helper to create a rate-limited sequencer ensuring delay between calls.
const createRateLimiter = (requestsPerMinute, signal = null) => {
  const effectiveLimit = Math.max(1, Math.min(requestsPerMinute, 60))
  const delayMs = Math.ceil(60000 / effectiveLimit)
  let lastRequestTime = 0

  return async (fn) => {
    if (signal?.aborted) {
      throw new Error("Export cancelled")
    }
    const now = Date.now()
    const elapsed = now - lastRequestTime
    if (elapsed < delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs - elapsed))
    }
    if (signal?.aborted) {
      throw new Error("Export cancelled")
    }
    lastRequestTime = Date.now()
    return fn()
  }
}

// Estimate duration and missing items for complete collection backup export.
export const estimateExportBackupDuration = async ({
  items = null,
  coversCache = null,
  maxRequestsPerMinute = 60,
} = {}) => {
  const collection = items || (await getLargeItem("items")) || {}
  const entries = Object.values(collection)
  if (entries.length === 0) {
    return {
      missingDetailsCount: 0,
      missingCoversCount: 0,
      totalNetworkCalls: 0,
      estimatedSeconds: 0,
    }
  }

  let cache = coversCache
  if (!cache && typeof window !== "undefined" && "caches" in window) {
    try {
      cache = await caches.open(buildCacheKey("item-covers"))
    } catch {
      cache = null
    }
  }

  let missingDetailsCount = 0
  let apiCalls = 0
  let missingCoversCount = 0

  for (const item of entries) {
    // Check missing details (tracklist / notes)
    if (item.tracklist === undefined) {
      missingDetailsCount++
      apiCalls += item.masterid ? 2 : 1
    }

    // Check missing cover in cache
    if (item.cover && !item.cover.startsWith("data:")) {
      let isCached = false
      if (cache) {
        try {
          let match = await cache.match(item.cover)
          if (!match && item.cover.includes("?")) {
            match = await cache.match(item.cover.split("?")[0])
          }
          isCached = !!match
        } catch {
          isCached = false
        }
      }
      if (!isCached) {
        missingCoversCount++
      }
    }
  }

  const totalNetworkCalls = apiCalls + missingCoversCount
  const effectiveLimit = Math.max(
    1,
    Math.min(maxRequestsPerMinute || 60, 60) - 5,
  )
  const effectiveApiLimit = effectiveLimit
  const effectiveImageLimit = effectiveLimit

  const apiDurationSecs =
    apiCalls > 0 ? Math.ceil((apiCalls * 60) / effectiveApiLimit) : 0
  const imageDurationSecs =
    missingCoversCount > 0
      ? Math.ceil((missingCoversCount * 60) / effectiveImageLimit)
      : 0

  // Estimated total duration is the bottleneck of parallel API and image queues
  const estimatedSeconds =
    totalNetworkCalls > 0 ? Math.max(apiDurationSecs, imageDurationSecs) + 2 : 0

  return {
    missingDetailsCount,
    missingCoversCount,
    totalNetworkCalls,
    estimatedSeconds,
  }
}

// Helper to format duration into human-readable text without technical jargon.
export const formatDuration = (
  seconds,
  t = (s, params) => {
    if (!params) return s
    let result = s
    for (const [key, val] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), String(val))
    }
    return result
  },
) => {
  if (seconds <= 0 || seconds < 10) {
    return t("less than a minute")
  }
  if (seconds < 60) {
    return t("about {{count}} seconds", { count: seconds })
  }
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (seconds < 3600) {
    if (secs === 0) {
      return mins === 1
        ? t("about 1 minute")
        : t("about {{count}} minutes", { count: mins })
    }
    return t("about {{min}} min {{sec}} s", { min: mins, sec: secs })
  }

  const hours = Math.floor(seconds / 3600)
  const remMins = Math.floor((seconds % 3600) / 60)
  return t("about {{hour}} h {{min}} min", { hour: hours, min: remMins })
}

// Export collection metadata and binary covers into a ZIP file.
export const exportCollectionBackupZIP = async (optionsOrProgress) => {
  isProxyAvailable = true
  let options = {}
  if (typeof optionsOrProgress === "function") {
    options = { onProgress: optionsOrProgress }
  } else if (optionsOrProgress && typeof optionsOrProgress === "object") {
    options = optionsOrProgress
  }

  const {
    onProgress,
    enrichMissing = false,
    getItemDetails = null,
    getItemImage = null,
    maxRequestsPerMinute = 60,
    signal = null,
  } = options

  const items = await getLargeItem("items")
  if (!items || Object.keys(items).length === 0) {
    throw new Error(t("No collection data found to export."))
  }

  const categories = getItem("categories") || []

  const zip = new JSZip()
  const coversFolder = zip.folder("covers")

  let coversCache = null
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      coversCache = await caches.open(buildCacheKey("item-covers"))
    } catch (e) {
      console.warn("Could not open Cache Storage API:", e.message)
    }
  }

  // Independent rate limiters for API requests and image proxy downloads
  const effectiveLimit = Math.max(
    1,
    Math.min(maxRequestsPerMinute || 60, 60) - 5,
  )
  const effectiveApiLimit = effectiveLimit
  const effectiveImageLimit = effectiveLimit

  const apiThrottler = createRateLimiter(effectiveApiLimit, signal)
  const imageThrottler = createRateLimiter(effectiveImageLimit, signal)

  const entries = Object.entries(items)
  const totalEntries = entries.length

  // Calculate remaining network calls for progress and countdown estimation
  let remainingApiCalls = 0
  let remainingImageCalls = 0

  if (enrichMissing) {
    for (const [, rawItem] of entries) {
      if (rawItem.tracklist === undefined) {
        remainingApiCalls += rawItem.masterid ? 2 : 1
      }
      if (rawItem.cover && !rawItem.cover.startsWith("data:")) {
        let isCached = false
        if (coversCache) {
          try {
            let match = await coversCache.match(rawItem.cover)
            if (!match && rawItem.cover.includes("?")) {
              match = await coversCache.match(rawItem.cover.split("?")[0])
            }
            isCached = !!match
          } catch {
            isCached = false
          }
        }
        if (!isCached) {
          remainingImageCalls++
        }
      }
    }
  }

  const reportProgress = (percent, remainingSecs = null, phase = "") => {
    if (onProgress) {
      onProgress(percent, {
        remainingSeconds: remainingSecs,
        phase,
      })
    }
  }

  const exportedItems = {}
  let hasUpdatedItems = false
  let failedItemsCount = 0

  try {
    for (let i = 0; i < totalEntries; i++) {
      if (signal?.aborted) {
        throw new Error("Export cancelled")
      }

      const [key, rawItem] = entries[i]
      let localItem = { ...rawItem }
      const itemId = localItem.id || localItem.instanceid || key
      let itemFailed = false
      let zipCoverPath = null

      // Parallel execution of details fetching (API) and cover download (Image)
      const detailTask = async () => {
        if (
          enrichMissing &&
          getItemDetails &&
          localItem.tracklist === undefined
        ) {
          try {
            const detailed = await apiThrottler(() => getItemDetails(localItem))
            if (detailed) {
              localItem = { ...localItem, ...detailed }
              hasUpdatedItems = true
            }
          } catch (err) {
            if (signal?.aborted) throw new Error("Export cancelled")
            itemFailed = true
            console.warn(
              `Failed to fetch details for item ${itemId}:`,
              err.message,
            )
          } finally {
            const callsDone = localItem.masterid ? 2 : 1
            remainingApiCalls = Math.max(0, remainingApiCalls - callsDone)
          }
        }

        // Fetch missing cover URL if requested
        if (enrichMissing && getItemImage && !localItem.cover) {
          try {
            const images = await apiThrottler(() => getItemImage(localItem))
            if (images && images.cover) {
              localItem.cover = images.cover
              hasUpdatedItems = true
            }
          } catch (err) {
            if (signal?.aborted) throw new Error("Export cancelled")
            itemFailed = true
            console.warn(
              `Failed to fetch image for item ${itemId}:`,
              err.message,
            )
          }
        }
      }

      const imageTask = async () => {
        if (localItem.cover) {
          let isCached = false
          if (coversCache) {
            try {
              let match = await coversCache.match(localItem.cover)
              if (!match && localItem.cover.includes("?")) {
                match = await coversCache.match(localItem.cover.split("?")[0])
              }
              isCached = !!match
            } catch {
              isCached = false
            }
          }

          // If not cached, image fetch will only go through network proxy
          // when enrichMissing is true
          const coverBlob = await getCachedImageBlob(
            localItem.cover,
            coversCache,
            enrichMissing,
            enrichMissing ? imageThrottler : null,
          )

          if (!isCached && enrichMissing) {
            remainingImageCalls = Math.max(0, remainingImageCalls - 1)
          }

          if (coverBlob && coverBlob.size > 0) {
            const ext = coverBlob.type.includes("png") ? "png" : "jpg"
            const relativePath = `covers/${itemId}.${ext}`
            coversFolder.file(`${itemId}.${ext}`, coverBlob)
            zipCoverPath = relativePath
          } else if (enrichMissing && !isCached) {
            itemFailed = true
          }
        }
      }

      // Run detail and image tasks in parallel with their independent throttlers
      await Promise.all([detailTask(), imageTask()])

      // If cover was discovered during detailTask and not yet processed
      if (
        localItem.cover &&
        !zipCoverPath &&
        !localItem.cover.startsWith("data:")
      ) {
        await imageTask()
      }

      if (itemFailed) {
        failedItemsCount++
      }

      // Preserve clean local item in storage with valid proxy/web URL
      items[key] = localItem

      // Prepare exported item for ZIP archive with relative covers/ path
      const exportedItem = { ...localItem }
      exportedItem.cover = zipCoverPath || localItem.cover || null
      exportedItems[itemId] = exportedItem

      const percent = Math.round(((i + 1) / totalEntries) * 70)
      const apiSecs =
        remainingApiCalls > 0
          ? Math.ceil((remainingApiCalls * 60) / effectiveApiLimit)
          : 0
      const imgSecs =
        remainingImageCalls > 0
          ? Math.ceil((remainingImageCalls * 60) / effectiveImageLimit)
          : 0
      const remSecs = enrichMissing ? Math.max(apiSecs, imgSecs) : 0
      reportProgress(percent, remSecs, "exporting")
    }
  } finally {
    // Persist enriched items to storage so progress is saved even on cancel
    if (hasUpdatedItems) {
      try {
        await setLargeItem("items", items)
        useCollectionStore?.getState?.()?.setItems?.(items)
      } catch (e) {
        console.warn("Failed to persist enriched items to storage:", e.message)
      }
    }
  }

  const collectionJson = {
    version: STORAGE_SCHEMA_VERSION,
    app: import.meta.env.VITE_APP_NAME || "tropoatlas",
    exportDate: new Date().toISOString(),
    provider: import.meta.env.VITE_DATA_PROVIDER || "discogs",
    categories,
    items: exportedItems,
  }

  zip.file("collection.json", JSON.stringify(collectionJson, null, 2))

  if (signal?.aborted) {
    throw new Error("Export cancelled")
  }

  // Generate final ZIP blob with compression
  const zipBlob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE" },
    (metadata) => {
      // Scale ZIP compression progress from 70% to 100%
      const compPercent = 70 + Math.round(metadata.percent * 0.3)
      reportProgress(compPercent, 0, "compressing")
    },
  )

  if (signal?.aborted) {
    throw new Error("Export cancelled")
  }

  // Trigger file download in browser
  const dateStr = new Date().toISOString().slice(0, 10)
  const appName = import.meta.env.VITE_APP_NAME || "tropoatlas"
  const fileName = `${appName}-backup-${dateStr}.zip`

  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return {
    success: true,
    failedItemsCount,
  }
}

// Import collection metadata and binary covers from a ZIP file.
export const importCollectionBackupZIP = async (file, onProgress) => {
  const zip = await JSZip.loadAsync(file)

  const jsonFile = zip.file("collection.json")
  if (!jsonFile) {
    throw new Error(t("Invalid backup file: collection.json is missing."))
  }

  const jsonText = await jsonFile.async("string")
  const backupData = JSON.parse(jsonText)

  if (!backupData.items || typeof backupData.items !== "object") {
    throw new Error(t("Invalid backup content: items object is missing."))
  }

  const importedItems = {}
  const entries = Object.entries(backupData.items)
  const totalEntries = entries.length

  for (let i = 0; i < totalEntries; i++) {
    const [key, rawItem] = entries[i]
    const item = { ...rawItem }

    // Restore cover artwork binary image from ZIP as standalone Data URL
    if (
      item.cover &&
      (item.cover.startsWith("covers/") || zip.file(item.cover))
    ) {
      const coverFile = zip.file(item.cover)
      if (coverFile) {
        const isPng = item.cover.toLowerCase().endsWith(".png")
        const mimeType = isPng ? "image/png" : "image/jpeg"
        const uint8Array = await coverFile.async("uint8array")
        const blob = new Blob([uint8Array], { type: mimeType })
        const dataUrl = await blobToDataURL(blob)
        item.cover = dataUrl
      }
    }

    importedItems[item.id || item.instanceid || key] = item

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalEntries) * 100))
    }
  }

  const categories = backupData.categories || []

  // Persist imported collection items and categories to storage
  await setLargeItem("items", importedItems)
  setItem("categories", categories)

  return {
    items: importedItems,
    categories,
  }
}
