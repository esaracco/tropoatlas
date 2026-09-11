import React from "react"

// Render runtime in minutes for films
export const HeaderDetails = ({ item }) => {
  if (!item?.runtime) return null
  return <div className="work-secondary-info">{item.runtime} min</div>
}

export default HeaderDetails
