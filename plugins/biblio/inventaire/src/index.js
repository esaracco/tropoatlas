import sleep from "sleep-promise"
import { normalize, cleanText, BasePlugin } from "@tropo/core"
import logo from "./assets/logo.svg"

// Minimum length for a description to be considered complete.
// Shorter descriptions (e.g. Wikidata one-line labels) are enriched with
// Wikipedia or Open Library summaries.
export const MIN_DESCRIPTION_LENGTH = 200

// Marker function for i18n static extraction
const t = (s) => s

// Capitalize the first letter of a genre or category
const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str

// Retain only Wikipedia sitelinks for active, fallback, or original languages
const filterSitelinks = (sitelinks, originalLang) => {
  if (!sitelinks) return null
  const keepKeys = new Set(["frwiki", "enwiki"])
  if (originalLang) {
    const origCode = originalLang.split(/[-_]/)[0].toLowerCase()
    keepKeys.add(`${origCode}wiki`)
  }
  const filtered = {}
  for (const key of keepKeys) {
    if (sitelinks[key]?.title) {
      filtered[key] = { title: sitelinks[key].title }
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : null
}

// Roles typically associated with biographical Wikipedia articles
const PERSON_ROLES =
  /\b(philosophe|écrivain|auteur|professeur|universitaire|chercheur|scientifique|historien|sociologue|journaliste|poète|personnalité|militant|critique|traducteur|éditeur|dramaturge|scénariste|réalisateur|artiste|peintre|compositeur|mathématicien|économiste|avocat|psychiatre|psychanalyste|philosopher|writer|author|professor|academic|researcher|scientist|historian|sociologist|journalist|poet|politician|activist|critic|translator|editor|playwright|director|artist|painter|composer|mathematician|economist|lawyer|psychiatrist|psychoanalyst)\b/i

// Keywords identifying a creative work (book, novel, essay, etc.)
const WORK_TERMS =
  /\b(livre|essai|roman|ouvrage|traité|recueil|manuel|dialogue|poème|film|album|book|novel|essay|treatise|collection|play|text|publication)\b/i

// Detect if a Wikipedia summary represents a human biography
export const isBiography = (data) => {
  if (!data) return false
  const desc = data.description || ""
  if (WORK_TERMS.test(desc)) return false
  if (PERSON_ROLES.test(desc)) return true

  const firstSentence = (data.extract || "").split(".")[0] || ""
  if (WORK_TERMS.test(firstSentence)) return false

  return (
    PERSON_ROLES.test(firstSentence) &&
    /\b(est|était|fut|is|was)\b/i.test(firstSentence)
  )
}

// Check whether a Wikipedia article title corresponds to the book title
export const isTitleMatch = (articleTitle, bookTitle, subtitle) => {
  if (!articleTitle || !bookTitle) return false
  const cleanWikiTitle = articleTitle.replace(/\s*\([^)]*\)\s*$/, "").trim()
  const normWiki = normalize(cleanWikiTitle)
  const normBook = normalize(bookTitle)

  if (normWiki === normBook) return true

  // Match if article title matches subtitle or full title
  if (subtitle) {
    const normSub = normalize(subtitle)
    if (normWiki === normSub) return true
    const normFull = normalize(`${bookTitle} ${subtitle}`)
    if (normWiki === normFull) return true
  }

  // Match if one starts with the other followed by a separator
  // (e.g. "Pourparlers 1972-1990" vs "Pourparlers")
  if (
    normBook.startsWith(`${normWiki}_`) ||
    normWiki.startsWith(`${normBook}_`)
  ) {
    return true
  }

  return false
}

export class InventairePlugin extends BasePlugin {
  #lastRequestTime = 0
  #lastOpenLibraryRequestTime = 0
  #lastWikipediaRequestTime = 0
  #isLoggedIn = false
  #loginPromise = null
  #lastAuthUser = null
  #lastAuthPassword = null
  #loginRateLimited = false

  constructor(config = {}) {
    super()
    const env = config.env || {}
    this.user = env.VITE_INVENTAIRE_USER || config.user
    this.password = env.VITE_INVENTAIRE_PASSWORD || config.password
    this.fieldPlace =
      env.VITE_INVENTAIRE_FIELD_PLACE || config.fieldPlace || "place"
    this.fieldPrice =
      env.VITE_INVENTAIRE_FIELD_PRICE || config.fieldPrice || "price"
    this.fieldCategories =
      env.VITE_INVENTAIRE_FIELD_GENRES || config.fieldCategories || "genre"
    this.fieldRating =
      env.VITE_INVENTAIRE_FIELD_RATING || config.fieldRating || "rating"
    this.devMode = config.devMode || false
    this.minDescriptionLength =
      config.minDescriptionLength || MIN_DESCRIPTION_LENGTH

    // Default to /api/inventaire for Vite dev proxy
    this.apiBase = config.apiBase || "/api/inventaire"
  }

  get activeUser() {
    return this.user
  }

  get activePassword() {
    return this.password
  }

  get activeFieldPlace() {
    return this.fieldPlace || "place"
  }

  get activeFieldPrice() {
    return this.fieldPrice || "price"
  }

  get activeFieldCategories() {
    return this.fieldCategories || "genre"
  }

  get activeFieldRating() {
    return this.fieldRating || "rating"
  }

  getCurrentConfig() {
    return {
      fieldPlace: this.activeFieldPlace,
      fieldPrice: this.activeFieldPrice,
      fieldCategories: this.activeFieldCategories,
      fieldRating: this.activeFieldRating,
    }
  }

  getProviderInfo() {
    return {
      name: "Inventaire",
      url: "https://inventaire.io",
      logo,
      multipleFormats: false,
    }
  }

  getPreservedKeys() {
    return ["syncedInventory", "customFieldsInfo"]
  }

  getDraftCapabilities(config = {}) {
    return {
      supportsPlace: !!(config.fieldPlace || this.activeFieldPlace),
      supportsPrice: !!(config.fieldPrice || this.activeFieldPrice),
      supportsRating: !!(config.fieldRating || this.activeFieldRating),
      supportsCategories: true,
    }
  }

  async getCustomFieldsInfo() {
    return {
      supportsPlace: !!this.activeFieldPlace,
      supportsPrice: !!this.activeFieldPrice,
      supportsRating: !!this.activeFieldRating,
      supportsCategories: true,
    }
  }

  validateSettings(onConfigError) {
    if (!this.activeUser) {
      if (onConfigError) {
        onConfigError(
          t("Inventaire username or email is required."),
          "VITE_INVENTAIRE_USER",
        )
      }
      return false
    }
    if (!this.activePassword) {
      if (onConfigError) {
        onConfigError(
          t("Inventaire password is required to access private notes."),
          "VITE_INVENTAIRE_PASSWORD",
        )
      }
      return false
    }
    return true
  }

  // Rate-limited HTTP client respecting server pacing
  async #request(service, options = {}) {
    const effectiveLimit = this.getMaxRequestsPerMinute()
    const minDelayMs = Math.ceil(60000 / effectiveLimit)
    const now = Date.now()
    const elapsed = now - this.#lastRequestTime

    if (elapsed < minDelayMs) {
      await sleep(minDelayMs - elapsed)
    }
    this.#lastRequestTime = Date.now()

    const url = `${this.apiBase}/${service}`
    const fetchOptions = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      credentials: "include",
    }

    const response = await fetch(url, fetchOptions)
    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(`Inventaire API error (${response.status}): ${errorText}`)
    }
    return response.json()
  }

  // Verify whether an active session cookie already exists on Inventaire
  async #checkSession() {
    try {
      const res = await this.#request("api/user")
      if (res?.user?.username === this.activeUser) {
        this.#isLoggedIn = true
        return true
      }
    } catch {
      // 401: no active session
    }
    return false
  }

  // Authenticate user to obtain active session
  async #login(force = false) {
    const user = this.activeUser
    const pass = this.activePassword
    if (!user || !pass) return false

    // Invalidate session if credentials changed
    if (
      this.#lastAuthUser &&
      (user !== this.#lastAuthUser || pass !== this.#lastAuthPassword)
    ) {
      this.#isLoggedIn = false
      this.#loginPromise = null
      this.#loginRateLimited = false
      if (typeof sessionStorage !== "undefined") {
        try {
          sessionStorage.removeItem("inventaire_session_user")
        } catch {
          // Non-critical
        }
      }
    }

    // Check if session is already active in current browser tab
    const hasActiveSession =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("inventaire_session_user") === user

    // Skip login request if already authenticated in this session
    if ((this.#isLoggedIn || hasActiveSession) && !force) {
      this.#isLoggedIn = true
      return true
    }

    // Reuse concurrent in-flight login request
    if (this.#loginPromise) {
      return this.#loginPromise
    }

    this.#lastAuthUser = user
    this.#lastAuthPassword = pass

    this.#loginPromise = (async () => {
      try {
        // Check if existing session cookie is already valid on server
        if (!force && (await this.#checkSession())) {
          this.#isLoggedIn = true
          this.#loginRateLimited = false
          if (typeof sessionStorage !== "undefined") {
            try {
              sessionStorage.setItem("inventaire_session_user", user)
            } catch {
              // Non-critical
            }
          }
          return true
        }

        // If rate-limited on login, avoid hammering the endpoint
        if (this.#loginRateLimited && !force) {
          throw new Error(
            t(
              "Too many login attempts on {{provider}}. Please wait a few minutes before retrying.",
            ),
          )
        }

        await this.#request("api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            username: user,
            password: pass,
          }),
        })
        this.#isLoggedIn = true
        this.#loginRateLimited = false
        if (typeof sessionStorage !== "undefined") {
          try {
            sessionStorage.setItem("inventaire_session_user", user)
          } catch {
            // Non-critical if storage is disabled
          }
        }
        return true
      } catch (err) {
        console.warn("Inventaire login failed:", err.message || err)
        const errMsg = err.message || ""

        // Handle duplicated concurrent request by verifying session state
        if (errMsg.includes("duplicated request")) {
          const valid = await this.#checkSession()
          if (valid) {
            this.#isLoggedIn = true
            this.#loginRateLimited = false
            if (typeof sessionStorage !== "undefined") {
              try {
                sessionStorage.setItem("inventaire_session_user", user)
              } catch {
                // Non-critical
              }
            }
            return true
          }
        }

        if (errMsg.includes("429") && !errMsg.includes("duplicated request")) {
          this.#loginRateLimited = true
          throw new Error(
            t(
              "Too many login attempts on {{provider}}. Please wait a few minutes before retrying.",
            ),
          )
        }
        this.#isLoggedIn = false
        if (typeof sessionStorage !== "undefined") {
          try {
            sessionStorage.removeItem("inventaire_session_user")
          } catch {
            // Non-critical
          }
        }
        return false
      } finally {
        this.#loginPromise = null
      }
    })()

    return this.#loginPromise
  }

  // Resolve normalized 2-letter active application language (e.g., 'fr', 'en')
  #getActiveLanguage() {
    let rawLang = null
    if (typeof localStorage !== "undefined") {
      try {
        rawLang = localStorage.getItem("i18nextLng")
      } catch {
        // Fallback if storage access is restricted
      }
    }
    if (!rawLang && typeof document !== "undefined") {
      rawLang = document.documentElement?.lang
    }
    if (!rawLang && typeof navigator !== "undefined") {
      rawLang = navigator.language
    }
    if (rawLang) {
      const code = rawLang.split(/[-_]/)[0].toLowerCase()
      if (code) return code
    }
    return "fr"
  }

  // Extract a tagged value from private freeform notes
  #extractTag(noteText, tag) {
    if (!noteText || !tag) return undefined
    const cleanTag = tag.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // Match "tag: value" bounded by newlines, delimiters or following tags
    const regex = new RegExp(
      `(?:^|[\\r\\n;,|])\\s*${cleanTag}:\\s*([^\\r\\n;|]+?)(?=\\s*[,;]?\\s*[\\w-]+:\\s*|[\\r\\n;|]|$)`,
      "i",
    )
    const match = noteText.match(regex)
    return match ? match[1].trim() : undefined
  }

  // Update, append, or remove a tagged value from private note text
  #updateTag(noteText, tag, value) {
    if (!tag) return noteText
    const cleanTag = tag.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(
      `(?:^|[\\r\\n;,|])\\s*${cleanTag}:\\s*([^\\r\\n;|]+?)(?=\\s*[,;]?\\s*[\\w-]+:\\s*|[\\r\\n;|]|$)`,
      "i",
    )
    if (value === undefined || value === null || value === "") {
      return (noteText || "")
        .replace(regex, "")
        .replace(/^[\r\n;,|\s]+|[\r\n;,|\s]+$/g, "")
    }
    const tagFormatted = `${tag}: ${value}`
    if (regex.test(noteText || "")) {
      return (noteText || "").replace(regex, (match) => {
        const firstChar = match.charAt(0)
        const prefix = /[\r\n;,|]/.test(firstChar) ? firstChar + " " : ""
        return `${prefix}${tagFormatted}`
      })
    }
    const trimmed = (noteText || "").trim()
    if (!trimmed) return tagFormatted
    const separator = /[\r\n;,|]$/.test(trimmed) ? " " : ", "
    return `${trimmed}${separator}${tagFormatted}`
  }

  // Fetch full inventory collection
  async getCollection(
    onProgress,
    { forceRefresh = false, existingItems = {} } = {},
  ) {
    if (onProgress) onProgress(5)

    // Authenticate session to access private item notes; abort if auth fails
    if (this.activePassword) {
      const loggedIn = await this.#login()
      if (!loggedIn) {
        throw new Error(
          t(
            "Authentication failed on {{provider}}. Please check your username and password.",
          ),
        )
      }
    }
    if (onProgress) onProgress(15)

    // 1. Resolve user ID from username
    const usersRes = await this.#request(
      `api/users/by-usernames?usernames=${encodeURIComponent(this.activeUser)}`,
    )
    const usersMap = usersRes?.users || {}
    const userObj =
      usersMap[this.activeUser] ||
      usersMap[this.activeUser.toLowerCase()] ||
      Object.values(usersMap)[0]
    const userId = userObj?._id || userObj?.id
    if (!userId) {
      throw new Error(`User not found on Inventaire: ${this.activeUser}`)
    }

    if (onProgress) onProgress(25)

    // 2. Fetch inventory items belonging to user
    const itemsRes = await this.#request(
      `api/items/by-users?users=${userId}&limit=1000`,
    )
    const rawItems = itemsRes?.items || []

    if (rawItems.length === 0) {
      if (onProgress) onProgress(100)
      return {}
    }

    if (onProgress) onProgress(35)

    const collection = {}
    let itemsToProcess = rawItems

    // In differential sync mode, identify which items are new vs already cached
    if (
      !forceRefresh &&
      existingItems &&
      Object.keys(existingItems).length > 0
    ) {
      const currentRemoteIds = new Set(
        rawItems.map((it) => it._id || it.id).filter(Boolean),
      )

      // Keep existing items that are still present remotely
      for (const [id, item] of Object.entries(existingItems)) {
        if (currentRemoteIds.has(id)) {
          collection[id] = item
        }
      }

      // Filter rawItems to only those not yet in existingItems
      itemsToProcess = rawItems.filter((it) => !existingItems[it._id || it.id])
    }

    // If no new items need resolution, return collection immediately
    if (itemsToProcess.length === 0) {
      if (onProgress) onProgress(100)
      return collection
    }

    // 3. Fetch user shelves for custom category mapping of new items
    const shelfMap = {}
    try {
      const shelvesRes = await this.#request(
        `api/shelves/by-owners?owners=${userId}`,
      )
      const shelvesMap = shelvesRes?.shelves || {}
      const shelvesList = Array.isArray(shelvesMap)
        ? shelvesMap
        : Object.values(shelvesMap)
      for (const shelf of shelvesList) {
        if (shelf._id && shelf.name) {
          shelfMap[shelf._id] = shelf.name
        }
      }
    } catch {
      // Non-critical: continue if shelves cannot be fetched
    }

    if (onProgress) onProgress(50)

    // 4. Batch resolve entity metadata (works, editions, authors, publishers)
    const entityUris = Array.from(
      new Set(itemsToProcess.map((it) => it.entity).filter(Boolean)),
    )

    const entitiesMap = {}
    const redirectsMap = {}
    // Batch size is 20 because the backend Express/qs query parser uses
    // arrayLimit: 20 by default; batches > 20 are parsed as objects and fail.
    const batchSize = 20
    for (let i = 0; i < entityUris.length; i += batchSize) {
      const batch = entityUris.slice(i, i + batchSize)
      const queryParams = batch
        .map((u) => `uris=${encodeURIComponent(u)}`)
        .join("&")
      try {
        // Relatives: wdt:P50 (author), wdt:P629 (work), wdt:P123 (publisher),
        // wdt:P655 (translator)
        const res = await this.#request(
          `api/entities/by-uris?${queryParams}&relatives=wdt:P50&relatives=wdt:P629&relatives=wdt:P123&relatives=wdt:P655`,
        )
        if (res?.entities) {
          Object.assign(entitiesMap, res.entities)
        }
        if (res?.redirects) {
          Object.assign(redirectsMap, res.redirects)
        }
      } catch (err) {
        console.warn("Inventaire entities batch error:", err)
      }

      if (onProgress) {
        const progressPct =
          50 + Math.round(((i + batch.length) / entityUris.length) * 30)
        onProgress(Math.min(80, progressPct))
      }
    }

    // Map redirected URIs to resolved entities in entitiesMap
    for (const [fromUri, toUri] of Object.entries(redirectsMap)) {
      if (entitiesMap[toUri] && !entitiesMap[fromUri]) {
        entitiesMap[fromUri] = entitiesMap[toUri]
      }
    }

    // Resolve any genre URIs from work entities (wdt:P136)
    const categoryUris = new Set()
    for (const entity of Object.values(entitiesMap)) {
      const gUris = entity.claims?.["wdt:P136"] || []
      for (const gUri of gUris) {
        if (gUri && !entitiesMap[gUri]) {
          categoryUris.add(gUri)
        }
      }
    }

    if (categoryUris.size > 0) {
      const gList = Array.from(categoryUris)
      for (let i = 0; i < gList.length; i += batchSize) {
        const batch = gList.slice(i, i + batchSize)
        const queryParams = batch
          .map((u) => `uris=${encodeURIComponent(u)}`)
          .join("&")
        try {
          const res = await this.#request(`api/entities/by-uris?${queryParams}`)
          if (res?.entities) {
            Object.assign(entitiesMap, res.entities)
          }
        } catch (err) {
          console.warn("Inventaire genre batch error:", err)
        }
      }
    }

    if (onProgress) onProgress(85)

    // 5. Normalize items into canonical TropoAtlas book format
    for (const item of itemsToProcess) {
      const itemId = item._id || item.id
      const resolvedUri = redirectsMap[item.entity] || item.entity
      const entity = entitiesMap[resolvedUri] || entitiesMap[item.entity] || {}
      const rawWorkUri = entity.claims?.["wdt:P629"]?.[0]
      const workUri = rawWorkUri ? redirectsMap[rawWorkUri] || rawWorkUri : null
      const workEntity = workUri ? entitiesMap[workUri] : null

      // Resolve localized properties prioritizing active application language
      const activeLang = this.#getActiveLanguage()
      const fallbackLang = activeLang === "fr" ? "en" : "fr"

      // Resolve book title
      const rawTitle =
        item.snapshot?.["entity:title"] ||
        entity.labels?.[activeLang] ||
        workEntity?.labels?.[activeLang] ||
        entity.labels?.[fallbackLang] ||
        workEntity?.labels?.[fallbackLang] ||
        entity.labels?.mul ||
        workEntity?.labels?.mul ||
        entity.claims?.["wdt:P1476"]?.[0] ||
        workEntity?.claims?.["wdt:P1476"]?.[0] ||
        Object.values(entity.labels || {})[0] ||
        Object.values(workEntity?.labels || {})[0] ||
        t("Untitled Book")
      const title = cleanText(rawTitle)

      // Resolve subtitle (wdt:P1680)
      const rawSubtitle =
        entity.claims?.["wdt:P1680"]?.[0] ||
        workEntity?.claims?.["wdt:P1680"]?.[0] ||
        null
      const subtitle = rawSubtitle ? cleanText(rawSubtitle) : null

      // Collect known translator names (wdt:P655) to filter out of authors
      const translatorUris = [
        ...(entity.claims?.["wdt:P655"] || []),
        ...(workEntity?.claims?.["wdt:P655"] || []),
      ]
      const translatorNames = new Set()
      for (const tUri of translatorUris) {
        const tEntity = entitiesMap[tUri]
        if (tEntity?.labels) {
          for (const label of Object.values(tEntity.labels)) {
            if (typeof label === "string" && label.trim()) {
              translatorNames.add(label.trim().toLowerCase())
            }
          }
        }
        if (tEntity?.aliases) {
          for (const aliasList of Object.values(tEntity.aliases)) {
            if (Array.isArray(aliasList)) {
              for (const alias of aliasList) {
                if (typeof alias === "string" && alias.trim()) {
                  translatorNames.add(alias.trim().toLowerCase())
                }
              }
            }
          }
        }
      }

      // Filter out known translator names from candidate author list
      const filterTranslators = (nameList) => {
        const filtered = nameList.filter(
          (name) => !translatorNames.has(name.trim().toLowerCase()),
        )
        return filtered.length > 0 ? filtered : nameList
      }

      // Resolve author/creator: prioritize work/edition claims (wdt:P50),
      // falling back to snapshot with translator exclusion
      const rawAuthorUris =
        workEntity?.claims?.["wdt:P50"] || entity.claims?.["wdt:P50"] || []
      const authorUris = Array.isArray(rawAuthorUris)
        ? rawAuthorUris
        : [rawAuthorUris]

      const resolvedAuthors = authorUris
        .map((uri) => {
          const authorEntity = entitiesMap[uri]
          if (!authorEntity?.labels) return null
          return (
            authorEntity.labels[activeLang] ||
            authorEntity.labels[fallbackLang] ||
            authorEntity.labels.mul ||
            Object.values(authorEntity.labels)[0] ||
            null
          )
        })
        .filter(Boolean)

      let authors = []
      if (resolvedAuthors.length > 0) {
        authors = filterTranslators(resolvedAuthors)
          .map(cleanText)
          .filter(Boolean)
      } else if (item.snapshot?.["entity:authors"]) {
        const snapshotList = item.snapshot["entity:authors"]
          .split(/[,;]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        authors = filterTranslators(snapshotList).map(cleanText).filter(Boolean)
      }
      if (authors.length === 0) {
        authors = [cleanText(t("Unknown Author"))]
      }
      authors = Array.from(new Set(authors))
      const creator = authors.join(", ")

      // Extract raw private note string from item
      const noteText =
        item.notes || item.details || item.comment || item.description || ""

      // Extract custom tags from private notes
      const placeVal = this.#extractTag(noteText, this.activeFieldPlace)
      const priceVal = this.#extractTag(noteText, this.activeFieldPrice)
      const categoryVal = this.#extractTag(noteText, this.activeFieldCategories)
      const ratingVal = this.#extractTag(noteText, this.activeFieldRating)

      // Only assign numeric place for LED alignment
      const placeMatch = placeVal?.match(/(\d+)/)
      const place = placeMatch ? placeMatch[1] : undefined

      // Parse rating (1-5 stars)
      const ratingMatch = ratingVal?.match(/(\d+)/)
      const rating = ratingMatch
        ? Math.min(5, Math.max(0, parseInt(ratingMatch[1], 10)))
        : item.rating || 0

      // Categories resolution:
      // If user defined a genre tag in private notes, use ONLY user genres.
      // Otherwise, fall back to Inventaire.io shelves and Wikidata work genres.
      const itemCategories = new Set()

      if (categoryVal) {
        // User-defined genre(s) take absolute priority: split if multiple
        const userCategories = categoryVal
          .split(/\s*[,/]\s*/)
          .map((g) => g.trim())
          .filter(Boolean)
        for (const ug of userCategories) {
          itemCategories.add(capitalize(ug))
        }
      } else {
        // Fallback A: Shelves from Inventaire
        if (Array.isArray(item.shelves)) {
          for (const sId of item.shelves) {
            if (shelfMap[sId]) itemCategories.add(capitalize(shelfMap[sId]))
          }
        }

        // Fallback B: Work genres from Wikidata entity
        const gUris = workEntity?.claims?.["wdt:P136"] || []
        for (const gUri of gUris) {
          const gEntity = entitiesMap[gUri]
          const gLabel =
            gEntity?.labels?.fr ||
            gEntity?.labels?.en ||
            gEntity?.labels?.mul ||
            Object.values(gEntity?.labels || {})[0]
          if (gLabel) itemCategories.add(capitalize(gLabel))
        }
      }

      // Default fallback if no categories found
      if (itemCategories.size === 0) {
        itemCategories.add(t("Uncategorized"))
      }

      // Extract cover image URL
      let cover = null
      if (!this.devMode) {
        const imgHash =
          entity.claims?.["invp:P2"]?.[0] ||
          workEntity?.claims?.["invp:P2"]?.[0] ||
          null
        const rawCover =
          entity.image?.url ||
          workEntity?.image?.url ||
          (typeof entity.image === "string" ? entity.image : null) ||
          (typeof workEntity?.image === "string" ? workEntity.image : null) ||
          (imgHash ? `/img/entities/${imgHash}` : null) ||
          item.snapshot?.["entity:image"] ||
          null

        if (rawCover) {
          cover = this.#formatCoverUrl(rawCover)
        }
      }

      // Extract publication year
      let year = null
      const dateVal =
        entity.claims?.["wdt:P577"]?.[0] ||
        workEntity?.claims?.["wdt:P577"]?.[0] ||
        null
      if (dateVal) {
        const match = String(dateVal).match(/(\d{4})/)
        if (match) year = match[1]
      }

      // Extract ISBN
      const isbn =
        item.snapshot?.["entity:isbn13"] ||
        item.snapshot?.["entity:isbn10"] ||
        entity.claims?.["wdt:P212"]?.[0] ||
        entity.claims?.["wdt:P957"]?.[0] ||
        (item.entity?.startsWith("isbn:") ? item.entity.slice(5) : null)

      // Extract publisher
      let publisher = null
      const pubUris = entity.claims?.["wdt:P123"] || []
      const pubUri = Array.isArray(pubUris) ? pubUris[0] : pubUris
      if (pubUri) {
        const pubEntity = entitiesMap[pubUri]
        publisher =
          pubEntity?.labels?.[activeLang] ||
          pubEntity?.labels?.[fallbackLang] ||
          pubEntity?.labels?.mul ||
          Object.values(pubEntity?.labels || {})[0] ||
          null
      }

      // Build search index across all resolved authors, title, and subtitle
      const authorsIndex = authors
        .map((a) => `${a.replace(/\s/g, "-")}_${normalize(a)}`)
        .join("_")
      const subtitleIndex = subtitle
        ? `_${subtitle.replace(/\s/g, "-")}_${normalize(subtitle)}`
        : ""
      const searchIndex =
        `${authorsIndex}_${title.replace(/\s/g, "-")}_${normalize(title)}` +
        subtitleIndex

      // Resolve description prioritizing active language, fallback, or original
      const origLang = (workEntity?.originalLang || entity.originalLang || "")
        .split(/[-_]/)[0]
        .toLowerCase()

      const description =
        workEntity?.descriptions?.[activeLang] ||
        entity.descriptions?.[activeLang] ||
        workEntity?.descriptions?.[fallbackLang] ||
        entity.descriptions?.[fallbackLang] ||
        (origLang ? workEntity?.descriptions?.[origLang] : null) ||
        (origLang ? entity.descriptions?.[origLang] : null) ||
        workEntity?.descriptions?.fromclaims ||
        entity.descriptions?.fromclaims ||
        Object.values(workEntity?.descriptions || {})[0] ||
        Object.values(entity.descriptions || {})[0] ||
        null

      // Extract OpenLibrary ID if present in claims (wdt:P648)
      const openLibraryId =
        entity.claims?.["wdt:P648"]?.[0] ||
        workEntity?.claims?.["wdt:P648"]?.[0] ||
        null

      collection[itemId] = {
        id: itemId,
        entity: item.entity,
        entityUri: item.entity,
        title,
        subtitle,
        creator,
        creators: authors,
        categories: Array.from(itemCategories),
        place,
        price: priceVal,
        rating,
        cover,
        year,
        isbn,
        searchIndex,
        notes: noteText,
        pageCount: entity.claims?.["wdt:P1104"]?.[0] || null,
        publisher,
        sitelinks: filterSitelinks(
          workEntity?.sitelinks || entity.sitelinks,
          workEntity?.originalLang || entity.originalLang,
        ),
        originalLang: workEntity?.originalLang || entity.originalLang || null,
        openLibraryId,
        hasDetails: false,
        description,
        added: item.created ? new Date(item.created).getTime() || 0 : 0,
      }
    }

    if (onProgress) onProgress(100)
    return collection
  }

  // Fetch Wikipedia API with pacing and User-Agent headers
  async #fetchWiki(url) {
    const minDelayMs = 300
    const now = Date.now()
    const elapsed = now - this.#lastWikipediaRequestTime
    if (elapsed < minDelayMs) {
      await sleep(minDelayMs - elapsed)
    }
    this.#lastWikipediaRequestTime = Date.now()

    const headers = {
      Accept: "application/json",
    }
    // Only send Api-User-Agent in Node to prevent CORS preflight rejection
    // by Wikimedia in browser environments
    if (typeof window === "undefined") {
      headers["Api-User-Agent"] =
        "TropoBiblio/1.0.0 (https://tropobiblio.esaracco.fr; contact@esaracco.fr)"
    }

    try {
      const res = await fetch(url, { headers })
      if (res.status === 429) {
        // Back off gracefully on rate limit
        await sleep(1500)
        return null
      }
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  // Fetch full lead section introduction from MediaWiki API
  async #fetchWikiLeadSection(targetLang, articleTitle) {
    const cleanTitle = encodeURIComponent(articleTitle.replace(/\s/g, "_"))
    const url = `https://${targetLang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&redirects=true&titles=${cleanTitle}&format=json&origin=*`
    const data = await this.#fetchWiki(url)
    const pages = data?.query?.pages
    if (!pages) return null
    const page = Object.values(pages)[0]
    return page?.extract?.trim() || null
  }

  // Fetch and validate summary for a specific Wikipedia page title
  async #fetchWikiSummaryByTitle(
    targetLang,
    articleTitle,
    authorName,
    isExactSitelink = false,
    bookTitle = null,
    subtitle = null,
  ) {
    if (!targetLang || !articleTitle) return null

    const cleanTitle = encodeURIComponent(articleTitle.replace(/\s/g, "_"))
    const wikiUrl = `https://${targetLang}.wikipedia.org/api/rest_v1/page/summary/${cleanTitle}?origin=*`
    const data = await this.#fetchWiki(wikiUrl)
    if (!data || !data.extract) return null

    // Ignore disambiguation pages
    if (data.type === "disambiguation") return null

    // If author validation is requested, check relevance and reject biographies
    if (authorName) {
      if (isBiography(data)) return null

      const normalizedAuthor = normalize(authorName)
      const normalizedTitle = normalize(articleTitle)
      const normalizedExtract = normalize(data.extract)

      // Reject if article title is only the author's name
      if (normalizedTitle === normalizedAuthor) return null

      // Ensure author is mentioned in title or extract
      const titleMentionsAuthor = normalizedTitle.includes(normalizedAuthor)
      const extractMentionsAuthor = normalizedExtract.includes(normalizedAuthor)
      if (!titleMentionsAuthor && !extractMentionsAuthor) return null
    }

    const exact =
      isExactSitelink || isTitleMatch(articleTitle, bookTitle, subtitle)

    let extract = data.extract
    if (exact) {
      const fullIntro = await this.#fetchWikiLeadSection(
        targetLang,
        data.title || articleTitle,
      )
      if (fullIntro) {
        extract = fullIntro
      }
    }

    return {
      extract,
      url:
        data.content_urls?.desktop?.page ||
        data.content_urls?.mobile?.page ||
        `https://${targetLang}.wikipedia.org/wiki/${encodeURIComponent(
          articleTitle.replace(/\s/g, "_"),
        )}`,
      lang: targetLang,
      title: data.title || articleTitle,
      exact,
    }
  }

  // Fetch Wikipedia article extract using sitelinks or direct search
  async #fetchWikipediaSummary(item) {
    let sitelinks = item.sitelinks
    let subtitle = item.subtitle || null

    // Fetch entity relatives if sitelinks or subtitle are not yet stored
    if ((!sitelinks || !subtitle) && item.entityUri) {
      try {
        const res = await this.#request(
          `api/entities/by-uris?uris=${encodeURIComponent(item.entityUri)}&relatives=wdt:P629`,
        )
        const entity = res?.entities?.[item.entityUri]
        const rawWorkUri = entity?.claims?.["wdt:P629"]?.[0]
        const workEntity = rawWorkUri ? res?.entities?.[rawWorkUri] : null
        if (!sitelinks) {
          const rawSitelinks =
            workEntity?.sitelinks || entity?.sitelinks || null
          sitelinks = filterSitelinks(rawSitelinks, item.originalLang)
        }
        if (!subtitle) {
          const rawSub =
            entity?.claims?.["wdt:P1680"]?.[0] ||
            workEntity?.claims?.["wdt:P1680"]?.[0] ||
            null
          if (rawSub) subtitle = cleanText(rawSub)
        }
      } catch (err) {
        console.warn(
          "Could not fetch entity details from Inventaire:",
          err.message,
        )
      }
    }

    const activeLang = this.#getActiveLanguage()
    const origLang = item.originalLang
      ? item.originalLang.split(/[-_]/)[0].toLowerCase()
      : null

    // Candidate language order: active app language, fallback, original
    const candidateLangs = Array.from(
      new Set(
        [activeLang, activeLang === "fr" ? "en" : "fr", origLang].filter(
          Boolean,
        ),
      ),
    )

    // 1. Try formal Wikidata sitelinks first
    if (sitelinks) {
      for (const lang of candidateLangs) {
        const wikiKey = `${lang}wiki`
        if (sitelinks[wikiKey]?.title) {
          const res = await this.#fetchWikiSummaryByTitle(
            lang,
            sitelinks[wikiKey].title,
            null,
            true,
          )
          if (res) return res
        }
      }
      for (const [key, val] of Object.entries(sitelinks)) {
        if (key.endsWith("wiki") && val?.title) {
          const lang = key.replace("wiki", "")
          const res = await this.#fetchWikiSummaryByTitle(
            lang,
            val.title,
            null,
            true,
          )
          if (res) return res
        }
      }
    }

    // 2. Search query on Wikipedia
    const primaryAuthor =
      Array.isArray(item.creators) && item.creators.length > 0
        ? item.creators[0]
        : item.creator
          ? item.creator.split(/[,;]+/)[0].trim()
          : null

    if (item.title && primaryAuthor) {
      for (const lang of candidateLangs) {
        const query = `"${item.title}" "${primaryAuthor}"`
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query,
        )}&srlimit=5&format=json&origin=*`
        const data = await this.#fetchWiki(searchUrl)
        const results = data?.query?.search || []

        for (const result of results) {
          const res = await this.#fetchWikiSummaryByTitle(
            lang,
            result.title,
            primaryAuthor,
            false,
            item.title,
            subtitle,
          )
          if (res) return res
        }
      }
    }

    return null
  }

  // Fetch book description from Open Library with pacing protection
  async #fetchOpenLibrarySummary(item) {
    let openLibraryId = item.openLibraryId

    // Fetch entity claims if openLibraryId is not yet cached on item
    if (!openLibraryId && item.entityUri) {
      try {
        const res = await this.#request(
          `api/entities/by-uris?uris=${encodeURIComponent(item.entityUri)}&relatives=wdt:P629`,
        )
        const entity = res?.entities?.[item.entityUri]
        const rawWorkUri = entity?.claims?.["wdt:P629"]?.[0]
        const workEntity = rawWorkUri ? res?.entities?.[rawWorkUri] : null
        openLibraryId =
          entity?.claims?.["wdt:P648"]?.[0] ||
          workEntity?.claims?.["wdt:P648"]?.[0] ||
          null
      } catch (err) {
        console.warn("Could not fetch openLibraryId:", err.message)
      }
    }

    if (!openLibraryId) return null

    // Helper enforcing at least 1000ms delay between Open Library calls
    const throttledOlFetch = async (url) => {
      const minDelayMs = 1000
      const now = Date.now()
      const elapsed = now - this.#lastOpenLibraryRequestTime
      if (elapsed < minDelayMs) {
        await sleep(minDelayMs - elapsed)
      }
      this.#lastOpenLibraryRequestTime = Date.now()
      return fetch(url, {
        headers: {
          Accept: "application/json",
        },
      })
    }

    try {
      let description = null
      let workKey = null

      if (openLibraryId.endsWith("M")) {
        // Query Open Library Edition API
        const bookUrl = `https://openlibrary.org/books/${encodeURIComponent(openLibraryId)}.json`
        const bookRes = await throttledOlFetch(bookUrl)
        if (bookRes.ok) {
          const bookData = await bookRes.json()
          description =
            typeof bookData.description === "string"
              ? bookData.description
              : bookData.description?.value || null
          workKey = bookData.works?.[0]?.key || null
        }
      } else if (openLibraryId.endsWith("W")) {
        workKey = `/works/${openLibraryId}`
      }

      // If edition has no description, query parent work
      if (!description && workKey) {
        const workUrl = `https://openlibrary.org${workKey}.json`
        const workRes = await throttledOlFetch(workUrl)
        if (workRes.ok) {
          const workData = await workRes.json()
          description =
            typeof workData.description === "string"
              ? workData.description
              : workData.description?.value || null
        }
      }

      if (description) {
        return {
          extract: description,
          url: workKey
            ? `https://openlibrary.org${workKey}`
            : `https://openlibrary.org/books/${openLibraryId}`,
        }
      }
      return null
    } catch (err) {
      console.warn("Open Library summary fetch error:", err.message)
      return null
    }
  }

  // Extended details for single book (including Wikipedia and Open Library)
  async getItemDetails(item) {
    // Reset corrupted state where Open Library overwrote a Wikipedia summary
    if ((item.hasWikipedia || item.wikipediaUrl) && item.hasOpenLibrary) {
      item.hasWikipedia = false
      item.hasOpenLibrary = false
      item.openLibraryUrl = null
      item.wikipediaChecked = false
    }

    // Clean up corrupted entity URI stored as ISBN
    if (
      item.isbn &&
      (item.isbn.startsWith("inv:") || item.isbn.startsWith("wd:"))
    ) {
      item.isbn = null
    }

    const isShort =
      !item.description || item.description.length < this.minDescriptionLength

    // Complete if Wikipedia summary exists or both sources were checked
    if (
      item.hasDetails &&
      (item.hasWikipedia ||
        (item.wikipediaChecked && (!isShort || item.hasOpenLibrary)))
    ) {
      return item
    }

    const detailed = { ...item }

    // Enrich cover image if missing
    if (!detailed.cover) {
      const imgRes = await this.getItemImage(detailed)
      if (imgRes?.cover) {
        detailed.cover = imgRes.cover
      }
    }

    // 1. Enrich description with Wikipedia summary
    if (!detailed.hasWikipedia && !detailed.wikipediaChecked) {
      try {
        const wikiInfo = await this.#fetchWikipediaSummary(detailed)
        if (wikiInfo) {
          if (wikiInfo.extract) {
            detailed.description = wikiInfo.extract
          }
          if (wikiInfo.url) {
            detailed.wikipediaUrl = wikiInfo.url
          }
          detailed.wikipediaTitle = wikiInfo.title || null
          detailed.wikipediaExact = wikiInfo.exact ?? true
          detailed.hasWikipedia = true
          detailed.hasOpenLibrary = false
          detailed.openLibraryUrl = null
        }
      } catch (err) {
        console.warn("Failed to fetch Wikipedia summary:", err.message)
      } finally {
        detailed.wikipediaChecked = true
      }
    }

    // 2. Fall back to Open Library only if Wikipedia summary was not found
    const isStillShort =
      !detailed.description ||
      detailed.description.length < this.minDescriptionLength
    if (!detailed.hasWikipedia && isStillShort && !detailed.hasOpenLibrary) {
      try {
        const olInfo = await this.#fetchOpenLibrarySummary(detailed)
        if (olInfo) {
          if (olInfo.extract) {
            detailed.description = olInfo.extract
          }
          if (olInfo.url) {
            detailed.openLibraryUrl = olInfo.url
          }
          detailed.hasOpenLibrary = true
        }
      } catch (err) {
        console.warn("Failed to fetch Open Library summary:", err.message)
      }
    }

    // Fall back to subtitle if description remains empty
    if (!detailed.description && detailed.subtitle) {
      detailed.description = detailed.subtitle
    }

    detailed.hasDetails = true
    return detailed
  }

  // Cover image getter
  async getItemImage(item) {
    if (this.devMode) return null
    if (item.cover) return { cover: item.cover }
    const entityUri = item.entityUri || item.entity
    if (entityUri) {
      try {
        const res = await this.#request(
          `api/entities/by-uris?uris=${encodeURIComponent(entityUri)}&relatives=wdt:P629`,
        )
        const targetUri = res?.redirects?.[entityUri] || entityUri
        const entity =
          res?.entities?.[targetUri] || res?.entities?.[entityUri] || {}
        const rawWorkUri = entity.claims?.["wdt:P629"]?.[0]
        const workUri = rawWorkUri
          ? res?.redirects?.[rawWorkUri] || rawWorkUri
          : null
        const workEntity = workUri ? res?.entities?.[workUri] : null
        const imgHash =
          entity.claims?.["invp:P2"]?.[0] ||
          workEntity?.claims?.["invp:P2"]?.[0] ||
          null
        const rawCover =
          entity.image?.url ||
          workEntity?.image?.url ||
          (typeof entity.image === "string" ? entity.image : null) ||
          (typeof workEntity?.image === "string" ? workEntity.image : null) ||
          (imgHash ? `/img/entities/${imgHash}` : null) ||
          item.snapshot?.["entity:image"] ||
          null
        if (rawCover) {
          const cover = this.#formatCoverUrl(rawCover)
          return cover ? { cover } : null
        }
      } catch {
        return null
      }
    }
    return null
  }

  // Sorted list of unique categories
  getCategories(items = {}) {
    const set = new Set()
    for (const item of Object.values(items)) {
      if (Array.isArray(item.categories)) {
        for (const cat of item.categories) {
          if (cat) set.add(capitalize(cat))
        }
      }
    }
    return Array.from(set).sort()
  }

  // Sorted list of unique authors/creators
  getCreators(items = {}) {
    const set = new Set()
    for (const item of Object.values(items)) {
      if (Array.isArray(item.creators) && item.creators.length > 0) {
        for (const author of item.creators) {
          if (author) set.add(author)
        }
      } else if (item.creator) {
        item.creator
          .split(/[,;]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((author) => set.add(author))
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }

  // Update item custom fields by updating private note in Inventaire
  async updateItem(item, changes) {
    const { rating, place, price, categories } = changes
    let noteText = item.notes || ""

    if (rating !== undefined && this.activeFieldRating) {
      noteText = this.#updateTag(
        noteText,
        this.activeFieldRating,
        rating > 0 ? rating : "",
      )
    }
    if (place !== undefined && this.activeFieldPlace) {
      noteText = this.#updateTag(noteText, this.activeFieldPlace, place)
    }
    if (price !== undefined && this.activeFieldPrice) {
      noteText = this.#updateTag(noteText, this.activeFieldPrice, price)
    }
    if (categories !== undefined && this.activeFieldCategories) {
      const categoriesStr = Array.isArray(categories)
        ? categories.join(", ")
        : categories
      noteText = this.#updateTag(
        noteText,
        this.activeFieldCategories,
        categoriesStr,
      )
    }

    const itemId = item.id || item._id
    const entityUri = item.entity || item.entityUri

    if (!itemId || !entityUri) {
      throw new Error(
        "Missing item ID or entity URI to update item on Inventaire",
      )
    }

    // Check or establish session before saving
    const loggedIn = await this.#login()

    if (!loggedIn) {
      throw new Error(
        t(
          "Authentication failed on {{provider}}. Please check your username and password.",
          {
            provider: this.getProviderInfo().name,
          },
        ),
      )
    }

    const payload = {
      id: itemId,
      _id: itemId,
      entity: entityUri,
      notes: noteText,
    }

    try {
      await this.#request("api/items", {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      this.#isLoggedIn = true
    } catch (err) {
      // If session expired (401/403), invalidate and re-authenticate once
      if (
        err.message &&
        (err.message.includes("401") || err.message.includes("403"))
      ) {
        this.#isLoggedIn = false
        if (typeof sessionStorage !== "undefined") {
          try {
            sessionStorage.removeItem("inventaire_session_user")
          } catch {
            // Non-critical
          }
        }
        if (this.#loginRateLimited) {
          throw new Error(
            t(
              "Too many login attempts on {{provider}}. Please wait a few minutes before retrying.",
              {
                provider: this.getProviderInfo().name,
              },
            ),
          )
        }
        const relogged = await this.#login(true)
        if (relogged) {
          await this.#request("api/items", {
            method: "PUT",
            body: JSON.stringify(payload),
          })
          this.#isLoggedIn = true
        } else {
          throw err
        }
      } else {
        throw err
      }
    }

    item.notes = noteText
    if (rating !== undefined) item.rating = rating
    if (place !== undefined) item.place = place
    if (price !== undefined) item.price = price
    if (categories !== undefined) item.categories = categories
  }

  // Normalize entity cover URL to use 300x300 thumbnail and local proxy
  #formatCoverUrl(rawCover) {
    if (!rawCover) return null
    // Inventaire entity images use 300x300 resized thumbnails
    const normalized = rawCover.replace(
      /\/img\/entities\/(?:300x300\/)?([^/?#]+)/i,
      "/img/entities/300x300/$1",
    )
    if (normalized.startsWith("/api/inventaire-image/")) {
      return normalized
    }
    if (normalized.startsWith("/")) {
      return `/api/inventaire-image${normalized}`
    }
    if (
      normalized.startsWith("https://inventaire.io/") ||
      normalized.startsWith("http://inventaire.io/")
    ) {
      return `/api/inventaire-image/${normalized.replace(/^https?:\/\/inventaire\.io\//, "")}`
    }
    return normalized
  }

  // Translate remote Inventaire image URLs to local proxy endpoint
  getImageProxyUrl(url) {
    return this.#formatCoverUrl(url) || url
  }

  getMaxRequestsPerMinute() {
    return 60
  }

  getDefaultSort() {
    return "added_desc"
  }
}

export default InventairePlugin
