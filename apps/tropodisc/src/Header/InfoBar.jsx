import React, { useState, useEffect } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons"

import "./styles/InfoBar.css"

import { useAppStore } from "@tropo/core"

// COMPONENT InfoBar
const InfoBar = () => {
  const loading = useAppStore((s) => s.loading)
  const displayCount = useAppStore((s) => s.displayCount)
  const [info, setInfo] = useState("")
  const [noResult, setNoResult] = useState(false)
  const sort = useCollectionStore((s) => s.sort)
  const styles = useCollectionStore((s) => s.categories)
  const creators = useCollectionStore((s) => s.creators)
  const selected = useCollectionStore((s) => s.selected)
  const items = useCollectionStore((s) => s.items)
  const { t } = useTranslation()
  const isOnline = useAppStore((s) => s.isOnline)

  // EFFECT
  useEffect(() => {
    setNoResult(false)

    // First synchro or fetching album's data for the first time
    if (loading) {
      setInfo(t("Synchronization in progress..."))
      // Search ok
    } else if (displayCount > 0) {
      // Method _getSortLabel()
      const _getSortLabel = (s) => {
        const [field, dir] = s.split("_")
        let label = ""
        switch (field) {
          case "added":
            label = t("Date added")
            break
          case "artist":
            label = t("Artist")
            break
          case "rating":
            label = t("Note")
            break
          case "year":
            label = t("Year")
            break
          case "place":
            label = t("Location")
            break
          default:
        }
        return (
          <>
            {label}
            <FontAwesomeIcon
              icon={dir === "desc" ? faChevronDown : faChevronUp}
              style={{ marginRight: "5px" }}
            />
          </>
        )
      }

      const effectiveCategories = selected.categories.filter((c) =>
        styles.includes(c),
      )
      const effectiveCreators = selected.creators.filter((c) =>
        creators.includes(c),
      )

      setInfo(
        <>
          <b>{displayCount}</b> {t(displayCount > 1 ? "albums" : "album")}{" "}
          <b>{effectiveCategories.join(", ")}</b>{" "}
          {effectiveCreators.length ? (
            <>
              {t("of")} <b>{effectiveCreators.join(", ")}</b>
            </>
          ) : (
            ""
          )}{" "}
          {t("by")} <b>{_getSortLabel(sort)}</b>
        </>,
      )
      // No result
    } else if (Object.keys(items).length > 0) {
      setNoResult(true)
      // Synchro failed or empty collection
    } else if (!loading) {
      setInfo(t("Synchronization failed!"))
    }
  }, [
    loading,
    displayCount,
    selected.creators,
    selected.categories,
    sort,
    styles,
    items,
    creators,
    t,
  ])

  // RENDER
  return (
    !loading && (
      <div
        className={`InfoBar d-flex flex-column ${noResult ? "noresult" : ""}`}
      >
        {!isOnline && (
          <div className="w-100 text-center mb-1">
            <span className="offline-badge">{t("Offline mode")}</span>
          </div>
        )}
        <div className="w-100 text-center">
          {noResult ? t("No result") : info}
        </div>
      </div>
    )
  )
}

export default InfoBar
