import React, { useEffect, useState, useRef, useMemo } from "react"
import { useCollectionStore, useAppStore, normalize } from "@tropo/core"
import { ProgressBar } from "react-bootstrap"
import { VirtuosoGrid } from "react-virtuoso"
import { useScrollbarWidth, useWindowWidth, ScrollButton } from "@tropo/react"
import { useTranslation } from "react-i18next"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSync } from "@fortawesome/free-solid-svg-icons"

import Album from "./Album"
import AlbumModal from "./Album/AlbumModal"
import filmPlaceholder from "../assets/film.svg"
import "./Result.css"

const GridList = React.forwardRef(({ style, ...props }, ref) => (
  <div
    {...props}
    ref={ref}
    style={{
      ...style,
      display: "flex",
      flexWrap: "wrap",
    }}
  />
))
GridList.displayName = "GridList"

const GRID_COMPONENTS = {
  Header: () => <div style={{ height: "8px", width: "100%" }} />,
  Footer: () => <div style={{ height: "8px", width: "100%" }} />,
  List: GridList,
}

const Result = () => {
  const { t } = useTranslation()
  const searchStr = useAppStore((s) => s.searchStr)
  const isSyncing = useAppStore((s) => s.isSyncing)
  const progress = useAppStore((s) => s.progress)
  const setDisplayCount = useAppStore((s) => s.setDisplayCount)
  const scrollbarWidth = useScrollbarWidth()
  const virtuosoRef = useRef(null)
  const scrollerRef = useRef(null)

  const setCategories = useCollectionStore((s) => s.setCategories)
  const setCreators = useCollectionStore((s) => s.setCreators)

  const [activeInstanceId, setActiveInstanceId] = useState(null)
  const selected = useCollectionStore((s) => s.selected)
  const releases = useCollectionStore((s) => s.items)
  const sort = useCollectionStore((s) => s.sort)
  const winWidth = useWindowWidth(0)

  // Calculate dynamic responsive card width for grid layout
  const calculateCardWidth = () => {
    const thresholds = [300, 400, 600, 800, 1000, 1200]
    const index = thresholds.findIndex((t) => winWidth < t)
    const itemsByCol = index === -1 ? 8 : index + 2

    return (winWidth - scrollbarWidth - 1) / itemsByCol
  }

  // Memoized filtering and sorting
  const { result, availableCategories, availableArtists } = useMemo(() => {
    const keys = Object.keys(releases || {})
    const result = []
    const search = normalize(searchStr)

    const sStylesLen = (selected.categories || []).length
    const sArtistsLen = (selected.creators || []).length

    const fCategories = new Set()
    const fCreators = new Set()

    // sort
    const [sortField, sortDir] = (sort || "added_desc").split("_")
    const mul = sortDir === "desc" ? -1 : 1

    switch (sortField) {
      case "added":
        keys.sort(
          (a, b) => ((releases[a].added || 0) - (releases[b].added || 0)) * mul,
        )
        break
      case "rating":
        keys.sort(
          (a, b) =>
            ((releases[a].rating || 0) - (releases[b].rating || 0)) * mul,
        )
        break
      case "creator":
        keys.sort(
          (a, b) =>
            (releases[a].creator || "").localeCompare(
              releases[b].creator || "",
            ) * mul,
        )
        break
      case "title":
        keys.sort(
          (a, b) =>
            (releases[a].title || "").localeCompare(releases[b].title || "") *
            mul,
        )
        break
      case "year":
        keys.sort((a, b) => {
          const diff = ((releases[a].year || 0) - (releases[b].year || 0)) * mul
          if (diff !== 0) return diff
          return (releases[a].title || "").localeCompare(
            releases[b].title || "",
          )
        })
        break
      default:
        keys.sort(
          (a, b) => ((releases[a].added || 0) - (releases[b].added || 0)) * mul,
        )
    }

    for (let i = 0; i < keys.length; i++) {
      const r = releases[keys[i]]
      if (!r) continue

      const matchSearch =
        search === "" || (r.searchIndex && r.searchIndex.indexOf(search) > -1)
      if (!matchSearch) continue

      const matchStyle =
        sStylesLen === 0 ||
        selected.categories.some((item) => (r.categories || []).includes(item))
      const moviePeople = [r.creator, ...(r.cast || [])].filter(Boolean)
      const matchPeople =
        sArtistsLen === 0 ||
        selected.creators.some((person) => moviePeople.includes(person))

      if (matchPeople) {
        ;(r.categories || []).forEach((c) => fCategories.add(c))
      }

      if (matchStyle) {
        moviePeople.forEach((p) => fCreators.add(p))
      }

      if (matchStyle && matchPeople) {
        result.push(r)
      }
    }

    return {
      result,
      availableCategories: Array.from(fCategories).sort(),
      availableArtists: Array.from(fCreators).sort(),
    }
  }, [searchStr, releases, selected, sort])

  // Update store state
  useEffect(() => {
    setCategories(availableCategories)
    setCreators(availableArtists)
    setDisplayCount(result.length)
  }, [
    result.length,
    availableCategories,
    availableArtists,
    setDisplayCount,
    setCategories,
    setCreators,
  ])

  const cardWidth = calculateCardWidth()

  return (
    <>
      <AlbumModal
        instanceId={activeInstanceId}
        onClose={() => setActiveInstanceId(null)}
      />
      <div className="Result">
        {isSyncing && (
          <div className="sync-overlay">
            <div className="sync-card">
              <div className="sync-icon-wrapper">
                <FontAwesomeIcon icon={faSync} spin size="2x" />
              </div>
              <h3 className="sync-title">
                {t("Synchronization in progress...")}
              </h3>
              <div className="sync-progress-wrapper">
                <ProgressBar animated variant="danger" now={progress} />
                <span className="sync-percentage">{Math.round(progress)}%</span>
              </div>
              <p className="sync-subtitle">
                {t(
                  "The synchronization of your collection can take a few moments.",
                )}
              </p>
            </div>
          </div>
        )}
        <VirtuosoGrid
          ref={virtuosoRef}
          scrollerRef={(el) => (scrollerRef.current = el)}
          style={{
            height: "100%",
            width: "100%",
            overflowAnchor: "none",
            overflowX: "hidden",
          }}
          totalCount={result.length}
          components={GRID_COMPONENTS}
          itemContent={(index) => {
            const item = result[index]
            return (
              <Album
                key={item.id}
                setActiveInstanceId={setActiveInstanceId}
                instanceid={item.id}
                img={item.cover || filmPlaceholder}
                cardWidth={cardWidth}
                artist={item.creator}
                year={item.year}
                title={item.title}
              />
            )
          }}
        />
        <ScrollButton
          onScrollToTop={() =>
            virtuosoRef.current?.scrollToIndex({ index: 0, behavior: "smooth" })
          }
          scrollerRef={scrollerRef}
        />
      </div>
    </>
  )
}

export default Result
