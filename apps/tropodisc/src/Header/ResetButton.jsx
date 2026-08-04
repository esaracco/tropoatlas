import React, { useState, useEffect } from "react"
import { useCollectionStore } from "@tropo/core"
import { Button } from "react-bootstrap"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBroom } from "@fortawesome/free-solid-svg-icons"

// COMPONENT ResetButton
const ResetButton = () => {
  const clearFilters = useCollectionStore((s) => s.clearFilters)

  const [display, setDisplay] = useState(false)
  const selected = useCollectionStore((s) => s.selected)

  // EFFECT
  useEffect(() => {
    setDisplay(
      !!(
        selected.categories.length ||
        selected.creators.length ||
        selected.formats.length
      ),
    )
  }, [selected])

  // RENDER
  return (
    display && (
      <Button
        variant="secondary"
        size="sm"
        className="HeaderButton"
        onClick={() => clearFilters()}
      >
        <FontAwesomeIcon icon={faBroom} />
      </Button>
    )
  )
}

export default ResetButton
