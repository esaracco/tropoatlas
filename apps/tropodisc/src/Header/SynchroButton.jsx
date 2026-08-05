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
  const loading = useAppStore((s) => s.loading)
  const isOnline = useAppStore((s) => s.isOnline)
  const [showModal, setShowModal] = useState(false)
  const [_] = useTranslation()

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
          {_(
            "The full synchronization of your collection can take several minutes.",
          )}
        </ConfirmModal>
        <Button
          className="HeaderButton"
          variant="secondary"
          onClick={() => setShowModal(true)}
          disabled={loading}
        >
          <FontAwesomeIcon icon={faSync} size="lg" spin={loading} />
        </Button>
      </>
    )
  )
}

export default SynchroButton
