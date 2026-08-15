// @vitest-environment jsdom
import React, { createRef } from "react"
import { describe, it, expect, vi } from "vitest"
import { render, fireEvent } from "@testing-library/react"
import Search from "./index.jsx"

describe("Search component", () => {
  // Test input rendering and user typing
  it("should render input and call setSearchStr on input change", () => {
    const setSearchStr = vi.fn()
    const { getByPlaceholderText } = render(
      <Search
        placeholder="artist, album..."
        searchStr=""
        setSearchStr={setSearchStr}
      />,
    )

    const input = getByPlaceholderText("artist, album...")
    fireEvent.change(input, { target: { value: "Pink Floyd" } })

    expect(setSearchStr).toHaveBeenCalledWith("Pink Floyd")
  })

  // Test reset button clears search and focuses with preventScroll
  it("should clear search and focus input with preventScroll on reset", () => {
    const setSearchStr = vi.fn()
    const inputRef = createRef()

    const { container } = render(
      <Search
        placeholder="artist, album..."
        searchStr="Genesis"
        setSearchStr={setSearchStr}
        inputRef={inputRef}
      />,
    )

    const input = container.querySelector("input")
    const focusSpy = vi.spyOn(input, "focus")

    const clearButton = container.querySelector(".search-clear")
    if (clearButton) {
      fireEvent.click(clearButton)
    }

    expect(setSearchStr).toHaveBeenCalledWith("")
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
  })
})
