import React from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons"
import "./AboutButton.css"

const AboutButton = ({ onClick }) => {
  return (
    <div className="AboutButton" onClick={onClick}>
      <FontAwesomeIcon icon={faInfoCircle} />
    </div>
  )
}

export default AboutButton
