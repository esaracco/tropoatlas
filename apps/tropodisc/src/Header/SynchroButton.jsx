import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "react-bootstrap"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSync } from "@fortawesome/free-solid-svg-icons"

import { ConfirmModal } from "@tropo/react"

import { clearAllCaches } from "@tropo/core"

import "./styles/SynchroButton.css"

import { useAppStore } from "@tropo/core"

// COMPONENT SynchroButton
const SynchroButton = () => {
  const isOnline = useAppStore((s) => s.isOnline)
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation()

  // METHOD onConfirm()
  const onConfirm = async () => {
    await clearAllCaches([
      "i18nextLng",
      "tropodisc-theme",
      "tropodisc-ui-storage-v2",
    ])
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
