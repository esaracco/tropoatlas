import React, { useRef } from "react"
import { useTranslation } from "react-i18next"
import { ConfirmModal } from "@tropo/react"
import {
  useAppStore,
  useCollectionStore,
  importCollectionBackupZIP,
} from "@tropo/core"
import { toast } from "react-toastify"

// Component managing file picker and collection backup import.
const ImportBackupModal = ({ show, onHide, isBusy, setIsBusy }) => {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)

  // Import ZIP backup handler
  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    if (isBusy) return
    setIsBusy(true)
    const toastId = toast.loading(t("Importing backup..."))

    try {
      const { items, categories } = await importCollectionBackupZIP(
        file,
        (percent) => {
          toast.update(toastId, {
            render: `${t("Importing backup...")} ${percent}%`,
          })
        },
      )

      const setItems = useCollectionStore.getState().setItems
      const setCategories = useCollectionStore.getState().setCategories
      const setDisplayCount = useAppStore.getState().setDisplayCount

      setItems(items)
      setCategories(categories)
      setDisplayCount(Object.keys(items).length)

      if (toastId) toast.dismiss(toastId)
      toast.success(t("Backup imported successfully!"))
    } catch (err) {
      if (toastId) toast.dismiss(toastId)
      toast.error(`${t("Backup import failed:")} ${t(err.message)}`)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".zip"
        onChange={handleImportFileChange}
        style={{ display: "none" }}
      />

      <ConfirmModal
        action={() => {
          onHide()
          fileInputRef.current?.click()
        }}
        show={show}
        setShow={onHide}
      >
        {t(
          "Are you sure you want to import a collection ZIP file? This will overwrite existing local data.",
        )}
      </ConfirmModal>
    </>
  )
}

export default ImportBackupModal
