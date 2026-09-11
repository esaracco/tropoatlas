import React, { useState, useEffect } from "react"
import { useCollectionStore, useAppStore } from "@tropo/core"
import { Button } from "react-bootstrap"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBroom } from "@fortawesome/free-solid-svg-icons"

export const ClearFiltersButton = () => {
  const clearFilters = useCollectionStore((s) => s.clearFilters)
  const searchStr = useAppStore((s) => s.searchStr)
  const setSearchStr = useAppStore((s) => s.setSearchStr)

  const [display, setDisplay] = useState(false)
  const selected = useCollectionStore((s) => s.selected)

  // EFFECT
  useEffect(() => {
    setDisplay(
      !!(
        Object.values(selected).some((arr) => arr && arr.length > 0) ||
        searchStr !== ""
      ),
    )
  }, [selected, searchStr])

  // METHOD onClick()
  const onClick = () => {
    clearFilters()
    setSearchStr("")
  }

  // RENDER
  return (
    display && (
      <Button variant="secondary" className="HeaderButton" onClick={onClick}>
        <FontAwesomeIcon icon={faBroom} />
      </Button>
    )
  )
}
