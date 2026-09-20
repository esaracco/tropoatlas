import React, { useState } from "react"
import { useCollectionStore } from "@tropo/core"
import { toast } from "react-toastify"
import { useTranslation } from "react-i18next"
import { LazyLoadImage } from "react-lazy-load-image-component"

import { buildCacheKey, setLargeItem } from "@tropo/core"

import "./styles/Work.css"

// Module-level cache of image URLs already loaded during this session
const loadedImageUrls = new Set()

// Helper to check if an image URL is already in session or browser cache
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

// Purge an image URL from browser Cache Storage
const purgeImageCache = async (url) => {
  if (!url || typeof window === "undefined" || !("caches" in window)) return
  try {
    const cleanUrl = url.split("?")[0]
    const cache = await caches.open(buildCacheKey("item-covers"))
    await cache.delete(url)
    await cache.delete(cleanUrl)
  } catch (e) {
    console.warn("Failed to purge image from cache:", e.message)
  }
}

// Append a timestamp query parameter to bypass browser/SW image cache
const addCacheBuster = (url) => {
  if (!url) return url
  const timestamp = Date.now()
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}t=${timestamp}`
}

// COMPONENT Work
export const WorkCard = ({
  setActiveInstanceId,
  cardWidth,
  instanceid,
  img,
  creator,
  year,
  title,
  format,
  plugin,
  placeholder,
}) => {
  const setItems = useCollectionStore((s) => s.setItems)

  const { t } = useTranslation()
  const [loader, setLoader] = useState(false)
  const isCached = isImageCached(img)

  // METHOD onClick()
  const onClick = (e) => {
    const targetInstanceId =
      e && e.currentTarget ? e.currentTarget.dataset.instanceid : instanceid
    setActiveInstanceId(targetInstanceId)
  }

  const retryImageLoad = async () => {
    toast.dismiss(`imageLoadingError-${instanceid}`)
    setLoader(true)
    try {
      const items = useCollectionStore.getState().items
      const work = items[instanceid]
      if (work) {
        // Purge previous image URL from browser cache
        await purgeImageCache(work.cover)

        const images = await plugin.getItemImage(work)
        if (images && images.cover) {
          const cover = addCacheBuster(images.cover)

          const releasesClone = { ...items }
          releasesClone[instanceid] = {
            ...work,
            cover,
          }
          setItems(releasesClone)
          setLargeItem("items", releasesClone)
          toast.success(t("Image recovered successfully!"))
        } else {
          toast.warning(t("Still no image available."))
        }
      }
    } catch (err) {
      toast.error(t("Failed to fetch new image: ") + err.message)
    }
    setLoader(false)
  }

  const onError = () => {
    if (!img || (typeof navigator !== "undefined" && !navigator.onLine)) return
    toast.error(
      <div>
        <b>{t("Image loading error")}</b>
        <br />
        {t(
          "Either there is a network problem, the provider is overloaded or the image URLs have changed.",
        )}
        <br />
        <i>{t("If the problem persists, please re-sync your collection.")}</i>
        <br />
        <br />
        <button
          onClick={retryImageLoad}
          className="btn btn-sm btn-outline-light"
        >
          {t("Retry fetching image")}
        </button>
      </div>,
      { autoClose: false, toastId: `imageLoadingError-${instanceid}` },
    )
  }

  const coverAspectRatio = plugin?.getCoverAspectRatio
    ? plugin.getCoverAspectRatio()
    : 1.0
  const coverHeight = Math.round(cardWidth * coverAspectRatio)

  // RENDER
  return (
    <div
      className={`Work${loader ? " is-loading" : ""}`}
      onClick={onClick}
      style={{ width: cardWidth }}
      data-instanceid={instanceid}
    >
      {loader && <div className="card-loader-bar" />}
      <div
        className="work-cover-wrapper"
        style={{ width: cardWidth, height: coverHeight }}
      >
        <LazyLoadImage
          key={img}
          onError={onError}
          onLoad={() => {
            if (img) loadedImageUrls.add(img)
          }}
          visibleByDefault={isCached}
          src={img}
          placeholderSrc={placeholder}
          height={coverHeight}
          width={cardWidth}
        />
      </div>
      {plugin.getProviderInfo().multipleFormats && format && (
        <div className="format-badge">{format}</div>
      )}
      <div className="creator" style={{ width: cardWidth }}>
        <div className="text-truncate work-title" title={title}>
          {title}
        </div>
        <div
          className="text-truncate work-creator"
          title={`${year ? `${year} - ` : ""}${creator}`}
        >
          {year ? `${year} - ` : ""}
          {creator}
        </div>
      </div>
    </div>
  )
}
