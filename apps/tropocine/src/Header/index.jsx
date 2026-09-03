import React, { useState, useEffect, useRef } from "react"
import { useCollectionStore, useAppStore, normalize } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { ButtonModal, HeaderButton, Search } from "@tropo/react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClose, faSearch } from "@fortawesome/free-solid-svg-icons"
import { Button, Container, Nav, Navbar, Offcanvas } from "react-bootstrap"

import ClearFiltersButton from "./ClearFiltersButton"
import OptionsMenu from "./OptionsMenu"
import SettingsModal from "../Settings/SettingsModal"
import "./styles/Header.css"

const Header = () => {
  const setShowAbout = useAppStore((s) => s.setShowAbout)
  const searchStr = useAppStore((s) => s.searchStr)
  const setSearchStr = useAppStore((s) => s.setSearchStr)
  const categories = useCollectionStore((s) => s.categories)
  const creators = useCollectionStore((s) => s.creators)
  const selected = useCollectionStore((s) => s.selected)
  const setFilter = useCollectionStore((s) => s.setFilter)
  const sort = useCollectionStore((s) => s.sort)
  const setSort = useCollectionStore((s) => s.setSort)
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const searchInputRef = useRef(null)

  // Manage search input focus and blur with in-place search visibility
  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus({ preventScroll: true })
    } else {
      searchInputRef.current?.blur()
    }
  }, [showSearch])

  const toggleSearch = () => {
    if (showSearch) {
      searchInputRef.current?.blur()
      setSearchStr("")
      setShowSearch(false)
    } else {
      setShowSearch(true)
    }
  }

  // Handle global Escape key to close search bar when input is not focused
  useEffect(() => {
    if (!showSearch) return

    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return

      // Let open modals/drawers handle Escape without closing search underneath
      const hasOpenOverlay = Boolean(
        document.querySelector(
          ".modal, [role='dialog'], .modal-backdrop, .offcanvas.show, .offcanvas-backdrop",
        ),
      )
      if (hasOpenOverlay) return

      // Skip if search input is focused (handled by Search component)
      if (document.activeElement === searchInputRef.current) return

      e.preventDefault()
      e.stopPropagation()
      toggleSearch()
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [showSearch])

  const allCategories = Array.from(
    new Set([...categories, ...(selected.categories || [])]),
  ).sort()
  const allCreators = Array.from(
    new Set([...creators, ...(selected.creators || [])]),
  ).sort()

  const expandBreakpoint = "sm"

  useEffect(() => {
    const handleResize = () => {
      const breakpointWidth = 576
      if (window.innerWidth >= breakpointWidth && expanded) {
        setExpanded(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [expanded])

  const activeFilters = [
    selected.creators?.length > 0 && {
      id: "creators",
      label: t("People"),
      onReset: () => setFilter("creators", []),
    },
    selected.categories?.length > 0 && {
      id: "categories",
      label: t("Genres"),
      onReset: () => setFilter("categories", []),
    },
  ].filter(Boolean)

  const getOnChangeSelection = (stype) => (value, isChecked) => {
    if (isChecked) {
      setFilter(stype, [...selected[stype], value])
    } else {
      setFilter(
        stype,
        selected[stype].filter((v) => v !== value),
      )
    }
  }

  return (
    <div className="Header">
      <Navbar
        expand={expandBreakpoint}
        expanded={expanded}
        onToggle={setExpanded}
        className="shadow-sm bg-dark"
        data-bs-theme="dark"
      >
        {showSearch ? (
          <Container
            fluid
            className="d-flex align-items-center flex-nowrap gap-2"
          >
            <div className="flex-grow-1 header-search-container">
              <Search
                inputRef={searchInputRef}
                searchStr={searchStr}
                setSearchStr={setSearchStr}
                onEscape={toggleSearch}
                placeholder={t("movie, director, actor...")}
              />
            </div>
            <Button
              variant="secondary"
              className="HeaderButton search-close-btn flex-shrink-0"
              onClick={toggleSearch}
              aria-label={t("Close")}
            >
              <FontAwesomeIcon icon={faClose} />
            </Button>
          </Container>
        ) : (
          <Container fluid className="d-flex align-items-center flex-nowrap">
            <Navbar.Brand
              className="p-0 m-0 me-2 flex-shrink-0"
              style={{ cursor: "pointer" }}
              onClick={() => setShowAbout(true)}
            >
              <img src="/icon-180.png" height="36" width="36" alt="TropoCine" />
            </Navbar.Brand>
            <Navbar.Toggle
              className="flex-shrink-0 me-2"
              aria-controls={`offcanvasNavbar-expand-${expandBreakpoint}`}
            >
              <span className="navbar-toggler-icon"></span>
              {selected.categories.length || selected.creators.length ? (
                <span className="badge">
                  <span className="selected-mark"></span>
                </span>
              ) : (
                ""
              )}
            </Navbar.Toggle>
            <div className="d-flex justify-content-center align-items-center flex-grow-1 flex-nowrap">
              <Navbar.Offcanvas
                id={`offcanvasNavbar-expand-${expandBreakpoint}`}
                aria-labelledby={`offcanvasNavbarLabel-expand-${expandBreakpoint}`}
                placement="end"
                data-bs-theme="dark"
                className={`header-offcanvas header-offcanvas-${expandBreakpoint}`}
              >
                <Offcanvas.Header closeButton />
                <Offcanvas.Body>
                  <Nav
                    className={`justify-content-center align-items-stretch align-items-${expandBreakpoint}-center mb-0 flex-column flex-${expandBreakpoint}-row flex-nowrap gap-2 gap-${expandBreakpoint}-0`}
                  >
                    <ClearFiltersButton />
                    <HeaderButton
                      label={t("Genres")}
                      stype="categories"
                      selected={selected}
                      onClick={() => setActiveModal("categories")}
                    />
                    <HeaderButton
                      label={t("People")}
                      stype="creators"
                      selected={selected}
                      onClick={() => setActiveModal("creators")}
                    />
                    <HeaderButton
                      label={t("Sort")}
                      mark={false}
                      onClick={() => setActiveModal("sort")}
                    />
                    <Button
                      variant="secondary"
                      className="HeaderButton search-toggle-btn flex-shrink-0 d-none d-sm-inline-block"
                      onClick={toggleSearch}
                      aria-label={t("Search")}
                    >
                      <FontAwesomeIcon icon={faSearch} />
                    </Button>
                  </Nav>
                </Offcanvas.Body>
              </Navbar.Offcanvas>
            </div>
            <div className="d-flex align-items-center ms-auto flex-shrink-0 gap-1">
              <Button
                variant="secondary"
                className="HeaderButton search-toggle-btn flex-shrink-0 d-sm-none"
                onClick={toggleSearch}
                aria-label={t("Search")}
              >
                <FontAwesomeIcon icon={faSearch} />
              </Button>
              <OptionsMenu
                onOpenSettings={() => {
                  setExpanded(false)
                  setShowSettings(true)
                }}
              />
            </div>
          </Container>
        )}
      </Navbar>
      <ButtonModal
        show={activeModal === "categories"}
        label={t("Genres")}
        type="checkbox"
        stype="categories"
        selected={selected}
        content={allCategories}
        activeFilters={activeFilters}
        closeLabel={t("Close")}
        onChangeSelection={getOnChangeSelection("categories")}
        normalizeFn={normalize}
        onHide={() => setActiveModal(null)}
      />
      <ButtonModal
        show={activeModal === "creators"}
        label={t("People")}
        type="checkbox"
        stype="creators"
        selected={selected}
        content={allCreators}
        activeFilters={activeFilters}
        closeLabel={t("Close")}
        onChangeSelection={getOnChangeSelection("creators")}
        normalizeFn={normalize}
        onHide={() => setActiveModal(null)}
      />
      <ButtonModal
        show={activeModal === "sort"}
        label={t("Sort")}
        type="radio"
        content={{
          added: t("Date added"),
          year: t("Year"),
          title: t("Title"),
          creator: t("Director"),
          rating: t("Rating"),
        }}
        sort={sort}
        onSortChange={setSort}
        closeLabel={t("Close")}
        onHide={() => setActiveModal(null)}
      />
      <SettingsModal
        show={showSettings}
        onHide={() => setShowSettings(false)}
      />
    </div>
  )
}

export default Header
