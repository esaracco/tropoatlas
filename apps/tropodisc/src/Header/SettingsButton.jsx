import React from "react"
import { Button } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCog } from "@fortawesome/free-solid-svg-icons"

const SettingsButton = ({ onClick }) => {
  return (
    <Button className="HeaderButton" variant="secondary" onClick={onClick}>
      <FontAwesomeIcon icon={faCog} size="lg" />
    </Button>
  )
}

export default SettingsButton
