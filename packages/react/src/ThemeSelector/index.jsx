import React, { useState, useEffect } from "react"

import "./ThemeSelector.css"

// COMPONENT ThemeSelector
const ThemeSelector = ({
  themes = ["dark", "light", "orange", "blue", "purple", "green"],
  storageKey = "tropo-theme",
  title = "Theme",
  ariaLabel = "Change theme",
}) => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(storageKey) || themes[0],
  )

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem(storageKey, theme)
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      const surfaceColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--tropo-surface")
        .trim()
      if (surfaceColor) {
        metaThemeColor.setAttribute("content", surfaceColor)
      }
    }
  }, [theme, storageKey])

  const cycleTheme = () => {
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return (
    <span
      className="ThemeSelector"
      onClick={cycleTheme}
      title={`${title} (${theme})`}
      aria-label={ariaLabel}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && cycleTheme()}
    >
      <span className="ThemeSelector-dot" />
    </span>
  )
}

export default ThemeSelector
