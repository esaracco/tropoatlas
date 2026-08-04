import React, { useState } from "react"
import Search from "../Search"

import "./Checkbox.css"

// COMPONENT CheckBox
const Checkbox = ({ items, selected, onChangeSelection, normalizeFn }) => {
  const [searchStr, setSearchStr] = useState("")

  // METHOD onChange()
  const onChange = (e) => {
    const value = e.target.value
    onChangeSelection(value, e.target.checked)
  }

  // RENDER
  return (
    <div className="Checkbox">
      <Search
        searchStr={searchStr}
        setSearchStr={setSearchStr}
        style={{ color: "#000" }}
      />
      {items
        .map((item) => (
          <div key={item}>
            <label>
              <input
                type="checkbox"
                defaultChecked={selected.indexOf(item) > -1}
                value={item}
                onChange={onChange}
              />
              {item}
            </label>
          </div>
        ))
        .filter(
          (item) =>
            !searchStr ||
            (normalizeFn
              ? normalizeFn(item.key).match(normalizeFn(searchStr))
              : item.key.toLowerCase().match(searchStr.toLowerCase())),
        )
        .sort((a, b) => {
          if (
            !selected.length ||
            (selected.indexOf(a.key) === -1 && selected.indexOf(b.key) === -1)
          ) {
            return a.key.localeCompare(b.key)
          } else if (
            selected.indexOf(a.key) !== -1 &&
            selected.indexOf(b.key) !== -1
          ) {
            return 0
          } else if (selected.indexOf(a.key) !== -1) {
            return -1
          } else if (selected.indexOf(b.key) !== -1) {
            return 1
          }
        })}
    </div>
  )
}

export default Checkbox
