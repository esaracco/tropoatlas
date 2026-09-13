import fs from "fs"

// Extract theme surface colors from CSS tokens (single source of truth)
// and provide Vite plugin to inject theme and metadata into index.html
export const getThemeConfig = (options = {}) => {
  const config =
    typeof options === "string" ? { defaultTheme: options } : options
  const { defaultTheme = "dark", title = "", description = "" } = config

  const themesCssPath = new URL("./themes.css", import.meta.url)
  const themesCss = fs.readFileSync(themesCssPath, "utf8")

  const themeColors = {}
  const themeBlockRegex = /(?:\[data-theme="([^"]+)"\]|:root)[^{]*\{([^}]+)\}/g
  let blockMatch
  while ((blockMatch = themeBlockRegex.exec(themesCss)) !== null) {
    const themeName = blockMatch[1] || "dark"
    const colorMatch = blockMatch[2].match(
      /--tropo-surface:\s*(#[0-9a-f]{3,8})/i,
    )
    if (colorMatch) {
      themeColors[themeName] = colorMatch[1]
    }
  }

  const defaultThemeColor = themeColors[defaultTheme] || "#121212"

  const themeColorPlugin = {
    name: "theme-color-plugin",
    transformIndexHtml(html) {
      return html
        .replace("%APP_TITLE%", title)
        .replace("%APP_DESCRIPTION%", description)
        .replace("%DEFAULT_THEME%", defaultTheme)
        .replace("%THEME_SURFACE_COLOR%", defaultThemeColor)
        .replace("%THEME_COLORS_MAP%", JSON.stringify(themeColors))
    },
  }

  return {
    themeColorPlugin,
    defaultThemeColor,
  }
}
