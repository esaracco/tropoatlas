import React, { useState, useEffect } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { HeaderButton, Search, ThemeSelector } from "@tropo/react"
import { normalize, getItem } from "@tropo/core"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSearch } from "@fortawesome/free-solid-svg-icons"

import { Button, Container, Nav, Navbar, Offcanvas } from "react-bootstrap"
import * as Settings from "../utils/settings"

import ClearFiltersButton from "./ClearFiltersButton"
import SynchroButton from "./SynchroButton"
import LedsButton from "./LedsButton"
import SettingsButton from "./SettingsButton"
import SettingsModal from "../Settings/SettingsModal"
import InfoBar from "./InfoBar"

import { useAppStore } from "@tropo/core"
import "./styles/Header.css"

import { getProviderInfo } from "../provider"

// COMPONENT Header
const Header = () => {
  const setShowAbout = useAppStore((s) => s.setShowAbout)
  const searchStr = useAppStore((s) => s.searchStr)
  const setSearchStr = useAppStore((s) => s.setSearchStr)
  const categories = useCollectionStore((s) => s.categories)
  const creators = useCollectionStore((s) => s.creators)
  const formats = useCollectionStore((s) => s.formats)
  const selected = useCollectionStore((s) => s.selected)
  const setFilter = useCollectionStore((s) => s.setFilter)
  const sort = useCollectionStore((s) => s.sort)
  const setSort = useCollectionStore((s) => s.setSort)
  const [_] = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const toggleSearch = () => {
    if (showSearch) {
      setSearchStr("")
      setShowSearch(false)
    } else {
      setShowSearch(true)
    }
  }

  const customFields = getItem("customFieldsInfo") || {}

  const allCategories = Array.from(
    new Set([...categories, ...selected.categories]),
  ).sort()
  const allCreators = Array.from(
    new Set([...creators, ...selected.creators]),
  ).sort()
  const allFormats = Array.from(
    new Set([...formats, ...selected.formats]),
  ).sort()

  const showFormats = getProviderInfo().multipleFormats
  const expandBreakpoint = showFormats ? "md" : "sm"

  useEffect(() => {
    const handleResize = () => {
      const breakpointWidth = expandBreakpoint === "md" ? 768 : 576
      if (window.innerWidth >= breakpointWidth && expanded) {
        setExpanded(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [expanded, expandBreakpoint])

  useEffect(() => {
    if (sort.startsWith("place_") && !customFields.supportsPlace) {
      setSort("added_desc")
    }
  }, [sort, customFields.supportsPlace, setSort])

  const labels = {
    formats: _("Formats"),
    artists: _("Artists"),
    styles: _("Styles"),
    close: _("Close"),
  }

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
    <div className="sticky-top Header">
      <Navbar
        expand={expandBreakpoint}
        expanded={expanded}
        onToggle={setExpanded}
        className="shadow-sm bg-dark"
        data-bs-theme="dark"
      >
        <Container fluid className="d-flex align-items-center flex-nowrap">
          <Navbar.Brand
            className="p-0 m-0 me-2 flex-shrink-0"
            style={{ cursor: "pointer" }}
            onClick={() => setShowAbout(true)}
          >
            <img src="/icon-180.png" height="36" width="36" alt="TropoDisc" />
          </Navbar.Brand>
          <Navbar.Toggle
            className="flex-shrink-0 me-2"
            aria-controls={`offcanvasNavbar-expand-${expandBreakpoint}`}
          >
            <span className="navbar-toggler-icon"></span>
            {selected.categories.length ||
            selected.creators.length ||
            selected.formats.length ? (
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
                  <SettingsButton
                    onClick={() => {
                      setExpanded(false)
                      setTimeout(() => setShowSettings(true), 350)
                    }}
                  />
                  <HeaderButton
                    label={_("Styles")}
                    type="checkbox"
                    stype="categories"
                    selected={selected}
                    content={allCategories}
                    labels={labels}
                    onReset={(type) => setFilter(type, [])}
                    onChangeSelection={getOnChangeSelection("categories")}
                    normalizeFn={normalize}
                  />
                  <HeaderButton
                    label={_("Artists")}
                    type="checkbox"
                    stype="creators"
                    selected={selected}
                    content={allCreators}
                    labels={labels}
                    onReset={(type) => setFilter(type, [])}
                    onChangeSelection={getOnChangeSelection("creators")}
                    normalizeFn={normalize}
                  />
                  {showFormats && (
                    <HeaderButton
                      label={_("Formats")}
                      type="checkbox"
                      stype="formats"
                      selected={selected}
                      content={allFormats}
                      labels={labels}
                      onReset={(type) => setFilter(type, [])}
                      onChangeSelection={getOnChangeSelection("formats")}
                      normalizeFn={normalize}
                    />
                  )}
                  <HeaderButton
                    label={_("Sort")}
                    type="radio"
                    mark={false}
                    content={{
                      added: _("Date added"),
                      artist: _("Artist"),
                      rating: _("Note"),
                      year: _("Year"),
                      ...(customFields.supportsPlace && {
                        place: _("Location"),
                      }),
                    }}
                    sort={sort}
                    onSortChange={setSort}
                    labels={labels}
                  />
                  <SynchroButton />
                  {Settings.setLeds === "yes" && <LedsButton />}
                  <ThemeSelector
                    storageKey="tropodisc-theme"
                    title={_("Theme")}
                    ariaLabel={_("Change theme")}
                  />
                </Nav>
              </Offcanvas.Body>
            </Navbar.Offcanvas>
            <Button
              variant="secondary"
              className={`HeaderButton search-toggle-btn flex-shrink-0 ${showSearch ? "active" : ""}`}
              onClick={toggleSearch}
              aria-label={_("Search")}
            >
              <FontAwesomeIcon icon={faSearch} />
            </Button>
          </div>
        </Container>
      </Navbar>
      <div className={`search-bar-drawer ${showSearch ? "open" : ""}`}>
        <Search
          searchStr={searchStr}
          setSearchStr={setSearchStr}
          placeholder={_("artist, album...")}
        />
      </div>
      <InfoBar />
      <SettingsModal
        show={showSettings}
        onHide={() => setShowSettings(false)}
      />
    </div>
  )
}

export default Header
