import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Modal, Button } from "react-bootstrap"

import "./ConfirmModal.css"

// COMPONENT ConfirmModal
const ConfirmModal = ({ children, action, show, setShow }) => {
  const [_] = useTranslation()
  const [hasShadow, setHasShadow] = useState(false)

  useEffect(() => {
    if (show) {
      setHasShadow(document.querySelectorAll(".modal.show").length > 0)
    } else {
      setHasShadow(false)
    }
  }, [show])

  // METHOD onHide()
  const onHide = () => setShow(false)

  // RENDER
  return (
    <Modal
      show={show}
      onHide={onHide}
      scrollable
      size="lg"
      contentClassName={`ConfirmModal ${hasShadow ? "with-shadow" : ""}`}
    >
      <Modal.Header>
        <Modal.Title>{_("Confirmation")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button onClick={action} variant="primary">
          {_("Confirm")}
        </Button>
        <Button onClick={onHide} variant="secondary">
          {_("Cancel")}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ConfirmModal
