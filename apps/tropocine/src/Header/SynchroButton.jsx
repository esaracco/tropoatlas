import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Form } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSync } from "@fortawesome/free-solid-svg-icons"
import { ConfirmModal } from "@tropo/react"
import { useAppStore } from "@tropo/core"
import { syncCollection } from "../utils/sync"
import "./styles/SynchroButton.css"

const SynchroButton = () => {
  const isOnline = useAppStore((s) => s.isOnline)
  const isSyncing = useAppStore((s) => s.isSyncing)
  const [showModal, setShowModal] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(false)
  const { t } = useTranslation()

  const onConfirm = async () => {
    setShowModal(false)
    await syncCollection({ forceRefresh })
  }

  return (
    isOnline && (
      <>
        <ConfirmModal
          action={onConfirm}
          show={showModal}
          setShow={setShowModal}
        >
          <p>
            {t(
              "The synchronization of your collection can take a few moments.",
            )}
          </p>
          <div
            className="mt-3 p-3 border rounded"
            style={{
              backgroundColor:
                "var(--tropo-surface, rgba(255, 255, 255, 0.05))",
            }}
          >
            <Form.Check
              type="checkbox"
              id="synchro-force-refresh"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              label={
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {t("Force full re-synchronization of all movies")}
                  </div>
                  <div
                    style={{
                      color: "var(--tropo-text-muted)",
                      fontSize: "0.85rem",
                      marginTop: "2px",
                    }}
                  >
                    {t(
                      "Otherwise, only added or removed movies will be processed",
                    )}
                  </div>
                </div>
              }
            />
          </div>
        </ConfirmModal>
        <Button
          className="HeaderButton"
          variant="secondary"
          disabled={isSyncing}
          onClick={() => setShowModal(true)}
        >
          <FontAwesomeIcon icon={faSync} size="lg" spin={isSyncing} />
        </Button>
      </>
    )
  )
}

export default SynchroButton
