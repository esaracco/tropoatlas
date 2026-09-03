import { describe, it, expect } from "vitest"
import { DiscogsPlugin, getArtistName } from "./index.js"

describe("DiscogsPlugin - getDefaultSort", () => {
  it("should return default sort order added_desc", () => {
    const plugin = new DiscogsPlugin()
    expect(plugin.getDefaultSort()).toBe("added_desc")
  })
})

describe("DiscogsPlugin - getArtistName", () => {
  it("should return name when no ANV is provided", () => {
    expect(getArtistName({ name: "Pink Floyd" })).toBe("Pink Floyd")
  })

  it("should return name when both name and ANV are in latin script", () => {
    expect(getArtistName({ name: "Björk", anv: "Bjork" })).toBe("Björk")
  })

  it("should return latin ANV when primary name is non-latin", () => {
    expect(
      getArtistName({ name: "Владимир Высоцкий", anv: "Vladimir Vissotski" }),
    ).toBe("Vladimir Vissotski")
  })

  it("should keep non-latin name if ANV is also non-latin", () => {
    expect(getArtistName({ name: "亜蘭知子", anv: "アラントモコ" })).toBe(
      "亜蘭知子",
    )
  })

  it("should fallback to ANV if name is missing or empty", () => {
    expect(getArtistName({ name: "", anv: "Iron Maiden" })).toBe("Iron Maiden")
  })

  it("should return empty string if no artist object or empty object is passed", () => {
    expect(getArtistName()).toBe("")
    expect(getArtistName({})).toBe("")
  })
})
