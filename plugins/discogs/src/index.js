import sleep from "sleep-promise"
import {
  hasLatinLetter,
  hasNonLatinLetter,
  normalize,
  BasePlugin,
  useSettingsStore,
} from "@tropo/core"
import logo from "./assets/logo.png"

// Marker function for i18n static extraction
const t = (s) => s

export const getArtistName = ({ name, anv } = {}) => {
  if (!name) return anv || ""
  if (!anv) return name

  if (
    hasNonLatinLetter(name) &&
    hasLatinLetter(anv) &&
    !hasNonLatinLetter(anv)
  ) {
    return anv
  }

  return name
}

export class DiscogsPlugin extends BasePlugin {
  constructor(config = {}) {
    super()
    const env = config.env || {}
    this.user = env.VITE_DISCOGS_USER || config.user
    this.devMode = config.devMode || false

    this.fieldsId = {}
    this.apiBase = config.apiBase || "https://api.discogs.com"
  }

  get config() {
    return useSettingsStore.getState().pluginsConfig.discogs || {}
  }

  get itemsPerRequest() {
    return Number(this.config.apiItemsPerRequest) || 250
  }

  get requestDelay() {
    return Number(this.config.apiRequestDelay) || 2
  }

  get formats() {
    return this.config.formats || "all"
  }

  get placeField() {
    return this.config.fieldPlace
  }

  get priceField() {
    return this.config.fieldPrice
  }

  get stylesField() {
    return this.config.fieldStyles
  }

  get fieldsRequired() {
    return this.config.fieldsRequired || "no"
  }

  getProviderInfo() {
    return {
      name: "Discogs",
      url: "https://www.discogs.com",
      logo,
      multipleFormats:
        !this.formats ||
        this.formats === "all" ||
        this.formats.indexOf(",") > -1,
    }
  }

  getSettingsSchema() {
    return [
      {
        key: "formats",
        label: t("Formats (comma separated, or `all`)"),
        type: "text",
        requiresResync: true,
      },
      { type: "header", label: t("Custom Fields Mapping") },
      {
        key: "fieldPlace",
        label: t("Location Field (e.g., `place`)"),
        type: "text",
        requiresResync: true,
      },
      {
        key: "fieldPrice",
        label: t("Price Field (e.g., `price`)"),
        type: "text",
        requiresResync: true,
      },
      {
        key: "fieldStyles",
        label: t("Styles Field (e.g., `styles`)"),
        type: "text",
        requiresResync: true,
      },
      {
        key: "fieldsRequired",
        label: t("Only show albums that have at least one custom field"),
        type: "boolean",
        requiresResync: true,
      },
    ]
  }

  getDraftCapabilities(config) {
    return {
      supportsPlace: !!config.fieldPlace,
      supportsPrice: !!config.fieldPrice,
      supportsCategories: !!config.fieldStyles,
    }
  }

  validateSettings(onConfigError) {
    if (!this.user && onConfigError) {
      onConfigError("The {{field}} environment variable is required!", {
        field: "VITE_DISCOGS_USER",
      })
    }
    if (
      this.fieldsRequired === "yes" &&
      !(this.placeField || this.priceField || this.stylesField) &&
      onConfigError
    ) {
      onConfigError(
        'With the {{required}} environment variable set to "yes" you must at least set one of the following variables: {{place}}, {{price}} or {{styles}}!',
        {
          required: "VITE_DISCOGS_FIELDS_REQUIRED",
          place: "VITE_DISCOGS_FIELD_PLACE",
          price: "VITE_DISCOGS_FIELD_PRICE",
          styles: "VITE_DISCOGS_FIELD_STYLES",
        },
      )
    }
  }

  async #request(method, service, args) {
    // The Authorization header (Discogs token) is injected upstream by
    // the reverse proxy (e.g., Nginx, Apache, or Vite dev server).
    const options = {
      method,
      headers: {
        "content-type": "application/json;charset=utf-8",
      },
    }

