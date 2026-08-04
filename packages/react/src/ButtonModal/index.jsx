import React from "react"
import { Modal, Button } from "react-bootstrap"

import Checkbox from "../Checkbox"
import SortControl from "../SortControl"

import "./ButtonModal.css"

// COMPONENT ButtonModal
const ButtonModal = ({
  stype,
  label,
  type,
  content,
  onHide,
  show,
  selected,
  onReset,
  labels,
  onChangeSelection,
  normalizeFn,
  sort,
  onSortChange,
}) => {
  const uncheckAll = (e) => {
    e.currentTarget
      .closest(".modal-content")
      .querySelectorAll(`.modal-body input[type="checkbox"]`)
      .forEach((cb) => (cb.checked = false))
  }

  // METHOD onResetFormats()
  const onResetFormats = (e) => {
    onReset("formats")
    if (stype === "formats") {
      uncheckAll(e)
    }
  }

  // METHOD onResetArtists()
  const onResetArtists = (e) => {
    onReset("creators")
    if (stype === "creators") {
      uncheckAll(e)
    }
  }

  // METHOD onResetStyles()
  const onResetStyles = (e) => {
    onReset("categories")
    if (stype === "categories") {
      uncheckAll(e)
    }
  }

  // RENDER
  return (
    <Modal
      show={show}
      onHide={onHide}
      scrollable
      size="lg"
      className="ButtonModal"
      fullscreen={type === "checkbox" ? "sm-down" : undefined}
    >
      <Modal.Header closeButton className="position-relative">
        <Modal.Title>{label}</Modal.Title>
        {type === "checkbox" && (
          <div className="cancel-box">
            {selected && selected.formats && selected.formats.length > 0 && (
              <Button variant="primary" onClick={onResetFormats}>
                {labels.formats}
                <span>&times;</span>
              </Button>
            )}
            {selected && selected.creators && selected.creators.length > 0 && (
              <Button variant="primary" onClick={onResetArtists}>
                {labels.artists}
                <span>&times;</span>
              </Button>
            )}
            {selected &&
              selected.categories &&
              selected.categories.length > 0 && (
                <Button variant="primary" onClick={onResetStyles}>
                  {labels.styles}
                  <span>&times;</span>
                </Button>
              )}
          </div>
        )}
      </Modal.Header>
      <Modal.Body>
        {type === "checkbox" && (
          <Checkbox
            items={content}
            selected={selected ? selected[stype] : []}
            onChangeSelection={onChangeSelection}
            normalizeFn={normalizeFn}
          />
        )}
        {type === "radio" && (
          <SortControl
            items={content}
            sort={sort}
            onSortChange={onSortChange}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide}>{labels.close}</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ButtonModal
