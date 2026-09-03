import React from "react"

import "./SortControl.css"

// COMPONENT SortControl
const SortControl = ({ items = {}, sort, onSortChange }) => {
  const lastIndex = sort ? sort.lastIndexOf("_") : -1
  const rawSortBy = lastIndex !== -1 ? sort.substring(0, lastIndex) : ""
  const validKeys = Object.keys(items)
  const sortBy = validKeys.includes(rawSortBy) ? rawSortBy : validKeys[0] || ""
  const sortDirection =
    lastIndex !== -1 ? sort.substring(lastIndex + 1) : "desc"

  const onSortByChange = (newSortBy) => {
    if (onSortChange) onSortChange(`${newSortBy}_${sortDirection}`)
  }

  const toggleDirection = () => {
    const newDir = sortDirection === "asc" ? "desc" : "asc"
    if (onSortChange) onSortChange(`${sortBy}_${newDir}`)
  }

  // RENDER
  return (
    <div className="SortControl">
      <div className="radio-setting">
        <div className="radio-sort-group">
          <select
            id="sort-select"
            className="radio-select"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
          >
            {Object.keys(items).map((item) => (
              <option key={item} value={item}>
                {items[item]}
              </option>
            ))}
          </select>
          <button
            className="radio-sort-dir"
            onClick={toggleDirection}
            aria-label={
              sortDirection === "asc" ? "Ordre décroissant" : "Ordre croissant"
            }
            title={
              sortDirection === "asc" ? "Ordre décroissant" : "Ordre croissant"
            }
          >
            {sortDirection === "asc" ? (
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SortControl
