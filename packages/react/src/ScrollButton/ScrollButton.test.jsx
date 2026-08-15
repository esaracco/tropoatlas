// @vitest-environment jsdom
import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, fireEvent, act } from "@testing-library/react"
import ScrollButton from "./index.jsx"

describe("ScrollButton", () => {
  beforeEach(() => {
    window.scrollY = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test that button is hidden by default when scroll position is at top
  it("should not be visible when scroll position is <= 300px", () => {
    const { container } = render(<ScrollButton />)
    const wrapper = container.querySelector(".ScrollButtonWrapper")

    expect(wrapper?.classList.contains("visible")).toBe(false)
  })

  // Test visibility when scrolled past threshold on window
  it("should become visible when window scrollY > 300px", () => {
    const { container } = render(<ScrollButton />)
    const wrapper = container.querySelector(".ScrollButtonWrapper")

    act(() => {
      window.scrollY = 450
      window.dispatchEvent(new Event("scroll"))
    })

    expect(wrapper?.classList.contains("visible")).toBe(true)
  })

  // Test custom scroller container support
  it("should listen to custom scrollerRef and trigger onScrollToTop callback", () => {
    const scroller = document.createElement("div")
    scroller.scrollTop = 0
    const scrollerRef = { current: scroller }
    const onScrollToTop = vi.fn()

    const { container } = render(
      <ScrollButton scrollerRef={scrollerRef} onScrollToTop={onScrollToTop} />,
    )
    const wrapper = container.querySelector(".ScrollButtonWrapper")

    act(() => {
      scroller.scrollTop = 500
      scroller.dispatchEvent(new Event("scroll"))
    })

    expect(wrapper?.classList.contains("visible")).toBe(true)

    const icon = container.querySelector(".fa-circle-arrow-up")
    if (icon) {
      fireEvent.click(icon)
      expect(onScrollToTop).toHaveBeenCalledTimes(1)
    }
  })
})
