import React, { useEffect, useState, useRef, useMemo } from "react"
import { useCollectionStore } from "@tropo/core"
import { ProgressBar } from "react-bootstrap"
import { VirtuosoGrid } from "react-virtuoso"

import * as Settings from "../utils/settings"
import * as Leds from "../utils/leds"

import Album from "./Album"
import AlbumModal from "./Album/AlbumModal"
import { normalize } from "@tropo/core"
import { useScrollbarWidth, useWindowWidth } from "@tropo/react"
import { useAppStore } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSync } from "@fortawesome/free-solid-svg-icons"

import "./Result.css"

const _setLeds = Settings.setLeds === "yes"

const GridList = React.forwardRef(({ style, ...props }, ref) => (
  <div
    {...props}
    ref={ref}
    style={{ ...style, display: "flex", flexWrap: "wrap" }}
  />
))
GridList.displayName = "GridList"

// COMPONENT Result
const Result = () => {
  const [_] = useTranslation()
  const fromRuler = useAppStore((s) => s.fromRuler)
  const setFromRuler = useAppStore((s) => s.setFromRuler)
  const searchStr = useAppStore((s) => s.searchStr)
  const loading = useAppStore((s) => s.loading)
  const progress = useAppStore((s) => s.progress)
  const setDisplayCount = useAppStore((s) => s.setDisplayCount)
  const scrollbarWidth = useScrollbarWidth()

  const setCategories = useCollectionStore((s) => s.setCategories)
  const setCreators = useCollectionStore((s) => s.setCreators)
  const setFormats = useCollectionStore((s) => s.setFormats)

  const [modalData, setModalData] = useState({
    show: false,
    releaseid: 0,
    instanceid: 0,
    folderid: 0,
    rating: null,
    tracklist: null,
    maintitle: null,
    notes: null,
    country: null,
    artist: null,
    format: null,
    thumb: null,
    cover: null,
    place: null,
    price: null,
    styles: [],
  })
  const selected = useCollectionStore((s) => s.selected)
  const releases = useCollectionStore((s) => s.items)
  const sort = useCollectionStore((s) => s.sort)
  const turnOffLeds = useRef(false)
  const winWidth = useWindowWidth(100)

  // METHOD calculateThumbWidth()
  const calculateThumbWidth = () => {
    const thresholds = [300, 400, 600, 800, 1000, 1200]
    const index = thresholds.findIndex((t) => winWidth < t)
    const itemsByCol = index === -1 ? 8 : index + 2

    return (winWidth - scrollbarWidth - 1) / itemsByCol
  }

  // MEMOIZED FILTERING
  const {
    result,
    places,
    placesStyles,
    placesArtists,
    availableCategories,
    availableArtists,
    availableFormats,
  } = useMemo(() => {
    const keys = Object.keys(releases)
    const res = []
    const places = []
    const search = normalize(searchStr)

    const sStylesLen = selected.categories.length
    const sArtistsLen = selected.creators.length
    const sFormatsLen = selected.formats.length

    const fCategories = new Set()
    const fCreators = new Set()
    const fFormats = new Set()
    const placesStyles = new Set()
    const placesArtists = new Set()

    // sort
    const [sortField, sortDir] = sort.split("_")
    const mul = sortDir === "desc" ? -1 : 1

    switch (sortField) {
      case "added":
        keys.sort(
          (a, b) =>
            (releases[a].added < releases[b].added
              ? -1
              : releases[a].added > releases[b].added
                ? 1
                : 0) * mul,
        )
        break
      case "rating":
        keys.sort((a, b) => (releases[a].rating - releases[b].rating) * mul)
        break
      case "artist":
        keys.sort(
          (a, b) =>
            releases[a].creator.localeCompare(releases[b].creator) * mul,
        )
        break
      case "year":
        keys.sort((a, b) => (releases[a].year - releases[b].year) * mul)
        break
      case "place":
        keys.sort((a, b) => {
          const pA = releases[a].place
          const pB = releases[b].place
          if (!pA && !pB) return 0
          if (!pA) return 1
          if (!pB) return -1
          return (parseInt(pA) - parseInt(pB)) * mul
        })
        break
      default:
    }

    for (let i = 0; i < keys.length; i++) {
      const r = releases[keys[i]]

      const matchSearch = search === "" || r.searchIndex.indexOf(search) > -1
      if (!matchSearch) continue

      const matchStyle =
        sStylesLen === 0 ||
        selected.categories.some((item) => r.categories.includes(item))
      const matchArtist =
        sArtistsLen === 0 || selected.creators.includes(r.creator)
      const matchFormat =
        sFormatsLen === 0 || selected.formats.includes(r.format)

      const hasPlace = _setLeds && r.place && r.place.match(/^\d+$/)

      // Collect available options (an option is available if the release matches ALL OTHER filters)
      if (matchArtist && matchFormat) {
        r.categories.forEach((c) => fCategories.add(c))
      }

      if (matchStyle && matchFormat) {
        fCreators.add(r.creator)
      }

      if (matchStyle && matchArtist) {
        fFormats.add(r.format)
      }

      if (matchStyle && matchArtist && matchFormat) {
        if (hasPlace) {
          places.push(r.place)
        }
        res.push(r)
      }

      if (hasPlace) {
        if (
          sStylesLen > 0 &&
          selected.categories.some((item) => r.categories.includes(item))
        ) {
          placesStyles.add(r.place)
        }
        if (sArtistsLen > 0 && selected.creators.includes(r.creator)) {
          placesArtists.add(r.place)
        }
      }
    }

    return {
      result: res,
      places,
      placesStyles: Array.from(placesStyles),
      placesArtists: Array.from(placesArtists),
      availableCategories: Array.from(fCategories).sort(),
      availableArtists: Array.from(fCreators).sort(),
      availableFormats: Array.from(fFormats).sort(),
    }
  }, [searchStr, releases, selected, sort])

  const placesStr = places.join(",")
  const placesStylesStr = placesStyles.join(",")
  const placesArtistsStr = placesArtists.join(",")

  // EFFECT: Update store state
  useEffect(() => {
    setCategories(availableCategories)
    setFormats(availableFormats)
    setCreators(availableArtists)
    setDisplayCount(result.length)
  }, [
    result.length,
    availableCategories,
    availableFormats,
    availableArtists,
    setDisplayCount,
    setCategories,
    setFormats,
    setCreators,
  ])

  // EFFECT: Handle LEDs
  useEffect(() => {
    let ledsTimeout

    if (_setLeds) {
      const sStylesLen = selected.categories.length
      const sArtistsLen = selected.creators.length

      // Debounce LED API calls to prevent flooding the IoT server
      ledsTimeout = setTimeout(async () => {
        // Let there be light!
        if (sStylesLen || sArtistsLen) {
          turnOffLeds.current = true
          let hasLit = false

          if (sStylesLen) {
            await Leds.setLeds({
              place: placesStyles,
              color: Settings.ledsStylesColor,
              noreset: hasLit,
            })
            hasLit = true
          }

          if (sArtistsLen) {
            await Leds.setLeds({
              place: placesArtists,
              color: Settings.ledsArtistsColor,
              noreset: hasLit,
            })
            hasLit = true
          }
          // Turn off the light...
        } else if (turnOffLeds.current) {
          turnOffLeds.current = false
          if (!fromRuler) {
            Leds.setLeds()
          } else {
            setFromRuler(false)
          }
        }
      }, 400) // 400ms debounce
    }

    return () => {
      if (ledsTimeout) {
        clearTimeout(ledsTimeout)
      }
    }
  }, [
    placesStr,
    placesStylesStr,
    placesArtistsStr,
    selected,
    fromRuler,
    setFromRuler,
  ])

  const thumbWidth = calculateThumbWidth()
  const img = thumbWidth <= 150 ? "thumb" : "cover"

  // RENDER
  return (
    <>
      {modalData.artist && (
        <AlbumModal modalData={modalData} setModalData={setModalData} />
      )}
      <div className="Result">
        {loading && !result.length && (
          <div className="sync-overlay">
            <div className="sync-card">
              <div className="sync-icon-wrapper">
                <FontAwesomeIcon
                  icon={faSync}
                  spin
                  size="2x"
                  className="sync-icon"
                />
              </div>
              <h3 className="sync-title">
                {_("Synchronization in progress...")}
              </h3>
              <div className="sync-progress-wrapper">
                <ProgressBar animated variant="danger" now={progress} />
                <span className="sync-percentage">{Math.round(progress)}%</span>
              </div>
              <p className="sync-subtitle">
                {_(
                  "The synchronization of your collection can take several minutes.",
                )}
              </p>
            </div>
          </div>
        )}
        <VirtuosoGrid
          useWindowScroll
          totalCount={result.length}
          overscan={200}
          components={{
            List: GridList,
          }}
          itemContent={(index) => {
            const item = result[index]
            return (
              <Album
                key={item.id}
                setModalData={setModalData}
                instanceid={item.id}
                img={item[img]}
                thumbWidth={thumbWidth}
                artist={item.creator}
                year={item.year}
                title={item.title}
                format={item.format}
              />
            )
          }}
        />
      </div>
    </>
  )
}

export default Result
