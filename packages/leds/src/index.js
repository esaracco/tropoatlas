import { useSettingsStore } from "@tropo/core"

// Marker function for i18n static extraction
const _ = (s) => s

export class LedsClient {
  static INVALID_COLOR_MSG = _(
    "Must be a valid RGB format (e.g. 255,0,0) and not 0,0,0",
  )

  static isValidColor(val) {
    if (!val) return false
    const str = String(val).replace(/\s/g, "")
    if (str === "0,0,0") return false
    const match = str.match(/^(\d{1,3}),(\d{1,3}),(\d{1,3})$/)
    if (!match) return false
    const [, r, g, b] = match
    return Number(r) <= 255 && Number(g) <= 255 && Number(b) <= 255
  }

  constructor(options = {}) {
    this.apiBase = options.apiBase || "/api"
    this.timeoutMs = options.timeoutMs || 5000
    this.pingIntervalMs = options.pingIntervalMs || 5000
    this.heartbeatTimer = null
    this.onError =
      options.onError ||
      ((err) => {
        console.error("LedsClient error:", err)
      })
  }

  validateSettings(onConfigError) {
    if (!onConfigError) return

    const hardware = useSettingsStore.getState().hardware || {}
    const colorFields = [
      {
        envKey: "VITE_LEDS_ARTISTS_COLOR",
        storeKey: "ledsArtistsColor",
      },
      {
        envKey: "VITE_LEDS_STYLES_COLOR",
        storeKey: "ledsStylesColor",
      },
      {
        envKey: "VITE_LEDS_ALBUM_COLOR",
        storeKey: "ledsAlbumColor",
      },
    ]

    colorFields.forEach(({ envKey, storeKey }) => {
      const envVal = import.meta.env[envKey]
      const storeVal = hardware[storeKey]

      // Check if the environment variable itself is present but invalid
      const isEnvInvalid =
        envVal !== undefined &&
        envVal !== "" &&
        !LedsClient.isValidColor(envVal)

      // Check if the active store value is invalid
      const isStoreInvalid =
        storeVal !== undefined &&
        storeVal !== "" &&
        !LedsClient.isValidColor(storeVal)

      if (isEnvInvalid || isStoreInvalid) {
        onConfigError("The {{field}} environment variable is invalid!", {
          field: envKey,
        })
      }
    })
  }

  async #request(url, options = {}) {
    try {
      // AbortSignal.timeout automatically handles cancellation if the server does not respond
      const fetchOptions = {
        signal: AbortSignal.timeout(this.timeoutMs),
        ...options,
      }
      const response = await fetch(url, fetchOptions)

      if (!response.ok) {
        // Try to retrieve error details returned by the server
        const errorDetails = await response.text().catch(() => "")
        throw new Error(
          `LED API Error ${response.status} (${response.statusText}) - ${errorDetails}`,
        )
      }

      // Proper verification of the returned content type
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        return await response.json()
      }

      return {} // Fallback for endpoints that do not return JSON
    } catch (err) {
      this.onError(err)
      throw err
    }
  }

  setLeds(props, fetchOptions = {}) {
    const isReset = !props || Object.keys(props).length === 0

    let payload = []
    if (!isReset) {
      const items = Array.isArray(props) ? props : [props]
      payload = items.map((item) => {
        const data = {}
        if (item.place !== undefined) {
          data.leds = Array.isArray(item.place)
            ? item.place.join(",")
            : String(item.place)
        }
        if (item.color !== undefined) {
          data.color = String(item.color)
        }
        if (item.intensity !== undefined) {
          data.intensity = item.intensity
        }
        if (item.blink !== undefined) {
          data.blink = Boolean(item.blink)
        }
        if (item.place !== undefined || item.color !== undefined) {
          data.noreset = Boolean(item.noreset || false)
        }
        return data
      })
    }

    const body = new URLSearchParams()
    body.append("data", JSON.stringify(payload))

    return this.#request(this.apiBase + "/leds", {
      method: "POST",
      body,
      ...fetchOptions,
    })
  }

  setRuler(props = {}) {
    const { show = true } = props
    const params = new URLSearchParams({ reset: Number(!show) })
    return this.#request(`${this.apiBase}/ruler?${params.toString()}`)
  }

  async ping() {
    try {
      const response = await fetch(`${this.apiBase}/ping`, { method: "GET" })
      return response.ok
    } catch (err) {
      console.warn("LEDs ping failed:", err.message)
      return false
    }
  }

  startHeartbeat(intervalMs = 5000) {
    if (this.heartbeatTimer) return
    this.heartbeatTimer = setInterval(() => this.ping(), intervalMs)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}
