import React, { useState } from "react"
import { Dropdown, Form } from "react-bootstrap"
import { useTranslation } from "react-i18next"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCog,
  faSliders,
  faSync,
  faPalette,
  faInfoCircle,
  faLanguage,
  faDownload,
  faUpload,
} from "@fortawesome/free-solid-svg-icons"
import { ConfirmModal, ThemeSelector, LanguageSelector } from "@tropo/react"
import { useAppStore, useSettingsStore, getItem } from "@tropo/core"
import { syncCollection } from "../utils/sync"
import { plugin } from "../provider"
import ExportBackupModal from "./ExportBackupModal"
import ImportBackupModal from "./ImportBackupModal"

const OptionsMenu = ({ onOpenSettings }) => {
  const { t } = useTranslation()
  const isOnline = useAppStore((s) => s.isOnline)
  const isSyncing = useAppStore((s) => s.isSyncing)
  const setShowAbout = useAppStore((s) => s.setShowAbout)

  const [isBackupBusy, setIsBackupBusy] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(false)

  const tmdbListId = useSettingsStore(
    (s) => s.pluginsConfig?.tmdb?.listId ?? import.meta.env.VITE_TMDB_LIST_ID,
  )
  const currentCleanId = plugin.cleanListId(tmdbListId)
  const previousListId =
    getItem("syncedListId") ||
    plugin.cleanListId(import.meta.env.VITE_TMDB_LIST_ID)
  const isListChanged = Boolean(
    previousListId && currentCleanId && previousListId !== currentCleanId,
  )

  const onConfirmSync = async () => {
    setShowSyncModal(false)
    await syncCollection({ forceRefresh: isListChanged || forceRefresh })
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
          {!isListChanged && (
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
          )}
        </ConfirmModal>
      )}

      <ExportBackupModal
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        isBusy={isBackupBusy}
        setIsBusy={setIsBackupBusy}
      />

      <ImportBackupModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        isBusy={isBackupBusy}
        setIsBusy={setIsBackupBusy}
      />

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

          <Dropdown.Item
            onClick={onOpenSettings}
            className="d-flex align-items-center gap-2 py-2"
          >
            <FontAwesomeIcon icon={faSliders} className="options-menu-icon" />
            <span>{t("Settings")}</span>
          </Dropdown.Item>

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
              storageKey="tropocine-theme"
              defaultTheme="blue"
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
