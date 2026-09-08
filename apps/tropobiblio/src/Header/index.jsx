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
import provider from "../provider"
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
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showSearch) {
        toggleSearch()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showSearch])

  const allCategories = categories
  const allCreators = creators

  const activeFilters = {
    categories: selected.categories || [],
    creators: selected.creators || [],
  }

  const getOnChangeSelection = (type) => (item) => {
    const current = selected[type] || []
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item]
    setFilter(type, updated)
  }

  const expandBreakpoint = "sm"

  const draftCaps = provider.plugin?.getDraftCapabilities
    ? provider.plugin.getDraftCapabilities({})
    : {}

  const sortContent = {
    added: t("Date added"),
    year: t("Year"),
    title: t("Title"),
    creator: t("Author"),
    ...(draftCaps.supportsPlace ? { place: t("Place") } : {}),
    ...(draftCaps.supportsRating ? { rating: t("My rating") } : {}),
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
                placeholder={t("book, author...")}
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
              <img
                src="/icon-180.png"
                height="36"
                width="36"
                alt="TropoBiblio"
              />
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
                      label={t("Authors")}
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
        label={t("Authors")}
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
        content={sortContent}
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
