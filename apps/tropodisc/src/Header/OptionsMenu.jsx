import React, { useState } from "react"
import { Dropdown, Modal, Button, Container } from "react-bootstrap"
import { useTranslation } from "react-i18next"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCog,
  faSliders,
  faSync,
  faLightbulb,
  faPalette,
  faInfoCircle,
  faLanguage,
} from "@fortawesome/free-solid-svg-icons"
import { ConfirmModal, ThemeSelector, LanguageSelector } from "@tropo/react"
import { useAppStore, useCollectionStore, clearAllCaches } from "@tropo/core"
import * as Settings from "../utils/settings"
import { ledsClient } from "../utils/leds"

const OptionsMenu = ({ onOpenSettings }) => {
  const { t } = useTranslation()
  const isOnline = useAppStore((s) => s.isOnline)
  const setShowAbout = useAppStore((s) => s.setShowAbout)
  const setFromRuler = useAppStore((s) => s.setFromRuler)
  const clearFilters = useCollectionStore((s) => s.clearFilters)
  const selected = useCollectionStore((s) => s.selected)

  // Sync Modal State
  const [showSyncModal, setShowSyncModal] = useState(false)

  // LEDs Modal State
  const [showLedsModal, setShowLedsModal] = useState(false)
  const [rulerShown, setRulerShown] = useState(false)

  // Sync handler
  const onConfirmSync = async () => {
    await clearAllCaches([
      "i18nextLng",
      "tropodisc-theme",
      "tropodisc-ui-storage-v2",
    ])
    window.location.reload()
  }

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
    ledsClient.setRuler({ show: state })
    setRulerShown(state)
  }

  const handleResetLeds = () => {
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

  return (
    <>
      {isOnline && (
        <ConfirmModal
          action={onConfirmSync}
          show={showSyncModal}
          setShow={setShowSyncModal}
        >
          {t(
            "The synchronization of your collection can take several minutes.",
          )}
        </ConfirmModal>
      )}

      {Settings.setLeds === "yes" && (
        <Modal
          show={showLedsModal}
          onHide={() => setShowLedsModal(false)}
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
                <Button variant="primary" onClick={handleResetLeds}>
                  {t("Reset")}
                </Button>
              </div>
            </Container>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => setShowLedsModal(false)}>
              {t("Close")}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      <Dropdown align="end" className="options-menu-dropdown me-1">
        <Dropdown.Toggle
          variant="secondary"
          className="HeaderButton border-0 d-flex align-items-center justify-content-center"
          id="options-dropdown"
          aria-label={t("Options")}
        >
          <FontAwesomeIcon icon={faCog} size="lg" />
        </Dropdown.Toggle>

        <Dropdown.Menu className="shadow-lg border-secondary py-2 options-menu-popover">
          {isOnline && (
            <Dropdown.Item
              onClick={() => setShowSyncModal(true)}
              className="d-flex align-items-center gap-2 py-2"
            >
              <FontAwesomeIcon icon={faSync} className="options-menu-icon" />
              <span>{t("Sync collection")}</span>
            </Dropdown.Item>
          )}

          <Dropdown.Item
            onClick={onOpenSettings}
            className="d-flex align-items-center gap-2 py-2"
          >
            <FontAwesomeIcon icon={faSliders} className="options-menu-icon" />
            <span>{t("Settings")}</span>
          </Dropdown.Item>

          {Settings.setLeds === "yes" && isOnline && (
            <Dropdown.Item
              onClick={() => setShowLedsModal(true)}
              className="d-flex align-items-center gap-2 py-2"
            >
              <FontAwesomeIcon
                icon={faLightbulb}
                className="options-menu-icon"
              />
              <span>{t("Leds control")}</span>
            </Dropdown.Item>
          )}

          <Dropdown.Item
            onClick={() => setShowAbout(true)}
            className="d-flex align-items-center gap-2 py-2"
          >
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="options-menu-icon"
            />
            <span>{t("About")}</span>
          </Dropdown.Item>

          <Dropdown.Divider />

          <div className="px-3 py-1 d-flex align-items-center justify-content-between gap-3">
            <span className="options-menu-theme-label d-flex align-items-center gap-2">
              <FontAwesomeIcon icon={faPalette} className="options-menu-icon" />
              <span>{t("Theme")}</span>
            </span>
            <ThemeSelector
              storageKey="tropodisc-theme"
              title={t("Theme")}
              ariaLabel={t("Change theme")}
            />
          </div>

          <div className="px-3 py-1 d-flex align-items-center justify-content-between gap-3">
            <span className="options-menu-language-label d-flex align-items-center gap-2">
              <FontAwesomeIcon
                icon={faLanguage}
                className="options-menu-icon"
              />
              <span>{t("Language")}</span>
            </span>
            <LanguageSelector ariaLabel={t("Change language")} />
          </div>
        </Dropdown.Menu>
      </Dropdown>
    </>
  )
}

export default OptionsMenu
