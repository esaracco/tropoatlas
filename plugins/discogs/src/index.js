import sleep from "sleep-promise"
import { normalize, BasePlugin } from "@tropo/core"
import vinylImg192 from "./assets/vinyl-300.png"
import vinylImg300 from "./assets/vinyl-300.png"
import logo from "./assets/logo.png"

export class DiscogsPlugin extends BasePlugin {
  constructor(config = {}) {
    super()
    const env = config.env || {}
    this.token = env.VITE_DISCOGS_TOKEN || config.token
    this.user = env.VITE_DISCOGS_USER || config.user
    this.itemsPerRequest =
      Number(
        env.VITE_DISCOGS_API_ITEMS_PER_REQUEST || config.itemsPerRequest,
      ) || 250
    this.requestDelay =
      Number(env.VITE_DISCOGS_API_REQUEST_DELAY || config.requestDelay) || 2
    this.formats = env.VITE_DISCOGS_FORMATS || config.formats || "all"
    this.placeField = env.VITE_DISCOGS_FIELD_PLACE || config.placeField
    this.priceField = env.VITE_DISCOGS_FIELD_PRICE || config.priceField
    this.stylesField = env.VITE_DISCOGS_FIELD_STYLES || config.stylesField
    this.fieldsRequired =
      env.VITE_DISCOGS_FIELDS_REQUIRED || config.fieldsRequired || "no"
    this.devMode = config.devMode || false

    this.fieldsId = {}
    this.apiBase = config.apiBase || "https://api.discogs.com"
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
    const options = {
      method,
      headers: {
        "content-type": "application/json;charset=utf-8",
      },
    }
    if (this.token) {
      options.headers["Authorization"] = `Discogs token=${this.token}`
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

          const artist = info.artists[0].name.replace(/\(.*/, "")
          const searchIndex = `${artist.replace(/\s/g, "-")}_${info.title.replace(/\s/g, "-")}_${normalize(artist)}_${normalize(info.title)}`

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
            cover:
              this.devMode || info.cover_image?.includes("spacer.gif")
                ? vinylImg300
                : info.cover_image,
            thumb:
              this.devMode || info.cover_image?.includes("spacer.gif")
                ? vinylImg192
                : info.thumb,
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
