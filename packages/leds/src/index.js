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

  setLeds(props = {}) {
    const { place, color, noreset = false, keepalive = false } = props
    const params = new URLSearchParams()

    // Modular and safe URL construction (automatic URL encoding, e.g. # -> %23)
    if (place !== undefined) {
      params.append("leds", Array.isArray(place) ? place.join(",") : place)
    }
    if (color !== undefined) {
      params.append("color", color)
    }

    // Add noreset only if there are specific actions to perform
    if (place !== undefined || color !== undefined) {
      params.append("noreset", Number(noreset))
      return this.#request(`${this.apiBase}?${params.toString()}`, {
        keepalive,
      })
    }

    return this.#request(this.apiBase, { keepalive })
  }

  setRuler(props = {}) {
    const { show = true } = props
    const params = new URLSearchParams({ reset: Number(!show) })
    return this.#request(`${this.rulerBase}?${params.toString()}`)
  }
}
