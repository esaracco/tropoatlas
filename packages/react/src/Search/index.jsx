import React from "react"
import { Form, InputGroup } from "react-bootstrap"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClose, faSearch } from "@fortawesome/free-solid-svg-icons"

import "./Search.css"

// COMPONENT Search
const Search = ({ placeholder, searchStr, setSearchStr }) => {
  // METHOD onChange()
  const onChange = (e) => setSearchStr(e.target.value)

  // METHOD onReset()
  const onReset = (e) => {
    setSearchStr("")
    e.currentTarget.parentNode.querySelector("input").focus()
  }

  // RENDER
  return (
    <div className="Search">
      <InputGroup className="position-relative mb-0">
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
        <Form.Control
          type="text"
          onChange={onChange}
          value={searchStr}
          placeholder={placeholder}
        />
        <FontAwesomeIcon
          icon={faClose}
          size="sm"
          onClick={onReset}
          className={`search-clear ${searchStr !== "" ? "visible" : ""}`}
        />
      </InputGroup>
    </div>
  )
}

export default Search
