import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "react-bootstrap"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSync } from "@fortawesome/free-solid-svg-icons"

import { ConfirmModal } from "@tropo/react"
import { useAppStore } from "@tropo/core"
import { clearAllCaches } from "../utils/storage"

import "./styles/SynchroButton.css"

// COMPONENT SynchroButton
const SynchroButton = () => {
  const isOnline = useAppStore((s) => s.isOnline)
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation()

  // METHOD onConfirm()
  const onConfirm = async () => {
    await clearAllCaches()
    window.location.reload()
  }

  // RENDER
  return (
    isOnline && (
      <>
        <ConfirmModal
          action={onConfirm}
          show={showModal}
          setShow={setShowModal}
        >
          {t(
            "The synchronization of your collection can take several minutes.",
          )}
        </ConfirmModal>
        <Button
          className="HeaderButton"
          variant="secondary"
          onClick={() => setShowModal(true)}
        >
          <FontAwesomeIcon icon={faSync} size="lg" />
        </Button>
      </>
    )
  )
}

export default SynchroButton
