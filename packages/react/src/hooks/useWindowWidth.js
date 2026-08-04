import { useState, useEffect } from "react"

export const useWindowWidth = (debounceDelay = 100) => {
  const [winWidth, setWinWidth] = useState(window.innerWidth)

  useEffect(() => {
    let timeoutId
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(
        () => setWinWidth(window.innerWidth),
        debounceDelay,
      )
    }

    window.addEventListener("resize", handleResize)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener("resize", handleResize)
    }
  }, [debounceDelay])

  return winWidth
}
