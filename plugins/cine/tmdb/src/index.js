import sleep from "sleep-promise"
import {
  normalize,
  BasePlugin,
  useSettingsStore,
  getItem,
  setItem,
  buildCacheKey,
} from "@tropo/core"
import logo from "./assets/logo.svg"

// Marker function for i18n static extraction
const t = (s) => s

export class TMDBPlugin extends BasePlugin {
  #lastRequestTime = 0

  constructor(config = {}) {
    super()
    const env = config.env || {}
    this.listId = env.VITE_TMDB_LIST_ID || config.listId
    this.devMode = config.devMode || false

    // Default to /api/tmdb for Vite dev proxy or custom endpoint
    this.apiBase = config.apiBase || "/api/tmdb"
  }

  get config() {
    return useSettingsStore.getState().pluginsConfig.tmdb || {}
  }

  get activeListId() {
    return this.config.listId || this.listId
  }

  // Clean list ID extracting numeric prefix from slugs like 8691537-liste-perso
  cleanListId(input) {
    if (!input) return null
    const str = String(input).trim()
    const match = str.match(/(\d+)/)
    return match ? match[1] : str
  }

  getProviderInfo() {
    return {
      name: "TMDB",
      url: "https://www.themoviedb.org",
      logo,
      multipleFormats: false,
    }
  }

  getSettingsSchema() {
    return [
      {
        key: "listId",
        label: t("TMDB List ID (e.g., 8691537 or 8691537-my-list)"),
        type: "text",
        requiresResync: true,
      },
    ]
  }

  validateSettings(onConfigError) {
    const id = this.cleanListId(this.activeListId)
    if (!id) {
      if (onConfigError) {
        onConfigError(
          t("TMDB List ID is missing or invalid."),
          "VITE_TMDB_LIST_ID",
        )
      }
      return false
    }
    return true
  }

  // Rate-limited HTTP request client with backoff on 429
  async #request(service, queryParams = "", retryCount = 0) {
    const effectiveLimit = this.getMaxRequestsPerMinute()
    const minDelayMs = Math.ceil(60000 / effectiveLimit)
    const now = Date.now()
    const elapsed = now - this.#lastRequestTime

    if (elapsed < minDelayMs) {
      await sleep(minDelayMs - elapsed)
    }
    this.#lastRequestTime = Date.now()

    let url = `${this.apiBase}/${service}`
    if (queryParams) {
      url += `?${queryParams}`
    }

    const options = {
      method: "GET",
      headers: {
        "content-type": "application/json;charset=utf-8",
      },
    }

    const res = await fetch(url, options)

    // Handle 429 Too Many Requests with automatic backoff
    if (res.status === 429 && retryCount < 3) {
      const retryAfterHeader = res.headers.get("retry-after")
      const delay = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : 2000 * (retryCount + 1)
      await sleep(delay)
      return this.#request(service, queryParams, retryCount + 1)
    }

    if (!res.ok) {
      throw new Error(`TMDB API Error (${res.status}): ${res.statusText}`)
    }

