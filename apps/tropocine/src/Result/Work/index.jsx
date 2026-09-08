import React, { useState } from "react"
import { useCollectionStore } from "@tropo/core"
import { toast } from "react-toastify"
import { useTranslation } from "react-i18next"
import { LazyLoadImage } from "react-lazy-load-image-component"

import { getItemImage } from "../../provider"
import { buildCacheKey, setLargeItem } from "@tropo/core"

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

const addCacheBuster = (url) => {
  if (!url) return url
  const timestamp = Date.now()
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}t=${timestamp}`
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
  const setItems = useCollectionStore((s) => s.setItems)
  const { t } = useTranslation()
  const [loader, setLoader] = useState(false)
  const isCached = isImageCached(img)

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
        await purgeImageCache(work.cover)

        const images = await getItemImage(work)
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
    if (!img) return
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

  const posterHeight = Math.round(cardWidth * 1.5)

  return (
    <div
      className={`Work${loader ? " is-loading" : ""}`}
      onClick={onClick}
      style={{ width: cardWidth }}
      data-instanceid={instanceid}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick(e)
        }
      }}
    >
      {loader && <div className="card-loader-bar" />}
      <LazyLoadImage
        key={img}
        onError={onError}
        onLoad={() => {
          if (img) loadedImageUrls.add(img)
        }}
        visibleByDefault={isCached}
        src={img}
        height={posterHeight}
        width={cardWidth}
      />
      <div className="creator text-truncate" style={{ width: cardWidth }}>
        {creator}
        <br />
        {year ? `${year} - ` : ""}
        {title}
      </div>
    </div>
  )
}

export default Work
