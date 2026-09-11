import React, { useEffect, useState, useRef } from "react"
import {
  useCollectionStore,
  getItem,
  setLargeItem,
  formatRating,
} from "@tropo/core"
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
import { Rating } from "react-simple-star-rating"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faInfoCircle,
  faPen,
  faTimes,
  faUser,
} from "@fortawesome/free-solid-svg-icons"
import { ConfirmModal } from "@tropo/react"
import { toast } from "react-toastify"
import ImageGallery from "react-image-gallery"
import "react-image-gallery/styles/image-gallery.css"

import {
  updateItem,
  getDraftCapabilities,
  getProviderInfo,
} from "../../provider"
import { getCurrency } from "../../utils/settings"
import workPlaceholder from "../../assets/film.svg"
import "./styles/WorkModal.css"

const WorkModal = ({ instanceId, onClose }) => {
  const setItems = useCollectionStore((s) => s.setItems)
  const setFilter = useCollectionStore((s) => s.setFilter)
  const releases = useCollectionStore((s) => s.items)
  const [count, setCount] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const refIG = useRef(null)

  const release = releases ? releases[instanceId] : null
  const { t } = useTranslation()

  const customFields =
    getItem("customFieldsInfo") ||
    (getDraftCapabilities ? getDraftCapabilities({}) : {})

  const [formState, setFormState] = useState({
    rating: release?.rating ?? 0,
    place: release?.place ?? "",
    price: release?.price ?? "",
  })

  useEffect(() => {
    if (release) {
      setFormState({
        rating: release.rating ?? 0,
        place: release.place ?? "",
        price: release.price ?? "",
      })
    }
  }, [instanceId])

  useEffect(() => {
    if (!release) return

    let c = 0
    if (releases && release.creator) {
      for (const key in releases) {
        const item = releases[key]
        if (
          item.creator === release.creator ||
          (item.cast && item.cast.includes(release.creator))
        ) {
          c++
        }
      }
    }
    setCount(c)
  }, [release, releases])

  const handleIGClick = () => {
    if (refIG.current && refIG.current.toggleFullScreen) {
      refIG.current.toggleFullScreen()
    }
  }

  const getSaveActionInfo = () => {
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

    return { releasesClone, release: releaseClone, changes }
  }

  const onSave = async () => {
    const {
      releasesClone,
      release: releaseToUpdate,
      changes,
    } = getSaveActionInfo()
    onHideConfirm()

    // Optimistic UI update
    releasesClone[instanceId] = {
      ...releaseToUpdate,
      place: formState.place,
      price: formState.price,
      rating: formState.rating,
    }
    setItems(releasesClone)
    setLargeItem("items", releasesClone)

    try {
      const updated = await updateItem(releaseToUpdate, changes)
      if (updated) {
        releasesClone[instanceId] = {
          ...releasesClone[instanceId],
          ...updated,
        }
        setItems(releasesClone)
        setLargeItem("items", releasesClone)
      }
    } catch (e) {
      if (!navigator.onLine) {
        toast.info(
          t(
            "You are offline. Your changes have been saved locally and will be synchronized when the connection is restored.",
          ),
          { autoClose: false },
        )
      } else {
        console.error(e.message)
        toast.error(
          t(e.message, { provider: getProviderInfo().name }) ||
            t("An error occurred while using the {{provider}} API!", {
              provider: getProviderInfo().name,
            }),
          { autoClose: false },
        )
      }
    }
  }

  const onHideConfirm = () => {
    setShowConfirm(false)
    onClose()
  }

  const onHide = () => {
    const { changes } = getSaveActionInfo()
    if (!Object.keys(changes).length) {
      onClose()
      return
    }
    setShowConfirm(true)
  }

  const onRatingClick = (value) =>
    setFormState((prev) => ({ ...prev, rating: value }))

  const onResetRating = () => setFormState((prev) => ({ ...prev, rating: 0 }))

  const onChange = (e) => {
    const el = e.target
    setFormState((prev) => ({ ...prev, [el.dataset.field]: el.value }))
  }

  if (!release) return null

  return (
    <>
      <ConfirmModal action={onSave} show={showConfirm} setShow={onHideConfirm}>
        {t("Save changes?")}
      </ConfirmModal>
      <Modal
        show={true}
        onHide={onHide}
        className="WorkModal"
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="modal-header-content">
              <div className="modal-icon">
                <ImageGallery
                  ref={refIG}
                  onClick={handleIGClick}
                  showPlayButton={false}
                  showThumbnails={false}
                  items={[{ original: release.cover || workPlaceholder }]}
                />
              </div>
              <div className="modal-header-info">
                <div className="creator-name">{release.creator}</div>
                <div className="work-details">
                  {release.year ? release.year + " – " : ""}
                  <strong>{release.title}</strong>
                  {release.runtime && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--tropo-text)",
                        fontStyle: "italic",
                      }}
                    >
                      {release.runtime} min
                    </div>
                  )}
                  {count > 1 && (
                    <div>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setFilter("creators", [release.creator])
                          onHide()
                        }}
                        title={t("Show all {{count}} movies by {{creator}}", {
                          count,
                          creator: release.creator,
                        })}
                      >
                        <FontAwesomeIcon icon={faUser} /> <b>{count}</b>{" "}
                        <span>{t("movies")}</span>
                      </a>
                    </div>
                  )}
                  <div className="rating-container">
                    <Rating
                      key={formState.rating}
                      size="20"
                      onClick={onRatingClick}
                      initialValue={formState.rating}
                    />
                    {formState.rating > 0 && (
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="reset rating-reset"
                        onClick={onResetRating}
                        title={t("Reset rating")}
                        aria-label={t("Reset rating")}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table borderless size="sm">
            <tbody>
              {release.vote_average > 0 && (
                <tr>
                  <th>{t("TMDB rating")}</th>
                  <td
                    style={{ fontSize: "0.8rem", color: "var(--tropo-text)" }}
                  >
                    ★ {formatRating(release.vote_average, 1)} / 10
                  </td>
                </tr>
              )}
              {customFields.supportsPlace && (
                <tr>
                  <th>{t("Location")}</th>
                  <td>
                    <InputGroup size="sm" className="place-input-group">
                      <InputGroup.Text className="place-icon-addon">
                        <FontAwesomeIcon icon={faPen} />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        className="place-control"
                        value={formState.place ?? ""}
                        placeholder={t("storage place")}
                        data-field="place"
                        onChange={onChange}
                      />
                    </InputGroup>
                  </td>
                </tr>
              )}
              {customFields.supportsPrice && (
                <tr>
                  <th>{t("Purchasing price")}</th>
                  <td>
                    <InputGroup size="sm" className="price-input-group">
                      <InputGroup.Text className="price-icon-addon">
                        <FontAwesomeIcon icon={faPen} />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        className="price-control"
                        value={formState.price ?? ""}
                        placeholder="0.00"
                        data-field="price"
                        onChange={onChange}
                      />
                      <InputGroup.Text className="price-currency-addon">
                        {getCurrency() || "€"}
                      </InputGroup.Text>
                    </InputGroup>
                  </td>
                </tr>
              )}
              {release.categories && release.categories.length > 0 && (
                <tr>
                  <th>{t("Genres")}</th>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {release.categories.map((c, i) => (
                        <span
                          key={i}
                          className="genre-tag"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setFilter("categories", [c])
                            onHide()
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              {release.cast && release.cast.length > 0 && (
                <tr>
                  <th>{t("Cast")}</th>
                  <td>
                    <div
                      className="d-flex flex-wrap gap-1"
                      style={{
                        maxWidth: "340px",
                      }}
                    >
                      {release.cast.map((actor, idx) => (
                        <span
                          key={idx}
                          className="genre-tag"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setFilter("creators", [actor])
                            onHide()
                          }}
                          title={t("Filter by {{person}}", { person: actor })}
                        >
                          {actor}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <hr />
          <Tabs defaultActiveKey="work-infos">
            <Tab eventKey="work-infos" title={t("Info")} className="work-infos">
              {release.overview ? (
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {release.overview}
                </div>
              ) : (
                <div className="description-empty">
                  <FontAwesomeIcon icon={faInfoCircle} />
                  <span>{t("No description available.")}</span>
                </div>
              )}
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between align-items-center">
          <Button
            variant="outline-secondary"
            size="sm"
            href={`https://www.themoviedb.org/movie/${release.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="provider-link-btn d-inline-flex align-items-center"
            title={t("View release on {{provider}}", {
              provider: getProviderInfo().name,
            })}
            aria-label={t("View release on {{provider}}", {
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
          <Button variant="secondary" onClick={onHide}>
            {t("Close")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default WorkModal