    const text = await res.text()
    return text ? JSON.parse(text) : null
  }

  // Fetch genres dictionary from TMDB
  async #fetchGenreMap(language = "fr-FR") {
    try {
      const data = await this.#request(
        "3/genre/movie/list",
        `language=${language}`,
      )
      const map = {}
      if (data && data.genres) {
        for (const g of data.genres) {
          map[g.id] = g.name
        }
      }
      return map
    } catch {
      return {}
    }
  }

  // Fetch list contents across v4 or v3
  async #fetchListItems(cleanId, language = "fr-FR") {
    const items = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      try {
        // Attempt TMDB v4 list first
        const v4Data = await this.#request(
          `4/list/${cleanId}`,
          `page=${page}&language=${language}`,
        )
        if (v4Data && Array.isArray(v4Data.results)) {
          items.push(...v4Data.results)
          totalPages = v4Data.total_pages || 1
          page++
          continue
        }
      } catch {
        // Fallback to TMDB v3 list
        const v3Data = await this.#request(
          `3/list/${cleanId}`,
          `page=${page}&language=${language}`,
        )
        if (v3Data && Array.isArray(v3Data.items)) {
          items.push(...v3Data.items)
          totalPages = v3Data.total_pages || 1
          page++
          continue
        }
        break
      }
    }

    return items
  }

  // Fetch movie credits, director, cast, runtime, overview
  async #fetchMovieDetails(movieId, language = "fr-FR") {
    try {
      const data = await this.#request(
        `3/movie/${movieId}`,
        `append_to_response=credits&language=${language}`,
      )
      if (!data) return null

      // Find director in crew
      const directorObj = data.credits?.crew?.find((c) => c.job === "Director")
      const director = directorObj ? directorObj.name : ""

      // Top 5 actors
      const cast = Array.isArray(data.credits?.cast)
        ? data.credits.cast.slice(0, 5).map((a) => a.name)
        : []

      return {
        director,
        cast,
        runtime: data.runtime || null,
        overview: data.overview || "",
        backdrop: data.backdrop_path,
      }
    } catch {
      return null
    }
  }

  async getCollection(onProgress, { forceRefresh = false } = {}) {
    const cleanId = this.cleanListId(this.activeListId)
    if (!cleanId) {
      throw new Error("No valid TMDB list ID configured.")
    }

    if (onProgress) onProgress(5)

    const genreMap = await this.#fetchGenreMap()
    if (onProgress) onProgress(10)

    const rawMovies = await this.#fetchListItems(cleanId)
    if (onProgress) onProgress(20)

    const total = rawMovies.length
    if (total === 0) {
      if (onProgress) onProgress(100)
      return {}
    }

    const collection = {}
    const progressStep = 80 / total
    let currentProgress = 20

    for (const movie of rawMovies) {
      if (!movie || !movie.id) continue

      const cacheKey = buildCacheKey("tmdb-movie", String(movie.id))
      let details = null

      if (!forceRefresh) {
        details = await getItem(cacheKey)
      }

      if (!details) {
        details = await this.#fetchMovieDetails(movie.id)
        if (details) {
          await setItem(cacheKey, details)
        }
      }

      const director = details?.director || ""
      const cast = details?.cast || []
      const runtime = details?.runtime || null
      const overview = details?.overview || movie.overview || ""
      const backdropPath = details?.backdrop || movie.backdrop_path

      // Resolve genres
      let categories = []
      if (Array.isArray(movie.genre_ids)) {
        categories = movie.genre_ids.map((id) => genreMap[id]).filter(Boolean)
      } else if (Array.isArray(movie.genres)) {
        categories = movie.genres.map((g) => g.name).filter(Boolean)
      }
      categories.sort()

      const year = movie.release_date
        ? parseInt(movie.release_date.slice(0, 4), 10)
        : null

      const coverUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null

      const backdropUrl = backdropPath
        ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
        : null

      const cleanTitle = movie.title || ""
      const castString = cast.join(" ")
      const searchIndex = `${director.replace(/\s/g, "-")}_${cleanTitle.replace(/\s/g, "-")}_${normalize(director)}_${normalize(cleanTitle)}_${normalize(castString)}`

      collection[movie.id] = {
        id: movie.id,
        title: cleanTitle,
        creator: director,
        year,
        cover: coverUrl,
        backdrop: backdropUrl,
        categories,
        rating: movie.vote_average ? Math.round(movie.vote_average / 2) : 0,
        format: "Film",
        runtime,
        overview,
        cast,
        searchIndex,
      }

      currentProgress += progressStep
      if (onProgress) onProgress(Math.min(99, Math.round(currentProgress)))
    }

    if (onProgress) onProgress(100)
    return collection
  }

  async getItemDetails(item) {
    if (item && item.overview && item.cast && item.cast.length > 0) {
      return item
    }

    const details = await this.#fetchMovieDetails(item.id)
    if (!details) return item

    return {
      ...item,
      creator: item.creator || details.director,
      cast: details.cast,
      runtime: details.runtime,
      overview: details.overview || item.overview,
      backdrop: details.backdrop
        ? `https://image.tmdb.org/t/p/w1280${details.backdrop}`
        : item.backdrop,
    }
  }

  async getItemImage(item) {
    return { cover: item?.cover || null }
  }

  // Translate remote TMDB image URLs to local proxy endpoint to bypass CORS
  getImageProxyUrl(url) {
    if (url && url.startsWith("https://image.tmdb.org/")) {
      return `/api/tmdb-image/${url.replace("https://image.tmdb.org/", "")}`
    }
    return url
  }

  getCategories(items = {}) {
    const set = new Set()
    for (const item of Object.values(items)) {
      if (Array.isArray(item.categories)) {
        for (const cat of item.categories) {
          if (cat) set.add(cat)
        }
      }
    }
    return Array.from(set).sort()
  }

  getCreators(items = {}) {
    const set = new Set()
    for (const item of Object.values(items)) {
      if (item.creator) set.add(item.creator)
      if (Array.isArray(item.cast)) {
        for (const person of item.cast) {
          if (person) set.add(person)
        }
      }
    }
    return Array.from(set).sort()
  }

  getMaxRequestsPerMinute() {
    return 1200
  }
}
