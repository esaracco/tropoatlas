import React from "react"

// Render format and country secondary details for audio releases
export const HeaderDetails = ({ item }) => {
  if (!item?.format && !item?.country) return null
  return (
    <div>
      <em>{[item.format, item.country].filter(Boolean).join(", ")}</em>
    </div>
  )
}

export default HeaderDetails
