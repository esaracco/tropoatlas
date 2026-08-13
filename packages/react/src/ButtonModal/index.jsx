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
  activeFilters = [],
  closeLabel = "Close",
  onChangeSelection,
  normalizeFn,
  sort,
  onSortChange,
}) => {
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
        {type === "checkbox" && activeFilters.length > 0 && (
          <div className="cancel-box">
            {activeFilters.map((filter) => (
              <Button
                key={filter.id}
                variant="primary"
                onClick={filter.onReset}
              >
                {filter.label}
                <span>&times;</span>
              </Button>
            ))}
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
        <Button onClick={onHide}>{closeLabel}</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ButtonModal
