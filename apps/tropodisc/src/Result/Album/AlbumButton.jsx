import React, { useState, useEffect } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { Button } from "react-bootstrap"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUser } from "@fortawesome/free-solid-svg-icons"

import "./styles/AlbumButton.css"

// COMPONENT AlbumButton
const AlbumButton = ({ artist, closeModal }) => {
  const setFilter = useCollectionStore((s) => s.setFilter)
  const releases = useCollectionStore((s) => s.items)
  const [count, setCount] = useState(0)
  const [_] = useTranslation()

  // METHOD onClick()
  const onClick = () => {
    setFilter("creators", [artist])
    closeModal()
  }

  // EFFECT
  useEffect(() => {
    let c = 0
    if (releases) {
      for (const key in releases) {
        if (
          releases[key].creator === artist ||
          releases[key].artist === artist
        ) {
          c++
        }
      }
    }
    setCount(c)
  }, [artist, releases])

  // RENDER
  return (
    count > 1 && (
      <div className="AlbumButton">
        <Button
          size="sm"
          variant="primary"
          onClick={onClick}
          title={_("Show all {{count}} albums by {{artist}}", {
            count,
            artist,
          })}
        >
          <FontAwesomeIcon icon={faUser} /> <b>{count}</b>{" "}
          <span>{_("albums")}</span>
        </Button>
      </div>
    )
  )
}

export default AlbumButton
