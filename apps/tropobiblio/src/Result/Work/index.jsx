import React from "react"
import { LazyLoadImage } from "react-lazy-load-image-component"

import workPlaceholder from "../../assets/book.svg"
import "./styles/Work.css"

const loadedImageUrls = new Set()

const isImageCached = (url) => {
  if (!url) return false
  if (url.startsWith("data:") || loadedImageUrls.has(url)) return true
  const imgObj = new Image()
  imgObj.src = url
  if (imgObj.complete && imgObj.naturalWidth !== 0) {
    loadedImageUrls.add(url)
    return true
  }
  return false
}

const Work = ({
  setActiveInstanceId,
  cardWidth,
  instanceid,
  img,
  creator,
  year,
  title,
}) => {
  const isCached = isImageCached(img)

  const getWorkData = (e) => {
    const instanceId =
      e && e.currentTarget ? e.currentTarget.dataset.instanceid : e
    setActiveInstanceId(instanceId)
  }

  const coverHeight = Math.round(cardWidth * 1.5)
  const cardHeight = coverHeight + 54

  return (
    <div
      className="Work"
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
      }}
      data-instanceid={instanceid}
      onClick={getWorkData}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          getWorkData(e)
        }
      }}
    >
      <div
        className="work-cover-wrapper"
        style={{
          width: `${cardWidth}px`,
          height: `${coverHeight}px`,
        }}
      >
        <LazyLoadImage
          key={img}
          alt={title}
          src={img || workPlaceholder}
          height={coverHeight}
          width={cardWidth}
          visibleByDefault={isCached}
          onError={(e) => {
            e.target.onerror = null
            e.target.src = workPlaceholder
          }}
        />
      </div>
      <div className="creator" style={{ width: `${cardWidth}px` }}>
        <div className="text-truncate work-title" title={title}>
          {title}
        </div>
        <div className="text-truncate work-creator" title={creator}>
          {year ? `${year} - ` : ""}
          {creator}
        </div>
      </div>
    </div>
  )
}

export default Work
