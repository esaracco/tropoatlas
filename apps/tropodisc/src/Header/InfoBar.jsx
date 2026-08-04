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
  const selected = useCollectionStore((s) => s.selected)
  const [_] = useTranslation()

  // EFFECT
  useEffect(() => {
    setNoResult(false)

    // First synchro or fetching album's data for the first time
    if (loading) {
      setInfo(_("Synchronization in progress..."))
      // Search ok
    } else if (styles.length && displayCount) {
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

      setInfo(
        <>
          <b>{displayCount}</b> {_(displayCount > 1 ? "albums" : "album")}{" "}
          <b>{selected.categories.join(", ")}</b>{" "}
          {selected.creators.length ? (
            <>
              {_("of")} <b>{selected.creators.join(", ")}</b>
            </>
          ) : (
            ""
          )}{" "}
          {_("by")} <b>{_getSortLabel(sort)}</b>
        </>,
      )
      // No result
    } else if (styles.length) {
      setNoResult(true)
      // Synchro failed
    } else if (!loading) {
      setInfo(_("Synchronization failed!"))
    }
  }, [
    loading,
    displayCount,
    selected.creators,
    selected.categories,
    sort,
    styles.length,
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
