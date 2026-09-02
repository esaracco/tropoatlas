import React from "react"
import { Button } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSliders } from "@fortawesome/free-solid-svg-icons"

const SettingsButton = ({ onClick }) => {
  return (
    <Button className="HeaderButton" variant="secondary" onClick={onClick}>
      <FontAwesomeIcon icon={faSliders} size="lg" />
    </Button>
  )
}

export default SettingsButton
