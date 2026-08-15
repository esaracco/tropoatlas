import { useState, useEffect } from "react"

export const useWindowWidth = (debounceDelay = 0) => {
  const [winWidth, setWinWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0,
  )

  useEffect(() => {
    let timeoutId
    let rafId

    const updateWidth = () => {
      setWinWidth(window.innerWidth)
    }

    const handleResize = () => {
      if (debounceDelay > 0) {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(updateWidth, debounceDelay)
      } else {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(updateWidth)
      }
    }

    // Handle orientation changes immediately without debounce delay
    const handleOrientationChange = () => {
      clearTimeout(timeoutId)
      cancelAnimationFrame(rafId)
      updateWidth()
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleOrientationChange)

    return () => {
      clearTimeout(timeoutId)
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleOrientationChange)
    }
  }, [debounceDelay])

  return winWidth
}
