import React, { useState, useEffect } from "react"
import { useCollectionStore } from "@tropo/core"
import { toast } from "react-toastify"
import { useTranslation } from "react-i18next"
import { LazyLoadImage } from "react-lazy-load-image-component"

import { getItemDetails, getItemImages, getProviderInfo } from "../../provider"
import { setLargeItem } from "@tropo/core"

import "./styles/Album.css"

// Queue to fetch missing years progressively in the background (max 1 req / 2s)
const backgroundQueue = {
  queue: [],
  processing: false,
  add(instanceId, fetchFn) {
    if (!this.queue.some((i) => i.instanceId === instanceId)) {
      this.queue.push({ instanceId, fetchFn })
      this.process()
    }
  },
  async process() {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    while (this.queue.length > 0) {
      const { fetchFn } = this.queue.shift()
      try {
        await fetchFn()
      } catch (e) {
        console.error("Background fetch error:", e.message)
      }
      // Wait 1.5 seconds between requests to avoid provider API limits
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    this.processing = false
  },
}

// Track latest clicked album instance ID to prevent stale async responses
let latestClickedInstanceId = null

export const setLatestClickedInstanceId = (id) => {
  latestClickedInstanceId = id
}

// Module-level cache of image URLs already loaded during this session
const loadedImageUrls = new Set()

// Helper to check if an image URL is already in session or browser cache
const isImageCached = (url) => {
  if (!url) return false
  if (loadedImageUrls.has(url)) return true
  const imgObj = new Image()
  imgObj.src = url
  if (imgObj.complete && imgObj.naturalWidth !== 0) {
    loadedImageUrls.add(url)
    return true
  }
  return false
}

// COMPONENT Album
const Album = ({
  setActiveInstanceId,
  thumbWidth,
  instanceid,
  img,
  artist,
  year,
  title,
  format,
}) => {
  const setItems = useCollectionStore((s) => s.setItems)

  const [_] = useTranslation()
  const [loader, setLoader] = useState(false)
  const isCached = isImageCached(img)

  // EFFECT: Queue fetching missing year in background
  useEffect(() => {
    if (!year || year === 0) {
      backgroundQueue.add(instanceid, async () => {
        // Fetch only if still missing
        const currentAlbum = useCollectionStore.getState().items[instanceid]
        if (
          currentAlbum &&
          currentAlbum.master === undefined &&
          (!currentAlbum.year || currentAlbum.year === 0)
        ) {
          // Unmount safe state update inside getReleaseData isn't strictly
          //  guaranteed, but state updates on unmounted components don't
          // throw warnings in React 18 and we only care about updating the
          // store anyway.
          await getReleaseData(instanceid, false)
        }
      })
    }
  }, [year, instanceid])

  // METHOD getReleaseData()
  const getReleaseData = async (e, showLoader = true) => {
    const instanceId =
      e && e.currentTarget ? e.currentTarget.dataset.instanceid : e
    let album = useCollectionStore.getState().items[instanceId]

    // Get remote data if not yet in cache
    if (album.tracklist === undefined) {
      if (showLoader) setLoader(true)

      try {
        album = await getItemDetails(album)

        const items = useCollectionStore.getState().items
        const newItems = { ...items, [instanceId]: album }
        setItems(newItems)
        setLargeItem("releases", newItems)
      } finally {
        if (showLoader) setLoader(false)
      }
    }

    return album
  }

  // METHOD onClick()
  const onClick = (e) => {
    const targetInstanceId =
      e && e.currentTarget ? e.currentTarget.dataset.instanceid : instanceid
    setLatestClickedInstanceId(targetInstanceId)

    getReleaseData(e)
      .then((r) => {
        // Discard stale async responses if user clicked another album
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
          toast.warning(_("You are offline!"), { toastId: "offline" })
        } else {
          console.error(e.message)
          toast.error(
            _(e.message) ||
              _("An error occurred while using the {{provider}} API!", {
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
        const images = await getItemImages(album)
        if (images) {
          const cover = images.cover
          const thumb = images.thumb

          const releasesClone = { ...items }
          releasesClone[instanceid] = {
            ...album,
            cover,
            thumb,
          }
          setItems(releasesClone)
          setLargeItem("releases", releasesClone)
          toast.success(_("Image recovered successfully!"))
        } else {
          toast.warning(_("Still no image available."))
        }
      }
    } catch (err) {
      toast.error(_("Failed to fetch new image: ") + err.message)
    }
    setLoader(false)
  }

  const onError = () => {
    toast.error(
      <div>
        <b>{_("Image loading error")}</b>
        <br />
        {_(
          "Either there is a network problem, the provider is overloaded or the image URLs have changed.",
        )}
        <br />
        <i>{_("If the problem persists, please re-sync your collection.")}</i>
        <br />
        <br />
        <button
          onClick={retryImageLoad}
          className="btn btn-sm btn-outline-light"
        >
          {_("Retry fetching image")}
        </button>
      </div>,
      { autoClose: false, toastId: `imageLoadingError-${instanceid}` },
    )
  }

  // RENDER
  return (
    <div
      className={`Album${loader ? " is-loading" : ""}`}
      onClick={onClick}
      style={{ width: thumbWidth }}
      data-instanceid={instanceid}
    >
      {loader && <div className="card-loader-bar" />}
      <LazyLoadImage
        onError={onError}
        onLoad={() => {
          if (img) loadedImageUrls.add(img)
        }}
        visibleByDefault={isCached}
        src={img}
        height={thumbWidth}
        width={thumbWidth}
      />
      {getProviderInfo().multipleFormats && format && (
        <div className="format-badge">{format}</div>
      )}
      <div className="artist text-truncate" style={{ width: thumbWidth }}>
        {artist}
        <br />
        {year ? `${year} - ` : ""}
        {title}
      </div>
    </div>
  )
}

export default Album
