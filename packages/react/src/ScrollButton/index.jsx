import React, { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowCircleUp } from "@fortawesome/free-solid-svg-icons"

import "./ScrollButton.css"

// COMPONENT ScrollButton
const ScrollButton = ({ scrollerRef, onScrollToTop }) => {
  const [display, setDisplay] = useState(false)

  // METHOD scrollToTop()
  const scrollToTop = () => {
    if (onScrollToTop) {
      onScrollToTop()
    } else if (scrollerRef && scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // EFFECT
  useEffect(() => {
    const target = (scrollerRef && scrollerRef.current) || window

    const _onScroll = () => {
      const scrollPos = target === window ? window.scrollY : target.scrollTop
      setDisplay(scrollPos > 300)
    }

    target.addEventListener("scroll", _onScroll)

    return () => target.removeEventListener("scroll", _onScroll)
  }, [scrollerRef])

  // RENDER
  return (
    <div
      className={`d-flex justify-content-center ScrollButtonWrapper ${
        display ? "visible" : ""
      }`}
    >
      <div className="ScrollButton" style={{ pointerEvents: "auto" }}>
        <FontAwesomeIcon icon={faArrowCircleUp} onClick={scrollToTop} />
      </div>
    </div>
  )
}

export default ScrollButton
