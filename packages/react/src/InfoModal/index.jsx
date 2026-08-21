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
  const { t, i18n } = useTranslation()

  // METHOD onHide()
  const onHide = () => setShow(false)

  // RENDER
  return (
    <Modal show={show} onHide={onHide} scrollable size="lg" {...rest}>
      <Modal.Header closeButton={closeButton}>
        <Modal.Title>{title || t("Information")}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-justify" lang={i18n.language}>
        {children}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide}>{t("Close")}</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default InfoModal
