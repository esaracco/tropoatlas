import { useRef } from "react"

export const useScrollbarWidth = () => {
  const didCompute = useRef(false)
  const widthRef = useRef(0)

  if (didCompute.current) {
    return widthRef.current
  }

  if (typeof document === "undefined") {
    // SSR fallback
    return 0
  }

  // Creating invisible container
  const outer = document.createElement("div")
  outer.style.visibility = "hidden"
  // Forcing scrollbar to appear
  outer.style.overflow = "scroll"
  // Needed for WinJS apps
  outer.style.msOverflowStyle = "scrollbar"
  document.body.appendChild(outer)

  // Creating inner element and placing it in the container
  const inner = document.createElement("div")
  outer.appendChild(inner)

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth

  // Removing temporary elements from the DOM
  outer.parentNode.removeChild(outer)

  didCompute.current = true
  widthRef.current = scrollbarWidth

  return scrollbarWidth
}
