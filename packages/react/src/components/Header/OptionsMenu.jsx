import React, { useState } from "react"
import { Dropdown, Form } from "react-bootstrap"
import { useTranslation } from "react-i18next"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCog,
  faSync,
  faLightbulb,
  faPalette,
  faInfoCircle,
  faLanguage,
  faDownload,
  faUpload,
} from "@fortawesome/free-solid-svg-icons"
import ConfirmModal from "../../ConfirmModal/index.jsx"
import ThemeSelector from "../../ThemeSelector/index.jsx"
import LanguageSelector from "../../LanguageSelector/index.jsx"
import { useAppStore, syncCollection, getPluginTerminology } from "@tropo/core"
import { toast } from "react-toastify"
import { ExportBackupModal } from "./ExportBackupModal"
import { ImportBackupModal } from "./ImportBackupModal"
import { LedsModal } from "./LedsModal"

export const OptionsMenu = ({
  plugin,
  setLeds,
  ledsClient,
  themeStorageKey,
  appName,
}) => {
  const { t } = useTranslation()
  const terminology = getPluginTerminology(plugin)
  const isOnline = useAppStore((s) => s.isOnline)
  const isSyncing = useAppStore((s) => s.isSyncing)
  const setShowAbout = useAppStore((s) => s.setShowAbout)

  const [isBackupBusy, setIsBackupBusy] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showLedsModal, setShowLedsModal] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(false)

  // Sync handler
  const onConfirmSync = async () => {
    setShowSyncModal(false)
    await syncCollection({
      plugin,
      forceRefresh,
      onWarning: (msg, params) =>
        toast.warn(t(msg, params), { autoClose: false }),
      onError: (msg, params) =>
        toast.error(t(msg, params), { autoClose: false }),
    })
  }

  return (
    <>
      {isOnline && (
        <ConfirmModal
          action={onConfirmSync}
          show={showSyncModal}
          setShow={setShowSyncModal}
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
              id="options-synchro-force-refresh"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              label={
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {t("Force full re-synchronization of all {{items}}", {
                      items: t(terminology.items),
                    })}
                  </div>
                  <div
                    style={{
                      color: "var(--tropo-text-muted)",
                      fontSize: "0.85rem",
                      marginTop: "2px",
                    }}
                  >
                    {t(
                      "Otherwise, only added or removed {{items}} will be processed",
                      {
                        items: t(terminology.items),
                      },
                    )}
                  </div>
                </div>
              }
            />
          </div>
        </ConfirmModal>
      )}

      <ExportBackupModal
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        isBusy={isBackupBusy}
        setIsBusy={setIsBackupBusy}
        plugin={plugin}
        appName={appName}
      />

      <ImportBackupModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        isBusy={isBackupBusy}
        setIsBusy={setIsBackupBusy}
      />

      {setLeds && isOnline && (
        <LedsModal
          show={showLedsModal}
          onHide={() => setShowLedsModal(false)}
          ledsClient={ledsClient}
        />
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
              disabled={isSyncing}
              className="d-flex align-items-center gap-2 py-2"
            >
              <FontAwesomeIcon
                icon={faSync}
                className="options-menu-icon"
                spin={isSyncing}
              />
              <span>{t("Sync collection")}</span>
            </Dropdown.Item>
          )}

          {setLeds && isOnline && (
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

          <Dropdown.Item
            onClick={() => setShowExportModal(true)}
            disabled={isBackupBusy}
            className="d-flex align-items-center gap-2 py-2"
          >
            <FontAwesomeIcon icon={faDownload} className="options-menu-icon" />
            <span>{t("Export collection")}</span>
          </Dropdown.Item>

          <Dropdown.Item
            onClick={() => setShowImportModal(true)}
            disabled={isBackupBusy}
            className="d-flex align-items-center gap-2 py-2"
          >
            <FontAwesomeIcon icon={faUpload} className="options-menu-icon" />
            <span>{t("Import backup")}</span>
          </Dropdown.Item>

          <Dropdown.Divider />

          <div className="px-3 py-1 d-flex align-items-center justify-content-between gap-3">
            <span className="options-menu-theme-label d-flex align-items-center gap-2">
              <FontAwesomeIcon icon={faPalette} className="options-menu-icon" />
              <span>{t("Theme")}</span>
            </span>
            <ThemeSelector
              storageKey={themeStorageKey || "tropo-theme"}
              defaultTheme="orange"
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
