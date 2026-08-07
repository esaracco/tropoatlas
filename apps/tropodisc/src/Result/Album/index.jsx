import React, { useState, useEffect } from "react"
import { useCollectionStore } from "@tropo/core"
import { toast } from "react-toastify"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSync } from "@fortawesome/free-solid-svg-icons"
import { useTranslation } from "react-i18next"

import processString from "react-process-string"
import { LazyLoadImage } from "react-lazy-load-image-component"

import { getItemDetails, getItemImages, getProviderInfo } from "../../provider"
import { setLargeItem } from "@tropo/core"

import vinylImg300 from "../../assets/vinyl-300.png"

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

// COMPONENT Album
const Album = ({
  setModalData,
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
          //store anyway.
          await getReleaseData(instanceid)
        }
      })
    }
  }, [year, instanceid])

  // METHOD getReleaseData()
  const getReleaseData = async (e) => {
    const instanceId =
      e && e.currentTarget ? e.currentTarget.dataset.instanceid : e
    let album = useCollectionStore.getState().items[instanceId]

    // Get remote data if not yet in cache
    if (album.tracklist === undefined) {
      setLoader(true)

      try {
        album = await getItemDetails(album)

        const items = useCollectionStore.getState().items
        const newItems = { ...items, [instanceId]: album }
        setItems(newItems)
        setLargeItem("releases", newItems)
      } finally {
        setLoader(false)
      }
    }

    return album
  }

  // METHOD getTracks()
  const getTracks = (tracklist) => {
    let tracks
    tracklist.forEach((item) => {
      switch (item.type_) {
        case "heading":
          if (item.title !== "") {
            tracks = (
              <>
                {tracks}
                <li className="heading">
                  <b>{item.title}</b>
                </li>
              </>
            )
          }
          break
        case "index":
          tracks = (
            <>
              {tracks}
              {getTracks(item.sub_tracks)}
            </>
          )
          break
        case "track":
          tracks = (
            <>
              {tracks}
              <li>
                {item.position} - {item.title}
                {item.duration && ` (${item.duration})`}
              </li>
            </>
          )
          break
        default:
      }
    })

    return tracks
  }

  // METHOD onClick()
  const onClick = (e) => {
    getReleaseData(e)
      .then((r) => {
        const config = [
          {
            regex: /\[([^\]]+)\]\(([^)]+)\)/g,
            fn: (k, r) => (
              <a key={k} href={r[2]} rel="noopener noreferrer" target="_blank">
                {r[1]}
              </a>
            ),
          },
          {
            regex: /\r\n\r\n|\n\n/g,
            fn: (k) => <p key={k} />,
          },
          {
            regex: /\r\n|\n/g,
            fn: (k) => <br key={k} />,
          },
        ]

        let notes = null

        if (r.notes && r.globalNotes) {
          notes = (
            <>
              <div>
                {_("This copy")} ({r.country}
                {r.year ? " " + r.year : ""}) :
              </div>
              <div className="release" style={{ whiteSpace: "pre-wrap" }}>
                {processString(config)(r.notes)}
              </div>
              <br />
              <div>{_("General informations")} :</div>
              <div className="master" style={{ whiteSpace: "pre-wrap" }}>
                {processString(config)(r.globalNotes)}
              </div>
            </>
          )
        } else if (r.notes || r.globalNotes) {
          notes = (
            <div style={{ whiteSpace: "pre-wrap" }}>
              {processString(config)(r.notes ? r.notes : r.globalNotes)}
            </div>
          )
        }

        // Update modal values and show modal
        setModalData({
          show: true,
          instanceid: r.id,
          folderid: r.folderid,
          rating: r.rating,
          tracklist: getTracks(r.tracklist),
          externalUrl: r.externalUrl,
          maintitle: (
            <>
              <div className="artist">
                {r.creator}
                <br />
                {r.year ? r.year + " - " : ""}
                {r.title}
              </div>
              {r.lpcount > 1 ? (
                <span>{_("{{count}} discs", { count: r.lpcount })}</span>
              ) : (
                ""
              )}
            </>
          ),
          notes: notes,
          country: r.country,
          artist: r.creator,
          format: r.format,
          thumb: r.thumb,
          cover: r.cover,
          place: r.place,
          price: r.price,
          styles: r.categories,
        })
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
      className="Album"
      onClick={onClick}
      style={{ width: thumbWidth }}
      data-instanceid={instanceid}
    >
      <LazyLoadImage
        onError={onError}
        placeholderSrc={vinylImg300}
        src={img}
        height={thumbWidth}
        width={thumbWidth}
      />
      {loader && (
        <div className="loader">
          <FontAwesomeIcon icon={faSync} spin />
        </div>
      )}
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
