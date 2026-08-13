import React, { useEffect, useRef } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { InputGroup } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPen } from "@fortawesome/free-solid-svg-icons"

import Tagify from "@yaireo/tagify"

import { getItem } from "@tropo/core"

import "@yaireo/tagify/dist/tagify.css"
import "./styles/AlbumStyleButtons.css"

// COMPONENT AlbumStyleButtons
const AlbumStyleButtons = ({ categories, closeModal }) => {
  const setFilter = useCollectionStore((s) => s.setFilter)
  const availableCategories = useCollectionStore((s) => s.categories)
  const { t } = useTranslation()
  const tags = useRef(null)
  const customFields = getItem("customFieldsInfo") || {}

  // EFFECT
  useEffect(() => {
    if (!tags.current) {
      tags.current = new Tagify(document.querySelector(".AlbumStyleButtons"), {
        whitelist: availableCategories,
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

  const initialValues = (categories || []).map((item) => ({ value: item }))

  // RENDER
  return (
    <InputGroup size="sm" className="style-input-group">
      {customFields.supportsCategories && (
        <InputGroup.Text className="style-icon-addon">
          <FontAwesomeIcon icon={faPen} />
        </InputGroup.Text>
      )}
      <input
        className="AlbumStyleButtons"
        readOnly={!customFields.supportsCategories}
        placeholder={t("New style...")}
        defaultValue={JSON.stringify(initialValues)}
      />
    </InputGroup>
  )
}

export default AlbumStyleButtons
