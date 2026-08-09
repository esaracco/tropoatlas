import React, { useEffect, useRef } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"

import Tagify from "@yaireo/tagify"

import { getItem } from "@tropo/core"

import "@yaireo/tagify/dist/tagify.css"
import "./styles/AlbumStyleButtons.css"

// COMPONENT AlbumStyleButtons
const AlbumStyleButtons = ({ items, closeModal }) => {
  const setFilter = useCollectionStore((s) => s.setFilter)
  const styles = useCollectionStore((s) => s.categories)
  const [_] = useTranslation()
  const tags = useRef(null)
  const customFields = getItem("customFieldsInfo") || {}

  // EFFECT
  useEffect(() => {
    if (!tags.current) {
      tags.current = new Tagify(document.querySelector(".AlbumStyleButtons"), {
        whitelist: styles,
        callbacks: {
          click: (e) => {
            setFilter("creators", [])
            setFilter("categories", [e.detail.data.value])
            closeModal()
          },
        },
      })
    }

    // Destroy Tagify instance on unmount
    return () => {
      if (tags.current) {
        tags.current.destroy()
        tags.current = null
      }
    }
  }, [])

  // RENDER
  return (
    <>
      <input
        className="AlbumStyleButtons"
        readOnly={!customFields.supportsCategories}
        placeholder={_("New style...")}
        defaultValue={JSON.stringify(items.map((item) => ({ value: item })))}
      />
    </>
  )
}

export default AlbumStyleButtons
