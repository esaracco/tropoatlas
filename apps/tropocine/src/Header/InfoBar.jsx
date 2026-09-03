import React, { useState, useEffect } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons"

import "./styles/InfoBar.css"

import { useAppStore } from "@tropo/core"

const InfoBar = () => {
  const loading = useAppStore((s) => s.loading)
  const displayCount = useAppStore((s) => s.displayCount)
  const [info, setInfo] = useState("")
  const [noResult, setNoResult] = useState(false)
  const sort = useCollectionStore((s) => s.sort)
  const categories = useCollectionStore((s) => s.categories)
  const creators = useCollectionStore((s) => s.creators)
  const selected = useCollectionStore((s) => s.selected)
  const items = useCollectionStore((s) => s.items)
  const { t } = useTranslation()
  const isOnline = useAppStore((s) => s.isOnline)

  useEffect(() => {
    setNoResult(false)

    // First synchro or fetching movie data for the first time
    if (loading) {
      setInfo(t("Synchronization in progress..."))
    } else if (displayCount > 0) {
      const getSortLabel = (s) => {
        const [field, dir] = (s || "added_desc").split("_")
        let label = ""
        switch (field) {
          case "added":
            label = t("Date added")
            break
          case "creator":
            label = t("Director")
            break
          case "title":
            label = t("Movie")
            break
          case "rating":
            label = t("Rating")
            break
          case "year":
            label = t("Year")
            break
          default:
            label = t("Date added")
            break
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

      const effectiveCategories = (selected.categories || []).filter((c) =>
        categories.includes(c),
      )
      const effectiveCreators = (selected.creators || []).filter((c) =>
        creators.includes(c),
      )

      setInfo(
        <>
          <b>{displayCount}</b> {t(displayCount > 1 ? "movies" : "movie")}{" "}
          <b>{effectiveCategories.join(", ")}</b>{" "}
          {effectiveCreators.length ? (
            <>
              {t("by")} <b>{effectiveCreators.join(", ")}</b>
            </>
          ) : (
            ""
          )}{" "}
          {t("by")} <b>{getSortLabel(sort)}</b>
        </>,
      )
    } else if (Object.keys(items || {}).length > 0) {
      setNoResult(true)
    } else if (!loading) {
      setInfo(t("Synchronization failed!"))
    }
  }, [
    loading,
    displayCount,
    selected.creators,
    selected.categories,
    sort,
    categories,
    items,
    creators,
    t,
  ])

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
