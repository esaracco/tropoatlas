import React, { useState } from "react"
import { useCollectionStore } from "@tropo/core"
import { toast } from "react-toastify"
import { useTranslation } from "react-i18next"
import { LazyLoadImage } from "react-lazy-load-image-component"

import { getItemDetails, getItemImage, getProviderInfo } from "../../provider"
import { buildCacheKey, setLargeItem } from "@tropo/core"

import "./styles/Album.css"

let latestClickedInstanceId = null

export const setLatestClickedInstanceId = (id) => {
  latestClickedInstanceId = id
}

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

const Album = ({
  setActiveInstanceId,
  cardWidth,
  instanceid,
  img,
  artist,
  year,
  title,
}) => {
  const setItems = useCollectionStore((s) => s.setItems)
  const { t } = useTranslation()
  const [loader, setLoader] = useState(false)
  const isCached = isImageCached(img)

  const getReleaseData = async (e, showLoader = true) => {
    const instanceId =
      e && e.currentTarget ? e.currentTarget.dataset.instanceid : e
    let album = useCollectionStore.getState().items[instanceId]

    // Get remote data if not yet fully enriched
    if (!album.cast || album.cast.length === 0) {
      if (showLoader) setLoader(true)

      try {
        album = await getItemDetails(album)

        const items = useCollectionStore.getState().items
        const newItems = { ...items, [instanceId]: album }
        setItems(newItems)
        setLargeItem("items", newItems)
      } finally {
        if (showLoader) setLoader(false)
      }
    }

    return album
  }

  const onClick = (e) => {
    const targetInstanceId =
      e && e.currentTarget ? e.currentTarget.dataset.instanceid : instanceid
    setLatestClickedInstanceId(targetInstanceId)

    getReleaseData(e)
      .then((r) => {
        if (
          latestClickedInstanceId !== null &&
          String(latestClickedInstanceId) !== String(r.id)
        ) {
          return
        }
        setActiveInstanceId(r.id)
      })
      .catch((e) => {
        if (!navigator.onLine) {
          toast.warning(t("You are offline!"), { toastId: "offline" })
        } else {
          console.error(e.message)
          toast.error(
            t(e.message) ||
              t("An error occurred while using the {{provider}} API!", {
                provider: getProviderInfo().name,
              }),
          )
        }
      })
  }

  const retryImageLoad = async () => {
    toast.dismiss(`imageLoadingError-${instanceid}`)
    setLoader(true)
    try {
      const items = useCollectionStore.getState().items
      const album = items[instanceid]
      if (album) {
        await purgeImageCache(album.cover)

        const images = await getItemImage(album)
        if (images && images.cover) {
          const cover = addCacheBuster(images.cover)
          const releasesClone = { ...items }
          releasesClone[instanceid] = {
            ...album,
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
      className={`Album${loader ? " is-loading" : ""}`}
      onClick={onClick}
      style={{ width: cardWidth }}
      data-instanceid={instanceid}
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
      <div className="artist text-truncate" style={{ width: cardWidth }}>
        {artist}
        <br />
        {year ? `${year} - ` : ""}
        {title}
      </div>
    </div>
  )
}

export default Album
