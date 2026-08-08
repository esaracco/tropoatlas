export class LedsClient {
  constructor(options = {}) {
    this.apiBase = options.apiBase || "/api/leds"
    this.rulerBase = options.rulerBase || "/api/ruler"
    this.timeoutMs = options.timeoutMs || 5000 // 5 seconds default timeout
    this.onError =
      options.onError ||
      ((err) => {
        console.error("LedsClient error:", err)
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

  setLeds(props) {
    const isReset =
      !props || (Object.keys(props).length === 0 && !Array.isArray(props))

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
          data.blink = Number(item.blink)
        }
        if (item.place !== undefined || item.color !== undefined) {
          data.noreset = Number(item.noreset || false)
        }
        return data
      })
    }

    const body = new URLSearchParams()
    body.append("data", JSON.stringify(payload))

    const keepalive = !Array.isArray(props) && props ? props.keepalive : false

    return this.#request(this.apiBase, {
      method: "POST",
      body,
      keepalive,
    })
  }

  setRuler(props = {}) {
    const { show = true } = props
    const params = new URLSearchParams({ reset: Number(!show) })
    return this.#request(`${this.rulerBase}?${params.toString()}`)
  }
}
