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
  const [_] = useTranslation()

  // EFFECT
  useEffect(() => {
    setNoResult(false)

    // First synchro or fetching album's data for the first time
    if (loading) {
      setInfo(_("Synchronization in progress..."))
      // Search ok
    } else if (displayCount > 0) {
      // Method _getSortLabel()
      const _getSortLabel = (s) => {
        const [field, dir] = s.split("_")
        let label = ""
        switch (field) {
          case "added":
            label = _("Date added")
            break
          case "artist":
            label = _("Artist")
            break
          case "rating":
            label = _("Note")
            break
          case "year":
            label = _("Year")
            break
          case "place":
            label = _("Location")
            break
          default:
        }
        return (
          <>
            <FontAwesomeIcon
              icon={dir === "desc" ? faChevronDown : faChevronUp}
              style={{ marginRight: "5px" }}
            />
            {label}
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
          <b>{displayCount}</b> {_(displayCount > 1 ? "albums" : "album")}{" "}
          <b>{effectiveCategories.join(", ")}</b>{" "}
          {effectiveCreators.length ? (
            <>
              {_("of")} <b>{effectiveCreators.join(", ")}</b>
            </>
          ) : (
            ""
          )}{" "}
          {_("by")} <b>{_getSortLabel(sort)}</b>
        </>,
      )
      // No result
    } else if (Object.keys(items).length > 0) {
      setNoResult(true)
      // Synchro failed or empty collection
    } else if (!loading) {
      setInfo(_("Synchronization failed!"))
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
    _,
  ])

  // RENDER
  return (
    !loading && (
      <div className={`InfoBar ${noResult ? "noresult" : ""}`}>
        {noResult ? _("No result") : info}
      </div>
    )
  )
}

export default InfoBar
