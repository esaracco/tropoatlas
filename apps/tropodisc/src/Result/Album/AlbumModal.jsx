import React, { useState, useRef } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"
import {
  Modal,
  Button,
  Table,
  Tab,
  Tabs,
  Form,
  InputGroup,
} from "react-bootstrap"
import { toast } from "react-toastify"
import processString from "react-process-string"

import ImageGallery from "react-image-gallery"
import "react-image-gallery/styles/image-gallery.css"
import { Rating } from "react-simple-star-rating"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPen } from "@fortawesome/free-solid-svg-icons"

import { ConfirmModal } from "@tropo/react"
import AlbumStyleButtons from "./AlbumStyleButtons"
import ArtistAlbumsButton from "./ArtistAlbumsButton"
import { setLatestClickedInstanceId } from "./index"

import { getItem, setLargeItem, setItem } from "@tropo/core"
import { updateItem, getCategories, getProviderInfo } from "../../provider"
import * as Settings from "../../utils/settings"

import vinylImg300 from "../../assets/vinyl-300.png"

import "./styles/AlbumModal.css"

// METHOD getTracks()
const getTracks = (tracklist) => {
  if (!tracklist || !Array.isArray(tracklist)) return null
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
            <li className="track-item d-flex align-items-baseline gap-2">
              <span className="track-position">{item.position}</span>
              <span className="track-title flex-grow-1">{item.title}</span>
              {item.duration && (
                <span className="track-duration">{item.duration}</span>
              )}
            </li>
          </>
        )
        break
      default:
    }
  })

  return tracks
}

