import React, { useEffect, useRef } from "react"
import { useCollectionStore, getItem, getPluginTerminology } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { InputGroup } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPen } from "@fortawesome/free-solid-svg-icons"

import Tagify from "@yaireo/tagify"

import "@yaireo/tagify/dist/tagify.css"
import "./styles/WorkCategoryButtons.css"

// COMPONENT WorkCategoryButtons
const WorkCategoryButtons = ({ plugin, categories, closeModal }) => {
  const terminology = getPluginTerminology(plugin)
  const setFilter = useCollectionStore((s) => s.setFilter)
  const allCategories = getItem("categories") || []
  const { t } = useTranslation()
  const tags = useRef(null)
  const customFields = getItem("customFieldsInfo") || {}

  // EFFECT
  useEffect(() => {
    if (!tags.current) {
      tags.current = new Tagify(
        document.querySelector(".WorkCategoryButtons"),
        {
          whitelist: allCategories,
          // Capitalize first letter of any created or edited category tag
          transformTag: (tagData) => {
            if (tagData.value) {
              tagData.value =
                tagData.value.charAt(0).toUpperCase() + tagData.value.slice(1)
            }
          },
          callbacks: {
            click: (e) => {
              setFilter("creators", [])
              setFilter("categories", [e.detail.data.value])
              closeModal()
            },
          },
        },
      )
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
    <InputGroup size="sm" className="category-input-group">
      {customFields.supportsCategories && (
        <InputGroup.Text className="category-icon-addon">
          <FontAwesomeIcon icon={faPen} />
        </InputGroup.Text>
      )}
      <input
        className="WorkCategoryButtons"
        readOnly={!customFields.supportsCategories}
        placeholder={t(terminology.newCategoryPlaceholder || "New category...")}
        defaultValue={JSON.stringify(initialValues)}
      />
    </InputGroup>
  )
}

export default WorkCategoryButtons
