import React, { useState } from "react"
import { Button } from "react-bootstrap"

import ButtonModal from "./index.jsx"

import "./HeaderButton.css"

// COMPONENT HeaderButton
const HeaderButton = (props) => {
  const { label, selected = {}, stype, mark = true } = props
  const [modalShow, setModalShow] = useState(false)

  // RENDER
  return (
    <>
      <Button
        variant="warning"
        className="HeaderButton"
        onClick={() => setModalShow(true)}
      >
        {label}
        {mark &&
          selected &&
          stype &&
          selected[stype] &&
          selected[stype].length > 0 && <div className="selected-mark"></div>}
      </Button>
      <ButtonModal
        {...props}
        show={modalShow}
        onHide={() => setModalShow(false)}
      />
    </>
  )
}

export default HeaderButton
