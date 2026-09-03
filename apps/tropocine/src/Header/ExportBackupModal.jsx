import React, { useState, useRef, useEffect } from "react"
import { Modal, Button, ProgressBar } from "react-bootstrap"
import { useTranslation } from "react-i18next"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClock, faCheckCircle } from "@fortawesome/free-solid-svg-icons"
import { ConfirmModal } from "@tropo/react"
import {
  useCollectionStore,
  exportCollectionBackupZIP,
  estimateExportBackupDuration,
  formatDuration,
} from "@tropo/core"
import { toast } from "react-toastify"
import {
  getItemDetails,
  getItemImage,
  getImageProxyUrl,
  getMaxRequestsPerMinute,
} from "../provider"

// Component managing export confirmation, duration estimation, and progress.
const ExportBackupModal = ({ show, onHide, isBusy, setIsBusy }) => {
  const { t } = useTranslation()
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [exportStats, setExportStats] = useState({
    missingDetailsCount: 0,
    missingCoversCount: 0,
    totalNetworkCalls: 0,
    estimatedSeconds: 0,
  })
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [exportProgress, setExportProgress] = useState({
    percent: 0,
    remainingSeconds: 0,
  })
  const abortControllerRef = useRef(null)

  // Calculate estimated time when export confirmation modal opens
  useEffect(() => {
    if (show) {
      setIsLoadingStats(true)
      const items = useCollectionStore.getState().items
      estimateExportBackupDuration({
        items,
        maxRequestsPerMinute: getMaxRequestsPerMinute(),
      })
        .then((stats) => {
          setExportStats(stats)
        })
        .finally(() => {
          setIsLoadingStats(false)
        })
    }
  }, [show])

  // Export ZIP backup handler
  const handleExportBackup = async () => {
    if (isBusy) return
    setIsBusy(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setShowProgressModal(true)
    setExportProgress({
      percent: 0,
      remainingSeconds: exportStats.estimatedSeconds,
    })

    try {
      const result = await exportCollectionBackupZIP({
        enrichMissing: true,
        getItemDetails,
        getItemImage,
        getImageProxyUrl,
        maxRequestsPerMinute: getMaxRequestsPerMinute(),
        signal: abortController.signal,
        onProgress: (percent, status = {}) => {
          setExportProgress({
            percent,
            remainingSeconds: status.remainingSeconds || 0,
          })
        },
      })

      const failedCount = result?.failedItemsCount || 0

      if (failedCount > 0) {
        const warningMsg = t(
          "Backup exported, but {{count}} item(s) could not be enriched due to network errors.",
          { count: failedCount },
        )
        toast.warning(warningMsg, { autoClose: 6000 })
      } else {
        toast.success(t("Backup exported successfully!"))
      }
    } catch (err) {
      if (
        err.message === "Export cancelled" ||
        abortController.signal.aborted
      ) {
        toast.info(t("Export cancelled"))
      } else {
        toast.error(`${t("Export failed:")} ${t(err.message)}`)
      }
    } finally {
      setIsBusy(false)
      setShowProgressModal(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  return (
    <>
      <ConfirmModal
        action={() => {
          onHide()
          handleExportBackup()
        }}
        show={show}
        setShow={onHide}
      >
        <p className="mb-2">
          {t("Are you sure you want to export your collection to a ZIP file?")}
        </p>
        <div className="mt-3 export-estimation-box d-flex align-items-center gap-2">
          <FontAwesomeIcon
            icon={
              isLoadingStats
                ? faClock
                : exportStats.totalNetworkCalls > 0
                  ? faClock
                  : faCheckCircle
            }
            className="estimation-icon"
          />
          <div>
            {isLoadingStats ? (
              <span className="estimation-label">
                {t("Calculating estimated time...")}
              </span>
            ) : exportStats.totalNetworkCalls > 0 ? (
              <span>
                <strong className="estimation-label">
                  {t("Estimated time:")}
                </strong>{" "}
                <span className="estimation-value">
                  {formatDuration(exportStats.estimatedSeconds, t)}
                </span>
              </span>
            ) : (
              <span className="estimation-label">
                {t("All data and covers are already cached.")}
              </span>
            )}
          </div>
        </div>
      </ConfirmModal>

      <Modal
        show={showProgressModal}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header>
          <Modal.Title>{t("Exporting collection...")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="export-progressbar-wrapper">
            <ProgressBar now={exportProgress.percent} animated />
            <span className="export-progressbar-label">
              {exportProgress.percent}%
            </span>
          </div>

          {exportProgress.remainingSeconds > 0 ? (
            <div className="text-center mt-3 export-progress-time">
              <FontAwesomeIcon
                icon={faClock}
                className="estimation-icon me-2"
              />
              <strong className="estimation-label">
                {t("Estimated remaining time:")}
              </strong>{" "}
              <span className="time-value">
                {formatDuration(exportProgress.remainingSeconds, t)}
              </span>
            </div>
          ) : exportProgress.percent >= 70 ? (
            <div className="text-center mt-3 export-progress-time">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="text-success me-2"
              />
              <span className="estimation-label">
                {t("Finalizing ZIP archive...")}
              </span>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelExport}>
            {t("Cancel")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default ExportBackupModal
