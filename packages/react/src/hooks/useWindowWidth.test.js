// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useWindowWidth } from "./useWindowWidth.js"

const setWindowWidth = (width) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  })
}

describe("useWindowWidth", () => {
  beforeEach(() => {
    setWindowWidth(1024)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test initial window width measurement
  it("should initialize with the current window width", () => {
    const { result } = renderHook(() => useWindowWidth())
    expect(result.current).toBe(1024)
  })

  // Test instant update on orientationchange event
  it("should update width immediately on orientationchange event", () => {
    const { result } = renderHook(() => useWindowWidth())

    act(() => {
      setWindowWidth(480)
      window.dispatchEvent(new Event("orientationchange"))
    })

    expect(result.current).toBe(480)
  })

  // Test resize event handling with requestAnimationFrame
  it("should update width on resize event", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0)
      return 1
    })

    const { result } = renderHook(() => useWindowWidth(0))

    act(() => {
      setWindowWidth(768)
      window.dispatchEvent(new Event("resize"))
    })

    expect(result.current).toBe(768)
  })
})
