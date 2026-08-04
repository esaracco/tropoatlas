import sleep from "sleep-promise"
import { normalize } from "@tropo/core"
import vinylImg192 from "./assets/vinyl-300.png"
import vinylImg300 from "./assets/vinyl-300.png"

export class DiscogsPlugin {
  constructor(config = {}) {
    this.token = config.token
    this.user = config.user
    this.itemsPerRequest = config.itemsPerRequest || 250
    this.requestDelay = config.requestDelay || 2
    this.formats = config.formats || "all"
    this.placeField = config.placeField
    this.priceField = config.priceField
    this.stylesField = config.stylesField
    this.fieldsRequired = config.fieldsRequired || "no"
    this.devMode = config.devMode || false

    this.fieldsId = {}
    this.apiBase = config.apiBase || "https://api.discogs.com"
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

  getMaster({ id }) {
    return this.#request("GET", `masters/${id}`)
  }

  getRelease({ id }) {
    return this.#request("GET", `releases/${id}`)
  }

  async updateUserData({ folderid, releaseid, instanceid }, changes) {
    const { rating, place, price, styles } = changes
    const base = `users/${this.user}/collection/folders/${folderid}/releases/${releaseid}/instances/${instanceid}`

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
    if (styles !== undefined && stylesId) {
      requests.push(
        this.#request("POST", `${base}/fields/${stylesId}`, {
          value: styles.join(","),
        }),
      )
    }

    await Promise.all(requests)
  }

  extractStyles(releases) {
    const styles = new Set()
    Object.values(releases).forEach((r) => {
      const cats = r.categories || r.styles || []
      cats.forEach((s) => styles.add(s))
    })
    return Array.from(styles).sort()
  }
}
