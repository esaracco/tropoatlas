import React, { useState, useEffect } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { HeaderButton, Search, ThemeSelector } from "@tropo/react"
import { normalize } from "@tropo/core"

import { Container, Nav, Navbar, Offcanvas } from "react-bootstrap"
import * as Settings from "../utils/settings"

import ResetButton from "./ResetButton"
import SynchroButton from "./SynchroButton"
import LedsButton from "./LedsButton"
import InfoBar from "./InfoBar"

import { useAppStore } from "@tropo/core"
import "./styles/Header.css"

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

  const showFormats =
    !Settings.formats ||
    Settings.formats === "all" ||
    Settings.formats.indexOf(",") > -1
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

  // RENDER
  return (
    <>
      <Navbar
        sticky="top"
        expand={expandBreakpoint}
        expanded={expanded}
        onToggle={setExpanded}
        className="shadow-sm bg-dark Header"
        data-bs-theme="dark"
      >
        <Container
          fluid
          className="d-flex justify-content-center align-items-center flex-nowrap"
        >
          <Navbar.Brand
            className={`d-none d-${expandBreakpoint}-block me-2 p-0 m-0`}
            style={{ cursor: "pointer" }}
            onClick={() => setShowAbout(true)}
          >
            <img src="/icon-180.png" height="36" width="36" alt="TropoDisc" />
          </Navbar.Brand>
          <Navbar.Toggle
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
          <div className="d-flex justify-content-center align-items-center">
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
                  className={`justify-content-end flex-grow-1 align-items-stretch align-items-${expandBreakpoint}-center mb-0 flex-column flex-${expandBreakpoint}-row flex-nowrap gap-2 gap-${expandBreakpoint}-0`}
                >
                  <ResetButton />
                  <HeaderButton
                    label={_("Styles")}
                    type="checkbox"
                    stype="categories"
                    selected={selected}
                    content={categories}
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
                    content={creators}
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
                      content={formats}
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
                      place: _("Location"),
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
          </div>
          <Search
            searchStr={searchStr}
            setSearchStr={setSearchStr}
            placeholder={_("artist, album...")}
          />
        </Container>
      </Navbar>
      <InfoBar />
    </>
  )
}

export default Header
