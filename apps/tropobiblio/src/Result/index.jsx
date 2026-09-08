import React, { useEffect, useState, useRef, useMemo } from "react"
import {
  useCollectionStore,
  useAppStore,
  useSettingsStore,
  normalize,
} from "@tropo/core"
import { ProgressBar } from "react-bootstrap"
import { VirtuosoGrid } from "react-virtuoso"
import { useScrollbarWidth, useWindowWidth, ScrollButton } from "@tropo/react"
import { useTranslation } from "react-i18next"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSync } from "@fortawesome/free-solid-svg-icons"
import { LedsClient } from "@tropo/leds"

import Work from "./Work"
import WorkModal from "./Work/WorkModal"
import workPlaceholder from "../assets/book.svg"
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
  const works = useCollectionStore((s) => s.items)
  const sort = useCollectionStore((s) => s.sort)
  const winWidth = useWindowWidth(0)

  const _setLeds = import.meta.env.VITE_SET_LEDS === "yes"
  const hardware = useSettingsStore((s) => s.hardware)
  const turnOffLeds = useRef(false)

  const ledsClient = useMemo(() => {
    if (!_setLeds) return null
    return new LedsClient({
      target: hardware.ledTarget,
    })
  }, [_setLeds, hardware.ledTarget])

  // Calculate dynamic responsive card width for grid layout
  const calculateCardWidth = () => {
    const thresholds = [300, 400, 600, 800, 1000, 1200]
    const index = thresholds.findIndex((t) => winWidth < t)
    const itemsByCol = index === -1 ? 8 : index + 2

    return (winWidth - scrollbarWidth - 1) / itemsByCol
  }

  // Memoized filtering and sorting
  const {
    result,
    placesCategories,
    placesCreators,
    availableCategories,
    availableCreators,
  } = useMemo(() => {
    const keys = Object.keys(works || {})
    const result = []
    const search = normalize(searchStr)

    const sCategoriesLen = (selected.categories || []).length
    const sCreatorsLen = (selected.creators || []).length

    const fCategories = new Set()
    const fCreators = new Set()
    const placesCategories = new Set()
    const placesCreators = new Set()

    // Sorting
    const [sortField, sortDir] = (sort || "added_desc").split("_")
    const mul = sortDir === "desc" ? -1 : 1

    switch (sortField) {
      case "added":
        keys.sort((a, b) => {
          const diff = ((works[a].added || 0) - (works[b].added || 0)) * mul
          if (diff !== 0) return diff
          return (works[a].title || "").localeCompare(works[b].title || "")
        })
        break
      case "place":
        keys.sort((a, b) => {
          const pA = parseInt(works[a].place, 10) || 0
          const pB = parseInt(works[b].place, 10) || 0
          return (pA - pB) * mul
        })
        break
      case "rating":
        keys.sort((a, b) => {
          const rA = works[a].rating || 0
          const rB = works[b].rating || 0
          const diff = (rA - rB) * mul
          if (diff !== 0) return diff
          return (works[a].title || "").localeCompare(works[b].title || "")
        })
        break
      case "creator":
        keys.sort(
          (a, b) =>
            (works[a].creator || "").localeCompare(works[b].creator || "") *
            mul,
        )
        break
      case "title":
        keys.sort(
          (a, b) =>
            (works[a].title || "").localeCompare(works[b].title || "") * mul,
        )
        break
      case "year":
        keys.sort((a, b) => {
          const diff = ((works[a].year || 0) - (works[b].year || 0)) * mul
          if (diff !== 0) return diff
          return (works[a].title || "").localeCompare(works[b].title || "")
        })
        break
      default:
        keys.sort((a, b) => {
          const diff = ((works[a].added || 0) - (works[b].added || 0)) * mul
          if (diff !== 0) return diff
          return (works[a].title || "").localeCompare(works[b].title || "")
        })
    }

    for (let i = 0; i < keys.length; i++) {
      const b = works[keys[i]]
      if (!b) continue

      const matchSearch =
        search === "" || (b.searchIndex && b.searchIndex.indexOf(search) > -1)
      if (!matchSearch) continue

      const workCreators =
        Array.isArray(b.creators) && b.creators.length > 0
          ? b.creators
          : b.creator
            ? b.creator
                .split(/[,;]+/)
                .map((s) => s.trim())
                .filter(Boolean)
            : []

      const matchCategory =
        sCategoriesLen === 0 ||
        selected.categories.some((item) => (b.categories || []).includes(item))
      const matchCreator =
        sCreatorsLen === 0 ||
        selected.creators.some((c) => workCreators.includes(c))

      const hasPlace = _setLeds && b.place && String(b.place).match(/^\d+$/)

      if (matchCreator) {
        ;(b.categories || []).forEach((c) => fCategories.add(c))
      }

      if (matchCategory) {
        workCreators.forEach((c) => fCreators.add(c))
      }

      if (matchCategory && matchCreator) {
        result.push(b)
      }

      if (hasPlace) {
        if (
          sCategoriesLen > 0 &&
          selected.categories.some((item) =>
            (b.categories || []).includes(item),
          )
        ) {
          placesCategories.add(b.place)
        }
        if (sCreatorsLen > 0 && matchCreator) {
          placesCreators.add(b.place)
        }
      }
    }

    return {
      result,
      placesCategories: Array.from(placesCategories),
      placesCreators: Array.from(placesCreators),
      availableCategories: Array.from(fCategories).sort((a, b) =>
        a.localeCompare(b),
      ),
      availableCreators: Array.from(fCreators).sort((a, b) =>
        a.localeCompare(b),
      ),
    }
  }, [_setLeds, searchStr, works, selected, sort])

  // Update store state
  useEffect(() => {
    setCategories(availableCategories)
    setCreators(availableCreators)
    setDisplayCount(result.length)
  }, [
    result.length,
    availableCategories,
    availableCreators,
    setDisplayCount,
    setCategories,
    setCreators,
  ])

  // Central LED orchestration watcher
  useEffect(() => {
    if (!_setLeds || !ledsClient) return

    const manageLeds = async () => {
      const hasCategories = placesCategories.length > 0
      const hasCreators = placesCreators.length > 0
      const activeWork = activeInstanceId ? works[activeInstanceId] : null
      const hasModal = Boolean(
        activeInstanceId && activeWork && activeWork.place,
      )

      if (hasCategories || hasCreators || hasModal) {
        turnOffLeds.current = true
        let hasLit = false
        const ledCommands = []

        // 1. Categories: Lowest priority, drawn first, background intensity
        if (hasCategories) {
          ledCommands.push({
            place: placesCategories,
            color: hardware.ledsCategoriesColor || "0,150,0",
            intensity: 0.05,
            noreset: hasLit,
          })
          hasLit = true
        }

        // 2. Creators: Medium priority, drawn second, medium intensity
        if (hasCreators) {
          ledCommands.push({
            place: placesCreators,
            color: hardware.ledsCreatorsColor || "0,0,130",
            intensity: 0.5,
            noreset: hasLit,
          })
          hasLit = true
        }

        // 3. Modal: Highest priority, drawn last, high intensity with blink
        if (hasModal) {
          ledCommands.push({
            place: activeWork.place,
            color: hardware.ledsWorkColor || "255,0,0",
            intensity: 1.0,
            blink: true,
            noreset: hasLit,
          })
          hasLit = true
        }

        if (ledCommands.length > 0) {
          try {
            await ledsClient.setLeds(ledCommands)
          } catch {
            // Error logged by client
          }
        }
      } else if (turnOffLeds.current) {
        turnOffLeds.current = false
        try {
          await ledsClient.clearLeds()
        } catch {
          // Error logged by client
        }
      }
    }

    manageLeds()
  }, [
    _setLeds,
    ledsClient,
    placesCategories,
    placesCreators,
    activeInstanceId,
    works,
    hardware,
  ])

  const cardWidth = calculateCardWidth()

  return (
    <>
      <WorkModal
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
                <ProgressBar animated variant="success" now={progress} />
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
              <Work
                key={item.id}
                setActiveInstanceId={setActiveInstanceId}
                instanceid={item.id}
                img={item.cover || workPlaceholder}
                cardWidth={cardWidth}
                creator={item.creator}
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
