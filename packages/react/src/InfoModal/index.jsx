import React from "react"
import { useTranslation } from "react-i18next"
import { Modal, Button } from "react-bootstrap"

// COMPONENT InfoModal
const InfoModal = ({
  title,
  children,
  show,
  setShow,
  closeButton = true,
  ...rest
}) => {
  const [_] = useTranslation()

  // METHOD onHide()
  const onHide = () => setShow(false)

  // RENDER
  return (
    <Modal show={show} onHide={onHide} scrollable size="lg" {...rest}>
      <Modal.Header closeButton={closeButton}>
        <Modal.Title>{title || _("Information")}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-justify">{children}</Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide}>{_("Close")}</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default InfoModal
