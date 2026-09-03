import React, { useState, useEffect } from "react"
import { useCollectionStore, useAppStore } from "@tropo/core"
import { Button } from "react-bootstrap"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBroom } from "@fortawesome/free-solid-svg-icons"

const ClearFiltersButton = () => {
  const clearFilters = useCollectionStore((s) => s.clearFilters)
  const searchStr = useAppStore((s) => s.searchStr)
  const setSearchStr = useAppStore((s) => s.setSearchStr)

  const [display, setDisplay] = useState(false)
  const selected = useCollectionStore((s) => s.selected)

  useEffect(() => {
    setDisplay(
      !!(
        selected.categories?.length ||
        selected.creators?.length ||
        searchStr !== ""
      ),
    )
  }, [selected, searchStr])

  const onClick = () => {
    clearFilters()
    setSearchStr("")
  }

  return (
    display && (
      <Button variant="secondary" className="HeaderButton" onClick={onClick}>
        <FontAwesomeIcon icon={faBroom} />
      </Button>
    )
  )
}

export default ClearFiltersButton