    let url = `${this.apiBase}/${service}`
    if (method === "GET" && args) url += `?${args}`
    if (method === "POST" && args) options.body = JSON.stringify(args)

    const r = await fetch(url, options)
    if (r.ok) {
      const text = await r.text()
      return text ? JSON.parse(text) : null
    }
    throw new Error(`Discogs API Error: ${r.statusText}`)
  }

  async getFieldsId() {
    if (!this.placeField && !this.priceField && !this.stylesField) return {}
    if (Object.keys(this.fieldsId).length > 0) return this.fieldsId

    const conf = Object.entries({
      placeId: this.placeField,
      priceId: this.priceField,
      stylesId: this.stylesField,
    })

    const r = await this.#request("GET", `users/${this.user}/collection/fields`)
    for (const field of r.fields) {
      for (const [k, v] of conf) {
        if (field.name === v) this.fieldsId[k] = field.id
      }
    }
    return this.fieldsId
  }

  async getCustomFieldsInfo() {
    await this.getFieldsId()
    return {
      supportsPlace: !!this.fieldsId.placeId,
      supportsPrice: !!this.fieldsId.priceId,
      supportsCategories: !!this.fieldsId.stylesId,
    }
  }

  #getFieldsValue(data) {
    const fields = {}
    if (data && Object.keys(this.fieldsId).length) {
      const { placeId, priceId, stylesId } = this.fieldsId
      for (const item of data) {
        if (item.field_id === placeId) fields.place = item.value
        else if (item.field_id === priceId) fields.price = item.value
        else if (item.field_id === stylesId) fields.styles = item.value
      }
    }
    return fields
  }

  async getCollection(onProgress) {
    await this.getFieldsId()
    const releases = {}
    const _formats =
      this.formats && this.formats !== "all"
        ? new Set(
            this.formats
              .trim()
              .split(/\s*,\s*/)
              .map((f) => f.toLowerCase()),
          )
        : null

    if (onProgress) onProgress(5)

    const stats = await this.#request(
      "GET",
      `users/${this.user}/collection/folders/0/releases`,
      "page=1&per_page=1",
    )
    const pages = Math.ceil(stats.pagination.items / this.itemsPerRequest)

    if (onProgress) onProgress(10)
    const inc = (100 - 10) / pages
    let currentProgress = 10

    for (let i = 1; i <= pages; i++) {
      if (i > 1) await sleep(this.requestDelay * 1000)

      const r = await this.#request(
        "GET",
        `users/${this.user}/collection/folders/0/releases`,
        `page=${i}&per_page=${this.itemsPerRequest}`,
      )

      for (const release of r.releases) {
        const info = release.basic_information
        const format = info.formats[0].name

        if (!_formats || _formats.has(format.toLowerCase())) {
          let { place, price, styles } = this.#getFieldsValue(release.notes)
          const haveFields = !!(place || price || styles)

          if (this.fieldsRequired === "yes" && !haveFields) continue

          if (styles) styles = styles.trim().split(/\s*,\s*/)
          else styles = info.styles || info.genres || []

          styles.sort() // SORT CATEGORIES to match legacy behavior

          const artist = getArtistName(info.artists[0]).replace(/\(.*/, "")
          const searchIndex = `${artist.replace(/\s/g, "-")}_${info.title.replace(/\s/g, "-")}_${normalize(artist)}_${normalize(info.title)}`

          const hasValidCover =
            !this.devMode &&
            info.cover_image &&
            !info.cover_image.includes("spacer.gif")

          releases[release.instance_id] = {
            format,
            searchIndex,
            id: release.instance_id,
            folderid: release.folder_id,
            masterid: info.master_id,
            releaseid: info.id,
            added: release.date_added,
            creator: artist,
            year: info.year,
            title: info.title,
            cover: hasValidCover ? info.cover_image : null,
            thumb: hasValidCover ? info.thumb : null,
            place,
            price,
            categories: styles,
            rating: release.rating,
          }
        }
      }
      currentProgress += inc
      if (onProgress) onProgress(currentProgress)
    }
    return releases
  }

  #extractYear(notes) {
    if (notes) {
      const m = notes.match(/Ⓟ\s*(1\d\d\d)|[^\d](1\d\d\d)[^\d]/s)
      if (m) {
        return Number(m[1] || m[2])
      }
    }
    return null
  }

  #formatNotesToMarkdown(notes) {
    if (!notes) return ""
    let formatted = notes.replace(
      /\[(a|l|m|r)=?([^\]]+)\]/g,
      (match, p1, p2) => {
        const type =
          p1 === "a"
            ? "artist"
            : p1 === "l"
              ? "label"
              : p1 === "m"
                ? "master"
                : "release"
        return `[${p2}](https://www.discogs.com/${type}/${p2})`
      },
    )
    formatted = formatted.replace(
      /\[url=([^\]]+)]([^\]]+)\[\/url]/g,
      "[$2]($1)",
    )
    return formatted
  }

  async getItemDetails(item) {
    const master = item.masterid
      ? await this.getMaster({ id: item.masterid })
      : null
    const release = await this.getRelease({
      id: item.releaseid,
    })

    let year = item.year
    if (!year) {
      year = this.#extractYear(release.notes)
      if (!year && master) year = this.#extractYear(master.notes)
      if (!year && master && master.year) year = master.year
    }

    if (master && master.tracklist) {
      master.tracklist.forEach((t) => delete t.extraartists)
    }
    const tracklist = release.tracklist || []
    if (tracklist) {
      tracklist.forEach((t) => delete t.extraartists)
    }

    const rNotes = release.notes
      ? this.#formatNotesToMarkdown(release.notes.trim())
      : null
    const mNotes =
      master && master.notes
        ? this.#formatNotesToMarkdown(master.notes.trim())
        : null

    const finalTracklist = tracklist.length
      ? tracklist
      : master && master.tracklist && master.tracklist.length
        ? master.tracklist
        : []

    return {
      ...item,
      year,
      country: release.country,
      notes: rNotes,
      globalNotes: mNotes,
      tracklist: finalTracklist,
      externalUrl: `https://www.discogs.com/release/${item.releaseid}`,
    }
  }

  async getItemImages(item) {
    if (!item.releaseid) return null
    const r = await this.getRelease({ id: item.releaseid })
    if (r && r.images && r.images.length > 0) {
      return {
        cover: r.images[0].uri,
        thumb: r.images[0].uri150,
      }
    }
    return null
  }

  getMaster({ id }) {
    return this.#request("GET", `masters/${id}`)
  }

  getRelease({ id }) {
    return this.#request("GET", `releases/${id}`)
  }

  async updateItem({ folderid, releaseid, id, instanceid }, changes) {
    const { rating, place, price, categories } = changes
    const actualInstanceId = id || instanceid
    const base = `users/${this.user}/collection/folders/${folderid}/releases/${releaseid}/instances/${actualInstanceId}`

    await this.getFieldsId()
    const { placeId, priceId, stylesId } = this.fieldsId

    const requests = []

    if (rating !== undefined) {
      requests.push(this.#request("POST", base, { rating }))
    }
    if (place !== undefined && placeId) {
      requests.push(
        this.#request("POST", `${base}/fields/${placeId}`, {
          value: place,
        }),
      )
    }
    if (price !== undefined && priceId) {
      requests.push(
        this.#request("POST", `${base}/fields/${priceId}`, {
          value: price,
        }),
      )
    }
    if (categories !== undefined && stylesId) {
      requests.push(
        this.#request("POST", `${base}/fields/${stylesId}`, {
          value: categories.join(","),
        }),
      )
    }

    await Promise.all(requests)
  }

  getCategories(releases) {
    const styles = new Set()
    Object.values(releases).forEach((r) => {
      const cats = r.categories || []
      cats.forEach((s) => styles.add(s))
    })
    return Array.from(styles).sort()
  }
}
