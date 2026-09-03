import React, { useState } from "react"
import { Button, Container, Modal } from "react-bootstrap"
import { useTranslation } from "react-i18next"
import { useCollectionStore } from "@tropo/core"

import { ledsClient } from "../utils/leds"

import { useAppStore } from "@tropo/core"

// COMPONENT LedsButton
const LedsButton = () => {
  const setFromRuler = useAppStore((s) => s.setFromRuler)
  const isOnline = useAppStore((s) => s.isOnline)
  const [modalShow, setModalShow] = useState(false)
  const [rulerShown, setRulerShown] = useState(false)

  const clearFilters = useCollectionStore((s) => s.clearFilters)

  const selected = useCollectionStore((s) => s.selected)
  const { t } = useTranslation()

  const setRulerState = (state) => {
    if (state === rulerShown) return
    if (
      !rulerShown &&
      (selected.categories.length || selected.creators.length)
    ) {
      setFromRuler(true)
      clearFilters()
    }
    ledsClient.setRuler({ show: state })
    setRulerShown(state)
  }

  const handleReset = () => {
    if (
      !rulerShown &&
      (selected.categories.length || selected.creators.length)
    ) {
      clearFilters()
    } else {
      ledsClient.setRuler({ show: false })
      setRulerShown(false)
    }
  }

  // RENDER
  return (
    isOnline && (
      <>
        <Button
          variant="primary"
          className="HeaderButton"
          onClick={() => setModalShow(true)}
        >
          {t("Leds")}
        </Button>

        <Modal
          show={modalShow}
          onHide={() => setModalShow(false)}
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
                  {rulerShown
                    ? t("Turn off the ruler")
                    : t("Turn on the ruler")}
                </Button>
                <Button variant="primary" onClick={handleReset}>
                  {t("Reset")}
                </Button>
              </div>
            </Container>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => setModalShow(false)}>{t("Close")}</Button>
          </Modal.Footer>
        </Modal>
      </>
    )
  )
}

export default LedsButton
