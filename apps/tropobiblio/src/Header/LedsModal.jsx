import React, { useState } from "react"
import { Modal, Button, Container } from "react-bootstrap"
import { useTranslation } from "react-i18next"
import { useAppStore, useCollectionStore } from "@tropo/core"
import { ledsClient } from "../utils/leds"

// Component managing hardware LEDs and physical ruler state.
const LedsModal = ({ show, onHide }) => {
  const { t } = useTranslation()
  const setFromRuler = useAppStore((s) => s.setFromRuler)
  const clearFilters = useCollectionStore((s) => s.clearFilters)
  const selected = useCollectionStore((s) => s.selected)
  const [rulerShown, setRulerShown] = useState(false)

  // LEDs handlers
  const setRulerState = (state) => {
    if (state === rulerShown) return
    if (
      !rulerShown &&
      (selected.categories.length || selected.creators.length)
    ) {
      setFromRuler(true)
      clearFilters()
    }
    ledsClient.setRuler({ show: state }).catch(() => {})
    setRulerShown(state)
  }

  const handleResetLeds = () => {
    if (
      !rulerShown &&
      (selected.categories.length || selected.creators.length)
    ) {
      clearFilters()
    } else {
      ledsClient.setRuler({ show: false }).catch(() => {})
      setRulerShown(false)
    }
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      onExited={() => setRulerState(false)}
      scrollable
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title>{t("Leds control")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container className="d-flex justify-content-center">
          <div className="d-grid gap-2">
            <Button
              variant="primary"
              onClick={() => setRulerState(!rulerShown)}
            >
              {rulerShown ? t("Turn off the ruler") : t("Turn on the ruler")}
            </Button>
            <Button variant="primary" onClick={handleResetLeds}>
              {t("Reset")}
            </Button>
          </div>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide}>{t("Close")}</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default LedsModal
