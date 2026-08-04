import React, { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowCircleUp } from "@fortawesome/free-solid-svg-icons"

import "./ScrollButton.css"

// COMPONENT ScrollButton
const ScrollButton = () => {
  const [display, setDisplay] = useState(false)

  // METHOD scrollToTop()
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" })

  // EFFECT
  useEffect(() => {
    // Method _onScroll()
    const _onScroll = () => setDisplay(window.scrollY > 300)

    window.addEventListener("scroll", _onScroll)

    return () => window.removeEventListener("scroll", _onScroll)
  }, [])

  // RENDER
  return (
    <div className="ScrollButton" style={{ opacity: display ? 1 : 0 }}>
      <FontAwesomeIcon icon={faArrowCircleUp} onClick={scrollToTop} />
    </div>
  )
}

export default ScrollButton
