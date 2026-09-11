import React, { useEffect, useState, useRef, useMemo } from "react"
import { useCollectionStore, normalize } from "@tropo/core"
import { ProgressBar } from "react-bootstrap"
import { VirtuosoGrid } from "react-virtuoso"

import { WorkCard } from "./WorkCard"
import { GenericWorkModal } from "./GenericWorkModal"
import { useScrollbarWidth } from "../../hooks/useScrollbarWidth.js"
import { useWindowWidth } from "../../hooks/useWindowWidth.js"
import ScrollButton from "../../ScrollButton/index.jsx"
import { useAppStore } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSync } from "@fortawesome/free-solid-svg-icons"

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

// COMPONENT Result
export const Result = ({
  plugin,
  setLeds,
  ledsClient,
  ledsColors,
  placeholder,
  currency,
  renderExtraTabs,
  renderHeaderDetails,
  renderExtraRows,
}) => {
  const { t } = useTranslation()
  const fromRuler = useAppStore((s) => s.fromRuler)
  const setFromRuler = useAppStore((s) => s.setFromRuler)
  const searchStr = useAppStore((s) => s.searchStr)
  const isSyncing = useAppStore((s) => s.isSyncing)
  const progress = useAppStore((s) => s.progress)
  const setDisplayCount = useAppStore((s) => s.setDisplayCount)
  const scrollbarWidth = useScrollbarWidth()
  const virtuosoRef = useRef(null)
  const scrollerRef = useRef(null)

  const setCategories = useCollectionStore((s) => s.setCategories)
  const setCreators = useCollectionStore((s) => s.setCreators)
  const setFormats = useCollectionStore((s) => s.setFormats)

  const [activeInstanceId, setActiveInstanceId] = useState(null)
  const selected = useCollectionStore((s) => s.selected)
  const releases = useCollectionStore((s) => s.items)
  const sort = useCollectionStore((s) => s.sort)
  const turnOffLeds = useRef(false)
  const winWidth = useWindowWidth(0)

  // Calculate dynamic responsive card width for grid layout
  const calculateCardWidth = () => {
    const thresholds = [300, 400, 600, 800, 1000, 1200]
    const index = thresholds.findIndex((t) => winWidth < t)
    const itemsByCol = index === -1 ? 8 : index + 2

    return (winWidth - scrollbarWidth - 1) / itemsByCol
  }

  // MEMOIZED FILTERING
  const {
    result,
    placesCategories,
    placesCreators,
    availableCategories,
    availableCreators,
    availableFormats,
  } = useMemo(() => {
    const keys = Object.keys(releases)
    const result = []
    const search = normalize(searchStr)

    const sCategoriesLen = selected.categories.length
    const sCreatorsLen = selected.creators.length
    const sFormatsLen = selected.formats.length

    const fCategories = new Set()
    const fCreators = new Set()
    const fFormats = new Set()
    const placesCategories = new Set()
    const placesCreators = new Set()

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
        keys.sort((a, b) => {
          const rA = releases[a].rating || 0
          const rB = releases[b].rating || 0
          const diff = (rA - rB) * mul
          if (diff !== 0) return diff
          const titleDiff =
            (releases[a].title || "").localeCompare(releases[b].title || "") *
            mul
          if (titleDiff !== 0) return titleDiff
          return (
            (releases[a].creator || "").localeCompare(
              releases[b].creator || "",
            ) * mul
          )
        })
        break
      case "creator":
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

      const matchCategory =
        sCategoriesLen === 0 ||
        selected.categories.some((item) => r.categories.includes(item))
      const itemCreators =
        Array.isArray(r.creators) && r.creators.length > 0
          ? r.creators
          : [r.creator, ...(Array.isArray(r.cast) ? r.cast : [])].filter(
              Boolean,
            )
      const matchCreator =
        sCreatorsLen === 0 ||
        itemCreators.some((c) => selected.creators.includes(c))
      const matchFormat =
        sFormatsLen === 0 || selected.formats.includes(r.format)

      const hasPlace = setLeds && r.place && r.place.match(/^\d+$/)

      // Collect available options (an option is available if the release
      // matches ALL OTHER filters)
      if (matchCreator && matchFormat) {
        r.categories.forEach((c) => fCategories.add(c))
      }

      if (matchCategory && matchFormat) {
        itemCreators.forEach((c) => fCreators.add(c))
      }

      if (matchCategory && matchCreator) {
        fFormats.add(r.format)
      }

      if (matchCategory && matchCreator && matchFormat) {
        result.push(r)
      }

      if (hasPlace) {
        if (
          sCategoriesLen > 0 &&
          selected.categories.some((item) => r.categories.includes(item))
        ) {
          placesCategories.add(r.place)
        }
        if (
          sCreatorsLen > 0 &&
          itemCreators.some((c) => selected.creators.includes(c))
        ) {
          placesCreators.add(r.place)
        }
      }
    }

    return {
      result,
      placesCategories: Array.from(placesCategories),
      placesCreators: Array.from(placesCreators),
      availableCategories: Array.from(fCategories).sort(),
      availableCreators: Array.from(fCreators).sort(),
      availableFormats: Array.from(fFormats).sort(),
    }
  }, [searchStr, releases, selected, sort])

  const placesCategoriesStr = placesCategories.join(",")
  const placesCreatorsStr = placesCreators.join(",")

  // EFFECT: Update store state
  useEffect(() => {
    setCategories(availableCategories)
    setFormats(availableFormats)
    setCreators(availableCreators)
    setDisplayCount(result.length)
  }, [
    result.length,
    availableCategories,
    availableFormats,
    availableCreators,
    setDisplayCount,
    setCategories,
    setFormats,
    setCreators,
  ])

  // EFFECT: Handle LEDs
  useEffect(() => {
    if (!setLeds) return

    const manageLeds = async () => {
      const hasCategories = placesCategories.length > 0
      const hasCreators = placesCreators.length > 0
      const activeWork = activeInstanceId ? releases[activeInstanceId] : null
      const hasModal = Boolean(
        activeInstanceId && activeWork && activeWork.place,
      )

      if (hasCategories || hasCreators || hasModal) {
        turnOffLeds.current = true
        let hasLit = false
        const ledCommands = []

        // 1. Categories (Background / Lowest intensity)
        if (hasCategories) {
          ledCommands.push({
            place: placesCategories,
            color: ledsColors.categories,
            intensity: 0.05,
            noreset: hasLit,
          })
          hasLit = true
        }

        // 2. Creators (Middle layer / Medium intensity)
        if (hasCreators) {
          ledCommands.push({
            place: placesCreators,
            color: ledsColors.creators,
            intensity: 0.5,
            noreset: hasLit,
          })
          hasLit = true
        }

        // 3. Modal (Focus layer / Highest priority / Full intensity)
        if (hasModal) {
          ledCommands.push({
            place: activeWork.place,
            color: ledsColors.work,
            intensity: 0.1,
            blink: true,
            noreset: hasLit,
          })
          hasLit = true
        }

        if (ledCommands.length > 0) {
          try {
            await ledsClient.setLeds(ledCommands)
          } catch {
            // Handled by ledsClient.onError
          }
        }
      } else if (turnOffLeds.current) {
        turnOffLeds.current = false
        if (!fromRuler) {
          try {
            await ledsClient.setLeds()
          } catch {
            // Handled by ledsClient.onError
          }
        } else {
          setFromRuler(false)
        }
      }
    }

    manageLeds()
  }, [
    placesCategoriesStr,
    placesCreatorsStr,
    fromRuler,
    setFromRuler,
    activeInstanceId,
    releases,
  ])

  const cardWidth = calculateCardWidth()

  // RENDER
  return (
    <>
      {activeInstanceId && (
        <GenericWorkModal
          plugin={plugin}
          setLeds={setLeds}
          ledsClient={ledsClient}
          placeholder={placeholder}
          currency={currency}
          renderHeaderDetails={renderHeaderDetails}
          renderExtraRows={renderExtraRows}
          renderExtraTabs={renderExtraTabs}
          key={activeInstanceId}
          instanceId={activeInstanceId}
          onClose={() => setActiveInstanceId(null)}
        />
      )}
      <div className="Result">
        {isSyncing && (
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
                {t("Synchronization in progress...")}
              </h3>
              <div className="sync-progress-wrapper">
                <ProgressBar animated variant="danger" now={progress} />
                <span className="sync-percentage">{Math.round(progress)}%</span>
              </div>
              <p className="sync-subtitle">
                {t(
                  "The synchronization of your collection can take several minutes.",
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
              <WorkCard
                plugin={plugin}
                placeholder={placeholder}
                key={item.id}
                setActiveInstanceId={setActiveInstanceId}
                instanceid={item.id}
                img={item.cover || placeholder}
                cardWidth={cardWidth}
                creator={item.creator}
                year={item.year}
                title={item.title}
                format={item.format}
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
