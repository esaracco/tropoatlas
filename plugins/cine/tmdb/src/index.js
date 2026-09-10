import sleep from "sleep-promise"
import {
  normalize,
  cleanText,
  BasePlugin,
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

  validateSettings(onConfigError) {
    const id = this.cleanListId(this.listId)
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

  // Extract a tagged value from a freeform comment string
  #extractTag(commentText, tag) {
    if (!commentText || !tag) return undefined
    const cleanTag = tag.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // Match "tag: value" bounded by newlines, delimiters or following tags
    const regex = new RegExp(
      `(?:^|[\\r\\n;,|])\\s*${cleanTag}:\\s*([^\\r\\n;|]+?)(?=\\s*[,;]?\\s*[\\w-]+:\\s*|[\\r\\n;|]|$)`,
      "i",
    )
    const match = commentText.match(regex)
    return match ? match[1].trim() : undefined
  }

  // Update, append, or remove a tagged value in a comment string
  #updateTag(commentText, tag, value) {
    if (!tag) return commentText
    const cleanTag = tag.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(
      `(?:^|[\\r\\n;,|])\\s*${cleanTag}:\\s*([^\\r\\n;|]+?)(?=\\s*[,;]?\\s*[\\w-]+:\\s*|[\\r\\n;|]|$)`,
      "i",
    )
    if (value === undefined || value === null || value === "") {
      return (commentText || "")
        .replace(regex, "")
        .replace(/^[\r\n;,|\s]+|[\r\n;,|\s]+$/g, "")
    }
    const tagFormatted = `${tag}: ${value}`
    if (regex.test(commentText || "")) {
      return (commentText || "").replace(regex, (match) => {
        const firstChar = match.charAt(0)
        const prefix = /[\r\n;,|]/.test(firstChar) ? firstChar + " " : ""
        return `${prefix}${tagFormatted}`
      })
    }
    const trimmed = (commentText || "").trim()
    if (!trimmed) return tagFormatted
    const separator = /[\r\n;,|]$/.test(trimmed) ? " " : ", "
    return `${trimmed}${separator}${tagFormatted}`
  }

  // Fetch list contents, returning items array and comments map
  async #fetchListItems(cleanId, language = "fr-FR") {
    const items = []
    const comments = {}
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      // Bust CDN cache with unique timestamp
      const nocache = Date.now()
      const data = await this.#request(
        `4/list/${cleanId}`,
        `page=${page}&language=${language}&nocache=${nocache}`,
      )
      if (data && Array.isArray(data.results)) {
        items.push(...data.results)
        // Merge comments from each page into a single map
        if (data.comments && typeof data.comments === "object") {
          Object.assign(comments, data.comments)
        }
        totalPages = data.total_pages || 1
        page++
      } else {
        break
      }
    }

    return { items, comments }
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
    const cleanId = this.cleanListId(this.listId)
    if (!cleanId) {
      throw new Error("No valid TMDB list ID configured.")
    }

    if (onProgress) onProgress(5)

    const genreMap = await this.#fetchGenreMap()
    if (onProgress) onProgress(10)

    const { items: rawMovies, comments } = await this.#fetchListItems(cleanId)
    if (onProgress) onProgress(20)

    const total = rawMovies.length
    if (total === 0) {
      if (onProgress) onProgress(100)
      return {}
    }

    const collection = {}
    const progressStep = 80 / total
    let currentProgress = 20

    for (let i = 0; i < rawMovies.length; i++) {
      const movie = rawMovies[i]
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

      const hasValidCover = !this.devMode && movie.poster_path
      const coverUrl = hasValidCover
        ? `/api/tmdb-image/t/p/w342${movie.poster_path}`
        : null

      const hasValidBackdrop = !this.devMode && backdropPath
      const backdropUrl = hasValidBackdrop
        ? `/api/tmdb-image/t/p/w1280${backdropPath}`
        : null

      const cleanTitle = cleanText(movie.title || "")
      const cleanDirector = cleanText(director)
      const castString = cast.join(" ")
      const searchIndex = `${cleanDirector.replace(/\s/g, "-")}_${cleanTitle.replace(/\s/g, "-")}_${normalize(cleanDirector)}_${normalize(cleanTitle)}_${normalize(castString)}`

      // Extract custom fields from the TMDB comment (format: "place: 5, note: 4")
      const mediaType = movie.media_type || "movie"
      const commentKey = `${mediaType}:${movie.id}`
      const commentText = comments[commentKey] || ""

      const placeVal = this.#extractTag(commentText, "place")
      const placeMatch = placeVal?.match(/(\d+)/)
      const place = placeMatch ? placeMatch[1] : undefined

      const price = this.#extractTag(commentText, "price")

      const noteVal = this.#extractTag(commentText, "note")
      const noteMatch = noteVal?.match(/(\d+)/)
      // User personal rating (1-5 stars) from comment tag, 0 if unrated
      const rating = noteMatch
        ? Math.min(5, Math.max(0, parseInt(noteMatch[1], 10)))
        : 0

      // TMDB community score (0-10)
      const voteAverage =
        typeof movie.vote_average === "number" && movie.vote_average > 0
          ? Math.round(movie.vote_average * 10) / 10
          : undefined

      collection[movie.id] = {
        id: movie.id,
        title: cleanTitle,
        creator: cleanDirector,
        year,
        cover: coverUrl,
        backdrop: backdropUrl,
        categories,
        rating,
        vote_average: voteAverage,
        format: "Film",
        runtime,
        overview,
        cast,
        searchIndex,
        added: i,
        // Custom fields from TMDB comment
        place,
        price,
        comment: commentText || undefined,
      }

      currentProgress += progressStep
      if (onProgress) onProgress(Math.min(99, Math.round(currentProgress)))
    }

    if (onProgress) onProgress(100)
    return collection
  }

  // Detailed movie info is already fully populated during getCollection
  async getItemDetails(item) {
    return item
  }

  async getItemImage(item) {
    if (this.devMode || !item?.id) return null
    try {
      const data = await this.#request(`3/movie/${item.id}`)
      if (data && data.poster_path) {
        return { cover: `/api/tmdb-image/t/p/w342${data.poster_path}` }
      }
    } catch {
      return null
    }
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

  getDefaultSort() {
    return "added_desc"
  }

  getPreservedKeys() {
    return ["syncedListId", "customFieldsInfo"]
  }

  async getCustomFieldsInfo() {
    return {
      supportsPlace: true,
      supportsPrice: true,
      supportsRating: true,
      // Categories are not editable via TMDB comment in this version
      supportsCategories: false,
    }
  }

  // Write custom fields back to TMDB by updating the item comment
  async updateItem(item, changes) {
    const cleanId = this.cleanListId(this.listId)
    if (!cleanId) {
      throw new Error("No valid TMDB list ID configured.")
    }

    const { rating, place, price } = changes
    let commentText = item.comment || ""

    if (place !== undefined) {
      commentText = this.#updateTag(commentText, "place", place)
    }
    if (price !== undefined) {
      commentText = this.#updateTag(commentText, "price", price)
    }
    if (rating !== undefined) {
      commentText = this.#updateTag(
        commentText,
        "note",
        rating > 0 ? rating : "",
      )
    }

    const mediaType = item.media_type || "movie"
    const url = `${this.apiBase}/4/list/${cleanId}/items`
    const res = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/json;charset=utf-8" },
      body: JSON.stringify({
        items: [
          { media_type: mediaType, media_id: item.id, comment: commentText },
        ],
      }),
    })

    if (!res.ok) {
      throw new Error(
        t("TMDB API error ({{status}}): could not save item.", {
          status: res.status,
        }),
      )
    }

    // Return the updated item fields so the store can be patched locally
    return { comment: commentText || undefined, place, price, rating }
  }
}
