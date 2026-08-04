import React, { useState, useRef } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { Modal, Button, Table, Tab, Tabs, Form } from "react-bootstrap"
import { toast } from "react-toastify"

// FIXME Discogs API oddness | import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
// FIXME Discogs API oddness | import {faTimes} from '@fortawesome/free-solid-svg-icons';

import ImageGallery from "react-image-gallery"
import "react-image-gallery/styles/image-gallery.css"
import { Rating } from "react-simple-star-rating"

import discogsLogo from "@tropo/discogs/src/assets/logo.png"

import { ConfirmModal } from "@tropo/react"
import AlbumStyleButtons from "./AlbumStyleButtons"
import AlbumButton from "./AlbumButton"

import { getItem, setLargeItem, setItem } from "@tropo/core"
import { updateUserData, extractStyles } from "../../utils/discogs"
import * as Leds from "../../utils/leds"
import * as Settings from "../../utils/settings"

import vinylImg300 from "../../assets/vinyl-300.png"

import "./styles/AlbumModal.css"

// COMPONENT AlbumModal
const AlbumModal = ({ modalData, setModalData }) => {
  const setItems = useCollectionStore((s) => s.setItems)
  const setCategories = useCollectionStore((s) => s.setCategories)
  const setFilter = useCollectionStore((s) => s.setFilter)

  const [showConfirm, setShowConfirm] = useState(false)
  const selectedStyles = useCollectionStore((s) => s.selected.categories)
  const selectedArtists = useCollectionStore((s) => s.selected.creators)
  const releases = useCollectionStore((s) => s.items)
  const {
    show,
    maintitle,
    rating,
    cover,
    format,
    artist,
    place,
    country,
    price,
    styles,
    releaseid,
    instanceid,
    notes,
    tracklist,
  } = modalData
  const [_] = useTranslation()
  const refIG = useRef(null)
  const fieldsId = getItem("discogsFields") || {}
  let discogsFieldsCount = 0

  if (fieldsId.placeId) {
    ++discogsFieldsCount
  }
  if (fieldsId.priceId) {
    ++discogsFieldsCount
  }

  // METHOD handleIGClick()
  const handleIGClick = () => {
    if (refIG.current && refIG.current.toggleFullScreen) {
      refIG.current.toggleFullScreen()
    }
  }

  // METHOD getSaveActionInfo()
  const getSaveActionInfo = () => {
    modalData.categories = (() => {
      const r = []
      document
        .querySelectorAll(".AlbumStyleButtons tag")
        .forEach((t) => r.push(t.getAttribute("value")))
      return r.slice().sort()
    })()
    const releasesClone = { ...releases }
    const release = { ...releasesClone[instanceid] }
    const changes = {}

    if (rating !== release.rating) {
      changes.rating = rating
    }
    if (place !== release.place) {
      changes.place = place
    }
    if (price !== release.price) {
      changes.price = price
    }
    if (
      fieldsId.stylesId &&
      modalData.categories.join(",") !== release.categories.join(",")
    ) {
      changes.categories = modalData.categories
      changes.styles = modalData.categories
    }

    return { releasesClone, release, changes }
  }

  // METHOD onSave()
  const onSave = async () => {
    const { releasesClone, release, changes } = getSaveActionInfo()

    onHideConfirm()

    // Optimistic UI update
    if (changes.categories) {
      release.categories = changes.categories
    }
    releasesClone[instanceid] = { ...release, place, price, rating }
    setItems(releasesClone)
    setLargeItem("releases", releasesClone)

    if (changes.categories) {
      // Rebuild global styles list
      const allStyles = extractStyles(releasesClone)
      setCategories(allStyles)
      setItem("styles", allStyles)
      // Remove non-existent styles if previously selected
      setFilter(
        "categories",
        selectedStyles.filter((s) => allStyles.indexOf(s) > -1),
      )
    }

    try {
      await updateUserData(modalData, changes)
    } catch (e) {
      if (!navigator.onLine) {
        toast.info(
          _(
            "You are offline. Your changes have been saved locally and will be synchronized when the connection is restored.",
          ),
          { autoClose: false },
        )
      } else {
        console.error(e.message)
        toast.error(
          _(e.message) || _("An error occurred while using the Discogs API!"),
          { autoClose: false },
        )
      }
    }
  }

  // METHOD onHideConfirm()
  const onHideConfirm = () => {
    turnOffLed()
    setShowConfirm(false)
    setModalData({ ...modalData, show: false })
  }

  // METHOD turnOffLed()
  const turnOffLed = () => {
    if (Settings.setLeds === "yes") {
      const sStylesLen = selectedStyles.length
      const sArtistsLen = selectedArtists.length

      // Turn off the lights
      Leds.setLeds({
        place,
        noreset: !!(sStylesLen || sArtistsLen),
        color: sStylesLen
          ? Settings.ledsStylesColor
          : sArtistsLen
            ? Settings.ledsArtistsColor
            : "0,0,0",
      })
    }
  }

  // METHOD onHide()
  const onHide = () => {
    const { changes } = getSaveActionInfo()

    // If no changes, just close modal
    if (!Object.keys(changes).length) {
      turnOffLed()
      setModalData({ ...modalData, show: false })
      return
    }

    // If changes, ask for confirmation before saving
    setShowConfirm(true)
  }

  // METHOD onRatingClick()
  const onRatingClick = (value) => setModalData({ ...modalData, rating: value })

  // METHOD onChange()
  const onChange = (e) => {
    const el = e.target
    setModalData({ ...modalData, [el.dataset.field]: el.value })
  }

  // METHOD onReset()
  // FIXME Discogs API oddness | const onReset = () => setModalData({...modalData, rating: 0});

  // RENDER
  return (
    <>
      <ConfirmModal action={onSave} show={showConfirm} setShow={onHideConfirm}>
        {_("Save changes?")}
      </ConfirmModal>
      <Modal
        show={show}
        onHide={onHide}
        className="AlbumModal"
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>{maintitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered size="sm">
            <tbody>
              <tr>
                <th>
                  {_("Note")}{" "}
                  {/* FIXME Discogs API oddness
                  {rating ? (
                  <FontAwesomeIcon
                    icon={faTimes}
                    size="lg"
                    className="reset"
                    onClick={onReset}
                  />
                ) : (
                  ''
                )
                */}
                </th>
                <td className="rating">
                  <Rating
                    size="20"
                    onClick={onRatingClick}
                    initialValue={rating}
                  />{" "}
                </td>
                <td rowSpan={4 + discogsFieldsCount} className="modal-icon">
                  <ImageGallery
                    ref={refIG}
                    onClick={handleIGClick}
                    showPlayButton={false}
                    showThumbnails={false}
                    items={[{ original: cover || vinylImg300 }]}
                  />
                  <AlbumButton closeModal={onHide} artist={artist} />
                </td>
              </tr>
              {fieldsId.placeId && (
                <tr>
                  <th>{_("Location")}</th>
                  <td className="place">
                    <Form.Control
                      type="text"
                      size="xs"
                      defaultValue={place}
                      placeholder={_("storage place")}
                      data-field="place"
                      onChange={onChange}
                    />
                  </td>
                </tr>
              )}
              {fieldsId.priceId && (
                <tr>
                  <th>{_("Purchasing price")}</th>
                  <td>
                    <Form.Control
                      type="text"
                      className="price"
                      size="xs"
                      defaultValue={price}
                      placeholder={_("price")}
                      data-field="price"
                      onChange={onChange}
                    />{" "}
                    {Settings.currency || "€"}
                  </td>
                </tr>
              )}
              <tr>
                <th>{_("Origine")}</th>
                <td>{country}</td>
              </tr>
              <tr>
                <th>{_("Style")}</th>
                <td>
                  <AlbumStyleButtons closeModal={onHide} items={styles} />
                </td>
              </tr>
              <tr>
                <th>{_("Format")}</th>
                <td>{format}</td>
              </tr>
              <tr>
                <td colSpan="3" align="center">
                  <a
                    href={`https://www.discogs.com/release/${releaseid}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <img
                      alt="Discogs"
                      className="discogs-logo"
                      src={discogsLogo}
                    />
                  </a>
                </td>
              </tr>
            </tbody>
          </Table>
          {(notes || tracklist) && (
            <Tabs
              defaultActiveKey={
                tracklist ? "album-tracks" : notes ? "album-infos" : ""
              }
            >
              {notes && (
                <Tab
                  eventKey="album-infos"
                  title={_("Info")}
                  className="album-infos"
                >
                  {notes}
                </Tab>
              )}
              {tracklist && (
                <Tab
                  eventKey="album-tracks"
                  title={_("Tracks")}
                  className="album-tracks"
                >
                  <ul>{tracklist}</ul>
                </Tab>
              )}
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onHide}>{_("Close")}</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default AlbumModal
