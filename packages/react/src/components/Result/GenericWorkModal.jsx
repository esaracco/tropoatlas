import React, { useEffect, useState, useRef } from "react"
import {
  useCollectionStore,
  getItem,
  setLargeItem,
  setItem,
  formatRating,
  cleanPrice,
  getPluginTerminology,
} from "@tropo/core"
import { useTranslation } from "react-i18next"
import { Modal, Button, Table, Form, InputGroup } from "react-bootstrap"
import { toast } from "react-toastify"

import ImageGallery from "react-image-gallery"
import "react-image-gallery/styles/image-gallery.css"
import { Rating } from "react-simple-star-rating"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPen, faUser, faTimes } from "@fortawesome/free-solid-svg-icons"

import ConfirmModal from "../../ConfirmModal/index.jsx"
import WorkCategoryButtons from "./WorkCategoryButtons"

import "./styles/WorkModal.css"

export const GenericWorkModal = ({
  instanceId,
  onClose,
  plugin,
  renderExtraTabs,
  placeholder,
  currency,
  renderHeaderDetails,
  renderExtraRows,
}) => {
  const terminology = getPluginTerminology(plugin)
  const canResetRating = plugin?.canResetRating ? plugin.canResetRating() : true
  const setItems = useCollectionStore((s) => s.setItems)
  const setCategories = useCollectionStore((s) => s.setCategories)
  const setFilter = useCollectionStore((s) => s.setFilter)
  const selectedCategories = useCollectionStore((s) => s.selected.categories)
  const releases = useCollectionStore((s) => s.items)
  const [count, setCount] = useState(0)

  const release = releases ? releases[instanceId] : null
  const publicRating = plugin?.getPublicRating
    ? plugin.getPublicRating(release)
    : null

  const [showConfirm, setShowConfirm] = useState(false)
  const [formState, setFormState] = useState({
    rating: release?.rating ?? 0,
    place: release?.place ?? "",
    price: release?.price ?? "",
  })

  // Enrich item details in background when modal opens
  useEffect(() => {
    const isDetailed = plugin?.isItemDetailed
      ? plugin.isItemDetailed(release)
      : Boolean(release?.hasDetails)

    if (!release || isDetailed) {
      return
    }

    let isMounted = true

    plugin
      .getItemDetails(release)
      .then((updatedRelease) => {
        if (!isMounted || !updatedRelease) return
        const currentItems = useCollectionStore.getState().items
        const newItems = {
          ...currentItems,
          [instanceId]: { ...currentItems[instanceId], ...updatedRelease },
        }
        setItems(newItems)
        setLargeItem("items", newItems)
      })
      .catch((err) => {
        console.warn("Could not enrich release details:", err)
      })

    return () => {
      isMounted = false
    }
  }, [instanceId, release?.hasDetails])

  const { t } = useTranslation()
  const refIG = useRef(null)
  const customFields = getItem("customFieldsInfo") || {}
  let haveCustomFields =
    customFields.supportsPlace ||
    customFields.supportsPrice ||
    customFields.supportsCategories

  useEffect(() => {
    if (!release) return null

    let c = 0
    if (releases) {
      for (const key in releases) {
        if (releases[key].creator === release.creator) {
          c++
        }
      }
    }
    setCount(c)
  }, [release, releases])

  // METHOD handleIGClick()
  const handleIGClick = () => {
    if (refIG.current && refIG.current.toggleFullScreen) {
      refIG.current.toggleFullScreen()
    }
  }

  // METHOD getSaveActionInfo()
  const getSaveActionInfo = () => {
    const categories = Array.from(
      document.querySelectorAll(".WorkCategoryButtons tag .tagify__tag-text"),
      (t) => t.textContent,
    ).sort()
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

    const currentPrice = cleanPrice(formState.price)
    const originalPrice = cleanPrice(releaseClone.price)
    if (currentPrice !== originalPrice) {
      changes.price = currentPrice
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
      price: cleanPrice(formState.price),
      rating: formState.rating,
    }
    setItems(releasesClone)
    setLargeItem("items", releasesClone)

    if (changes.categories) {
      // Rebuild global categories list
      const allCategories = plugin.getCategories(releasesClone)
      setCategories(allCategories)
      setItem("categories", allCategories)
      // Remove non-existent categories if previously selected
      setFilter(
        "categories",
        selectedCategories.filter((s) => allCategories.indexOf(s) > -1),
      )
    }

    try {
      await plugin.updateItem(releaseToUpdate, changes)
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
          t(e.message) ||
            t("An error occurred while using the {{provider}} API!", {
              provider: plugin.getProviderInfo().name,
            }),
          { autoClose: false },
        )
      }
    }
  }

  // METHOD onHideConfirm()
  const onHideConfirm = () => {
    setShowConfirm(false)
    onClose()
  }

  // METHOD onHide()
  const onHide = () => {
    const { changes } = getSaveActionInfo()

    if (!Object.keys(changes).length) {
      onClose()
      return
    }

    // If changes, ask for confirmation before saving
    setShowConfirm(true)
  }

  // METHOD onResetRating()
  const onResetRating = (e) => {
    e.stopPropagation()
    setFormState((prev) => ({ ...prev, rating: 0 }))
  }

  // METHOD onRatingClick()
  const onRatingClick = (value) =>
    setFormState((prev) => ({ ...prev, rating: value }))

  // METHOD onChange()
  const onChange = (e) => {
    const el = e.target
    setFormState((prev) => ({ ...prev, [el.dataset.field]: el.value }))
  }

  const providerUrl =
    release?.externalUrl ||
    (plugin?.getItemExternalUrl ? plugin.getItemExternalUrl(release) : null)

  // RENDER
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
                  items={[{ original: release.cover || placeholder }]}
                />
              </div>
              <div className="modal-header-info">
                <div className="creator-name">{release.creator}</div>
                <div className="work-details">
                  {release.year ? release.year + " – " : ""}
                  <strong>{release.title}</strong>
                  {renderHeaderDetails ? renderHeaderDetails(release) : null}
                  {count > 1 && (
                    <div>
                      <a
                        href="#"
                        onClick={() => {
                          setFilter("creators", [release.creator])
                          onHide()
                        }}
                        title={t(
                          "Show all {{count}} {{items}} by {{creator}}",
                          {
                            count,
                            creator: release.creator,
                            items: t(terminology.items),
                          },
                        )}
                      >
                        <FontAwesomeIcon icon={faUser} /> <b>{count}</b>{" "}
                        <span>{t(terminology.items)}</span>
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
                    {canResetRating && formState.rating > 0 && (
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
              {publicRating && publicRating.score > 0 && (
                <tr>
                  <th>
                    {t(
                      publicRating.label ||
                        terminology.communityRating ||
                        "Community rating",
                    )}
                  </th>
                  <td
                    style={{ fontSize: "0.8rem", color: "var(--tropo-text)" }}
                  >
                    ★{" "}
                    {formatRating(
                      publicRating.score,
                      publicRating.max === 10 ? 1 : 2,
                    )}{" "}
                    / {publicRating.max}
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
                        {currency || "$"}
                      </InputGroup.Text>
                    </InputGroup>
                  </td>
                </tr>
              )}
              {customFields.supportsCategories && (
                <tr>
                  <th>{t(terminology.categories)}</th>
                  <td>
                    <WorkCategoryButtons
                      plugin={plugin}
                      closeModal={onHide}
                      categories={release.categories}
                    />
                  </td>
                </tr>
              )}
              {renderExtraRows
                ? renderExtraRows(release, { onHide, setFilter })
                : null}
            </tbody>
          </Table>
          {haveCustomFields && <hr />}
          {renderExtraTabs ? renderExtraTabs(instanceId, release) : null}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between align-items-center">
          {providerUrl && (
            <Button
              variant="outline-secondary"
              size="sm"
              href={providerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="provider-link-btn d-inline-flex align-items-center"
              title={t(terminology.viewOnProvider || "View on {{provider}}", {
                provider: plugin.getProviderInfo().name,
              })}
              aria-label={t(
                terminology.viewOnProvider || "View on {{provider}}",
                {
                  provider: plugin.getProviderInfo().name,
                },
              )}
            >
              <span className="provider-logo-wrapper">
                <img
                  alt={plugin.getProviderInfo().name}
                  className="provider-logo"
                  src={plugin.getProviderInfo().logo}
                />
              </span>
              <span className="provider-link-icon">↗</span>
            </Button>
          )}
          <Button variant="secondary" onClick={onHide}>
            {t("Close")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