// COMPONENT AlbumModal
const AlbumModal = ({ instanceId, onClose }) => {
  const setItems = useCollectionStore((s) => s.setItems)
  const setCategories = useCollectionStore((s) => s.setCategories)
  const setFilter = useCollectionStore((s) => s.setFilter)
  const selectedCategories = useCollectionStore((s) => s.selected.categories)
  const releases = useCollectionStore((s) => s.items)

  const release = releases ? releases[instanceId] : null

  const [showConfirm, setShowConfirm] = useState(false)
  const [formState, setFormState] = useState({
    rating: release?.rating ?? 0,
    place: release?.place ?? "",
    price: release?.price ?? "",
  })

  const [_] = useTranslation()
  const refIG = useRef(null)
  const customFields = getItem("customFieldsInfo") || {}
  let customFieldsCount = 0

  if (customFields.supportsPlace) {
    ++customFieldsCount
  }
  if (customFields.supportsPrice) {
    ++customFieldsCount
  }

  if (!release) return null

  // METHOD handleIGClick()
  const handleIGClick = () => {
    if (refIG.current && refIG.current.toggleFullScreen) {
      refIG.current.toggleFullScreen()
    }
  }

  // METHOD getSaveActionInfo()
  const getSaveActionInfo = () => {
    const categories = (() => {
      const r = []
      document
        .querySelectorAll(".AlbumStyleButtons tag")
        .forEach((t) => r.push(t.getAttribute("value")))
      return r.slice().sort()
    })()
    const releasesClone = { ...releases }
    const releaseClone = { ...releasesClone[instanceId] }
    const changes = {}

    const currentRating = formState.rating ?? 0
    const originalRating = releaseClone.rating ?? 0
    if (currentRating !== originalRating) {
      changes.rating = formState.rating
    }

    const currentPlace = String(formState.place ?? "").trim()
    const originalPlace = String(releaseClone.place ?? "").trim()
    if (currentPlace !== originalPlace) {
      changes.place = formState.place
    }

    const currentPrice = String(formState.price ?? "").trim()
    const originalPrice = String(releaseClone.price ?? "").trim()
    if (currentPrice !== originalPrice) {
      changes.price = formState.price
    }

    if (customFields.supportsCategories) {
      const currentCategories = categories.join(",")
      const originalCategories = (releaseClone.categories || [])
        .slice()
        .sort()
        .join(",")
      if (currentCategories !== originalCategories) {
        changes.categories = categories
      }
    }

    return { releasesClone, release: releaseClone, changes }
  }

  // METHOD onSave()
  const onSave = async () => {
    const {
      releasesClone,
      release: releaseToUpdate,
      changes,
    } = getSaveActionInfo()

    onHideConfirm()

    // Optimistic UI update
    if (changes.categories) {
      releaseToUpdate.categories = changes.categories
    }
    releasesClone[instanceId] = {
      ...releaseToUpdate,
      place: formState.place,
      price: formState.price,
      rating: formState.rating,
    }
    setItems(releasesClone)
    setLargeItem("releases", releasesClone)

    if (changes.categories) {
      // Rebuild global categories list
      const allCategories = getCategories(releasesClone)
      setCategories(allCategories)
      setItem("styles", allCategories)
      // Remove non-existent categories if previously selected
      setFilter(
        "categories",
        selectedCategories.filter((s) => allCategories.indexOf(s) > -1),
      )
    }

    try {
      await updateItem(releaseToUpdate, changes)
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
          _(e.message) ||
            _("An error occurred while using the {{provider}} API!", {
              provider: getProviderInfo().name,
            }),
          { autoClose: false },
        )
      }
    }
  }

  // METHOD onHideConfirm()
  const onHideConfirm = () => {
    setLatestClickedInstanceId(null)
    setShowConfirm(false)
    onClose()
  }

  // METHOD onHide()
  const onHide = () => {
    const { changes } = getSaveActionInfo()

    // If no changes, just close modal
    if (!Object.keys(changes).length) {
      setLatestClickedInstanceId(null)
      onClose()
      return
    }

    // If changes, ask for confirmation before saving
    setShowConfirm(true)
  }

  // METHOD onRatingClick()
  const onRatingClick = (value) =>
    setFormState((prev) => ({ ...prev, rating: value }))

  // METHOD onChange()
  const onChange = (e) => {
    const el = e.target
    setFormState((prev) => ({ ...prev, [el.dataset.field]: el.value }))
  }

  // METHOD renderNotes()
  const renderNotes = () => {
    if (!release.notes && !release.globalNotes) return null
    const config = [
      {
        regex: /\[([^\]]+)\]\(([^)]+)\)/g,
        fn: (k, r) => (
          <a key={k} href={r[2]} rel="noopener noreferrer" target="_blank">
            {r[1]}
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

    if (release.notes && release.globalNotes) {
      return (
        <>
          <div>
            {_("This copy")} ({release.country}
            {release.year ? " " + release.year : ""}) :
          </div>
          <div className="release" style={{ whiteSpace: "pre-wrap" }}>
            {processString(config)(release.notes)}
          </div>
          <br />
          <div>{_("General informations")} :</div>
          <div className="master" style={{ whiteSpace: "pre-wrap" }}>
            {processString(config)(release.globalNotes)}
          </div>
        </>
      )
    }

    return (
      <div style={{ whiteSpace: "pre-wrap" }}>
        {processString(config)(
          release.notes ? release.notes : release.globalNotes,
        )}
      </div>
    )
  }

  const renderedTracks = getTracks(release.tracklist)
  const renderedNotes = renderNotes()

  // RENDER
  return (
    <>
      <ConfirmModal action={onSave} show={showConfirm} setShow={onHideConfirm}>
        {_("Save changes?")}
      </ConfirmModal>
      <Modal
        show={true}
        onHide={onHide}
        className="AlbumModal"
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="artist-name">{release.creator}</div>
            <div className="album-details">
              {release.year ? release.year + " - " : ""}
              <strong>{release.title}</strong>
              <br />
              <em>
                {[release.format, release.country].filter(Boolean).join(", ")}
              </em>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table borderless size="sm">
            <tbody>
              <tr>
                <th>{_("Note")} </th>
                <td className="rating">
                  <Rating
                    size="20"
                    onClick={onRatingClick}
                    initialValue={formState.rating}
                  />{" "}
                </td>
                <td rowSpan={4 + customFieldsCount} className="modal-icon">
                  <ImageGallery
                    ref={refIG}
                    onClick={handleIGClick}
                    showPlayButton={false}
                    showThumbnails={false}
                    items={[{ original: release.cover || vinylImg300 }]}
                  />
                  <ArtistAlbumsButton
                    closeModal={onHide}
                    artist={release.creator}
                  />
                </td>
              </tr>
              {customFields.supportsPlace && (
                <tr>
                  <th>{_("Location")}</th>
                  <td>
                    <InputGroup size="sm" className="place-input-group">
                      <InputGroup.Text className="place-icon-addon">
                        <FontAwesomeIcon icon={faPen} />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        className="place-control"
                        defaultValue={formState.place}
                        placeholder={_("storage place")}
                        data-field="place"
                        onChange={onChange}
                      />
                    </InputGroup>
                  </td>
                </tr>
              )}
              {customFields.supportsPrice && (
                <tr>
                  <th>{_("Purchasing price")}</th>
                  <td>
                    <InputGroup size="sm" className="price-input-group">
                      <InputGroup.Text className="price-icon-addon">
                        <FontAwesomeIcon icon={faPen} />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        className="price-control"
                        defaultValue={formState.price}
                        data-field="price"
                        onChange={onChange}
                      />
                      <InputGroup.Text className="price-currency-addon">
                        {Settings.getCurrency() || "€"}
                      </InputGroup.Text>
                    </InputGroup>
                  </td>
                </tr>
              )}
              <tr>
                <th>{_("Style")}</th>
                <td>
                  <AlbumStyleButtons
                    closeModal={onHide}
                    categories={release.categories}
                  />
                </td>
              </tr>
            </tbody>
          </Table>
          <hr />
          {(renderedNotes || renderedTracks) && (
            <Tabs
              defaultActiveKey={
                renderedTracks
                  ? "album-tracks"
                  : renderedNotes
                    ? "album-infos"
                    : ""
              }
            >
              {renderedNotes && (
                <Tab
                  eventKey="album-infos"
                  title={_("Info")}
                  className="album-infos"
                >
                  {renderedNotes}
                </Tab>
              )}
              {renderedTracks && (
                <Tab
                  eventKey="album-tracks"
                  title={_("Tracks")}
                  className="album-tracks"
                >
                  <ul>{renderedTracks}</ul>
                </Tab>
              )}
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between align-items-center">
          {release.externalUrl && (
            <Button
              variant="outline-secondary"
              size="sm"
              href={release.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="provider-link-btn d-inline-flex align-items-center"
              title={_("View release on {{provider}}", {
                provider: getProviderInfo().name,
              })}
              aria-label={_("View release on {{provider}}", {
                provider: getProviderInfo().name,
              })}
            >
              <span className="provider-logo-wrapper">
                <img
                  alt={getProviderInfo().name}
                  className="provider-logo"
                  src={getProviderInfo().logo}
                />
              </span>
              <span className="provider-link-icon">↗</span>
            </Button>
          )}
          <Button variant="secondary" onClick={onHide}>
            {_("Close")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default AlbumModal
