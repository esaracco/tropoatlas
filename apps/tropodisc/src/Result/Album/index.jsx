import React, { useState, useEffect } from "react"
import { useCollectionStore } from "@tropo/core"
import { toast } from "react-toastify"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSync } from "@fortawesome/free-solid-svg-icons"
import { useTranslation } from "react-i18next"

import processString from "react-process-string"
import { LazyLoadImage } from "react-lazy-load-image-component"

import { getMaster, getRelease } from "../../utils/discogs"
import { setLargeItem } from "@tropo/core"

import * as Settings from "../../utils/settings"
import * as Leds from "../../utils/leds"

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
      // Wait 1.5 seconds between requests to avoid Discogs API limits
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
  const selectedStyles = useCollectionStore((s) => s.selected.categories)
  const selectedArtists = useCollectionStore((s) => s.selected.creators)

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

    // Method _extractYear()
    const _extractYear = (notes) => {
      if (notes) {
        const m = notes.match(/Ⓟ\s*(1\d\d\d)|[^\d](1\d\d\d)[^\d]/s)
        if (m) {
          return Number(m[1] || m[2])
        }
      }
    }

    // Get remote data if not yet in cache
    if (album.master === undefined) {
      setLoader(true)

      try {
        const master = album.masterid
          ? await getMaster({ id: album.masterid })
          : null
        const { country, notes, tracklist } = await getRelease({
          id: album.releaseid,
        })
        let year = album.year

        // Guess the year if not in the main release info
        // 1 - Try from the release notes
        if (!year) {
          year = _extractYear(notes)

          // 2 - Try from the master notes
          if (!year && master) {
            year = _extractYear(master.notes)

            // 3 - Finally use the year of the master
            if (!year && master.year) {
              year = master.year
            }
          }
        }

        // Remove unused extra data from master
        if (master && master.tracklist) {
          master.tracklist.forEach((t) => delete t.extraartists)
        }

        // Remove unused extra data from release
        if (tracklist) {
          tracklist.forEach((t) => delete t.extraartists)
        }

        album = {
          ...album,
          year,
          master: master
            ? {
                notes: master.notes,
                tracklist: master.tracklist,
              }
            : null,
          country,
          notes,
          tracklist,
        }
        const items = useCollectionStore.getState().items
        const newItems = { ...items, [instanceId]: album }
        setItems(newItems)
        setLargeItem("releases", newItems)
      } finally {
        setLoader(false)
      }
    }

    // Return consolidated album data (master + release)
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
        const master = r.master
        const config = [
          {
            regex: /\[(a|l|m|r)=?([^\]]+)\]/g,
            fn: (k, r) => (
              <a
                key={k}
                href={
                  "https://www.discogs.com/" +
                  (r[1] === "a"
                    ? "artist"
                    : r[1] === "l"
                      ? "label"
                      : r[1] === "m"
                        ? "master"
                        : "release") +
                  "/" +
                  r[2]
                }
                rel="noopener noreferrer"
                target="_blank"
              >
                {r[2]}
              </a>
            ),
          },
          {
            regex: /\[url=([^\]]+)]([^\]]+)\[\/url]/g,
            fn: (k, r) => (
              <a key={k} href={r[1]} rel="noopener noreferrer" target="_blank">
                {r[2]}
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

        // build notes
        const rNotes = r.notes ? r.notes.trim() : null
        const mNotes = master && master.notes ? master.notes.trim() : null
        let notes = null

        if (rNotes && mNotes) {
          if (rNotes) {
            notes = (
              <>
                {notes}
                <div>
                  {_("This copy")} ({r.country}
                  {r.year ? " " + r.year : ""}) :
                </div>
                <div className="release" style={{ whiteSpace: "pre-wrap" }}>
                  {processString(config)(rNotes)}
                </div>
              </>
            )
          }
          if (mNotes) {
            notes = (
              <>
                {notes}
                <div>{_("General informations")} :</div>
                <div className="master" style={{ whiteSpace: "pre-wrap" }}>
                  {processString(config)(mNotes)}
                </div>
              </>
            )
          }
        } else if (rNotes || mNotes) {
          notes = (
            <div style={{ whiteSpace: "pre-wrap" }}>
              {processString(config)(rNotes ? rNotes : mNotes ? mNotes : "")}
            </div>
          )
        }

        // Update modal values and show modal
        setModalData({
          show: true,
          releaseid: r.releaseid,
          instanceid: r.id,
          folderid: r.folderid,
          rating: r.rating,
          tracklist: getTracks(
            r.tracklist.length
              ? r.tracklist
              : master && master.tracklist.length
                ? master.tracklist
                : [],
          ),
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

        // Let there be light!
        if (Settings.setLeds === "yes") {
          Leds.setLeds({
            place: r.place,
            color: Settings.ledsAlbumColor,
            noreset: !!(selectedStyles.length || selectedArtists.length),
          })
        }
      })
      .catch((e) => {
        if (!navigator.onLine) {
          toast.warning(_("You are offline!"), { toastId: "offline" })
        } else {
          console.error(e.message)
          toast.error(
            _(e.message) || _("An error occurred while using the Discogs API!"),
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
      if (album && album.releaseid) {
        const r = await getRelease({ id: album.releaseid })
        if (r && r.images && r.images.length > 0) {
          const cover = r.images[0].uri
          const thumb = r.images[0].uri150

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
          toast.warning(_("Still no image available on Discogs."))
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
          "Either there is a network problem, Discogs is overloaded or the image URLs have changed.",
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
      {(!Settings.formats ||
        Settings.formats === "all" ||
        Settings.formats.indexOf(",") > -1) &&
        format && <div className="format-badge">{format}</div>}
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
