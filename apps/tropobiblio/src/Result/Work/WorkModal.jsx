import React, { useEffect, useState, useRef, useMemo } from "react"
import { useCollectionStore, getItem, setLargeItem, setItem } from "@tropo/core"
import { useTranslation } from "react-i18next"
import {
  Modal,
  Button,
  Table,
  Tab,
  Tabs,
  Form,
  InputGroup,
  Spinner,
} from "react-bootstrap"
import { toast } from "react-toastify"
import ImageGallery from "react-image-gallery"
import "react-image-gallery/styles/image-gallery.css"
import { Rating } from "react-simple-star-rating"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faInfoCircle,
  faPen,
  faTimes,
  faUser,
} from "@fortawesome/free-solid-svg-icons"
import { ConfirmModal } from "@tropo/react"

import WorkCategoryButtons from "./WorkCategoryButtons"
import {
  updateItem,
  getCategories,
  getItemDetails,
  getProviderInfo,
  getDraftCapabilities,
} from "../../provider"
import * as Settings from "../../utils/settings"
import workPlaceholder from "../../assets/book.svg"
import "./styles/WorkModal.css"

const WorkModal = ({ instanceId, onClose }) => {
  const setItems = useCollectionStore((s) => s.setItems)
  const setCategories = useCollectionStore((s) => s.setCategories)
  const setFilter = useCollectionStore((s) => s.setFilter)
  const selectedCategories = useCollectionStore((s) => s.selected.categories)
  const works = useCollectionStore((s) => s.items)
  const [count, setCount] = useState(0)

  const work = works ? works[instanceId] : null

  // Item is enriched if Wikipedia was found or checked, unless corrupted
  // by OpenLibrary overwriting Wikipedia
  const isEnriched = Boolean(
    work?.hasDetails &&
    (work?.hasWikipedia || work?.wikipediaChecked) &&
    !((work?.hasWikipedia || work?.wikipediaUrl) && work?.hasOpenLibrary),
  )

  const [loadingDetails, setLoadingDetails] = useState(
    Boolean(work && !isEnriched),
  )

  const [showConfirm, setShowConfirm] = useState(false)
  const [formState, setFormState] = useState({
    rating: work?.rating ?? 0,
    place: work?.place ?? "",
    price: work?.price ?? "",
  })

  // Enrich item details in background when modal opens
  useEffect(() => {
    if (!work || isEnriched) {
      setLoadingDetails(false)
      return
    }

    let isMounted = true
    setLoadingDetails(true)

    getItemDetails(work)
      .then((updatedWork) => {
        if (!isMounted || !updatedWork) return
        const currentWorks = useCollectionStore.getState().items
        const newWorks = {
          ...currentWorks,
          [instanceId]: { ...currentWorks[instanceId], ...updatedWork },
        }
        setItems(newWorks)
        setLargeItem("items", newWorks)
      })
      .catch((err) => {
        console.warn("Could not enrich book details:", err)
      })
      .finally(() => {
        if (isMounted) {
          setLoadingDetails(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [instanceId, isEnriched])

  const { t } = useTranslation()
  const refIG = useRef(null)
  const customFields =
    getItem("customFieldsInfo") ||
    (getDraftCapabilities ? getDraftCapabilities({}) : {})
  const haveCustomFields =
    customFields.supportsPlace ||
    customFields.supportsPrice ||
    customFields.supportsCategories

  const workCreators = useMemo(() => {
    if (!work) return []
    if (Array.isArray(work.creators) && work.creators.length > 0) {
      return work.creators
    }
    if (work.creator) {
      return work.creator
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
    return []
  }, [work])

  useEffect(() => {
    if (!work || workCreators.length === 0) {
      setCount(0)
      return
    }

    let c = 0
    if (works) {
      for (const key in works) {
        const item = works[key]
        const itemCreators =
          Array.isArray(item.creators) && item.creators.length > 0
            ? item.creators
            : item.creator
              ? item.creator
                  .split(/[,;]+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : []
        if (itemCreators.some((auth) => workCreators.includes(auth))) {
          c++
        }
      }
    }
    setCount(c)
  }, [work, works, workCreators])

  useEffect(() => {
    if (work) {
      setFormState({
        rating: work.rating ?? 0,
        place: work.place ?? "",
        price: work.price ?? "",
      })
    }
  }, [instanceId])

  const handleIGClick = () => {
    if (refIG.current && refIG.current.toggleFullScreen) {
      refIG.current.toggleFullScreen()
    }
  }

  const getSaveActionInfo = () => {
    let categories = Array.from(
      document.querySelectorAll(
        ".WorkCategoryButtons .tagify__tag-text, .WorkCategoryButtons tag .tagify__tag-text",
      ),
      (el) => el.textContent.trim(),
    )
      .filter(Boolean)
      .sort()

    if (categories.length === 0) {
      const inputEl = document.querySelector("input.WorkCategoryButtons")
      if (inputEl && inputEl.value) {
        try {
          const parsed = JSON.parse(inputEl.value)
          if (Array.isArray(parsed)) {
            categories = parsed
              .map((item) => item.value)
              .filter(Boolean)
              .sort()
          }
        } catch {
          // Non-JSON input value, ignore
        }
      }
    }

    const worksClone = { ...works }
    const workClone = { ...worksClone[instanceId] }
    const changes = {}

    const currentRating = formState.rating ?? 0
    const originalRating = workClone.rating ?? 0
    if (currentRating !== originalRating) {
      changes.rating = formState.rating
    }

    const currentPlace = String(formState.place ?? "").trim()
    const originalPlace = String(workClone.place ?? "").trim()
    if (currentPlace !== originalPlace) {
      changes.place = formState.place
    }

    const currentPrice = String(formState.price ?? "").trim()
    const originalPrice = String(workClone.price ?? "").trim()
    if (currentPrice !== originalPrice) {
      changes.price = formState.price
    }

    if (customFields.supportsCategories) {
      const currentCategories = categories.join(",")
      const originalCategories = (workClone.categories || [])
        .slice()
        .sort()
        .join(",")
      if (currentCategories !== originalCategories) {
        changes.categories = categories
      }
    }

    return { worksClone, work: workClone, changes }
  }

  const onSave = async () => {
    const { worksClone, work: workToUpdate, changes } = getSaveActionInfo()
    onHideConfirm()

    // Optimistic UI update
    if (changes.categories) {
      workToUpdate.categories = changes.categories
    }
    worksClone[instanceId] = {
      ...workToUpdate,
      place: formState.place,
      price: formState.price,
      rating: formState.rating,
    }
    setItems(worksClone)
    setLargeItem("items", worksClone)

    if (changes.categories) {
      // Rebuild global categories list
      const allCategories = getCategories(worksClone)
      setCategories(allCategories)
      setItem("categories", allCategories)
      // Filter out stale selections
      setFilter(
        "categories",
        selectedCategories.filter((s) => allCategories.indexOf(s) > -1),
      )
    }

    try {
      await updateItem(workToUpdate, changes)
      if (workToUpdate.notes) {
        worksClone[instanceId].notes = workToUpdate.notes
        setItems(worksClone)
        setLargeItem("items", worksClone)
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

  if (!work) return null

  const providerUrl = work.entityUri
    ? `https://inventaire.io/entity/${work.entityUri}`
    : getProviderInfo().url

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
                  onErrorImageURL={workPlaceholder}
                  items={[{ original: work.cover || workPlaceholder }]}
                />
              </div>
              <div className="modal-header-info">
                <div className="creator-name">{work.creator}</div>
                <div className="work-details">
                  {work.year ? work.year + " – " : ""}
                  <strong>{work.title}</strong>
                  {work.subtitle && (
                    <div className="work-subtitle">{work.subtitle}</div>
                  )}
                  {count > 1 && (
                    <div>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setFilter("creators", workCreators)
                          onHide()
                        }}
                        title={t("Show all {{count}} books by {{creator}}", {
                          count,
                          creator: work.creator,
                        })}
                      >
                        <FontAwesomeIcon icon={faUser} /> <b>{count}</b>{" "}
                        <span>{count > 1 ? t("books") : t("book")}</span>
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
                        defaultValue={formState.place}
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
              {customFields.supportsCategories && (
                <tr>
                  <th>{t("Genres")}</th>
                  <td>
                    <WorkCategoryButtons
                      closeModal={onHide}
                      categories={work.categories}
                      supportsCategories={customFields.supportsCategories}
                    />
                  </td>
                </tr>
              )}
              {work.publisher && (
                <tr>
                  <th>{t("Publisher")}</th>
                  <td>{work.publisher}</td>
                </tr>
              )}
              {work.pageCount && (
                <tr>
                  <th>{t("Pages")}</th>
                  <td>{work.pageCount}</td>
                </tr>
              )}
              <tr>
                <th>{t("ISBN")}</th>
                <td>
                  {work.isbn &&
                  !work.isbn.startsWith("inv:") &&
                  !work.isbn.startsWith("wd:") ? (
                    work.isbn
                  ) : (
                    <span className="text-muted fst-italic">
                      {t("No ISBN for this edition")}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </Table>
          {haveCustomFields && <hr />}
          <Tabs defaultActiveKey="work-description">
            <Tab
              eventKey="work-description"
              title={t("Description")}
              className="work-description"
            >
              {loadingDetails && (
                <div className="description-loading">
                  <Spinner animation="border" size="sm" />
                  <span>
                    {work.description
                      ? t("Enriching description...")
                      : t("Loading description...")}
                  </span>
                </div>
              )}
              {work.wikipediaUrl && work.wikipediaExact === false && (
                <div className="description-notice">
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="notice-icon"
                  />
                  <span>
                    {t(
                      'This description is from the related article "{{title}}" and may not directly summarize the work.',
                      {
                        title: work.wikipediaTitle || t("related topic"),
                      },
                    )}
                  </span>
                </div>
              )}
              {work.description && (
                <div style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
                  {work.description}
                </div>
              )}
              {!loadingDetails && !work.description && (
                <div className="description-empty">
                  <FontAwesomeIcon icon={faInfoCircle} />
                  <span>{t("No description available.")}</span>
                </div>
              )}
              {work.wikipediaUrl && (
                <div className="description-source">
                  <a
                    href={work.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="description-source-link"
                  >
                    {work.wikipediaTitle
                      ? t("Wikipedia article: {{title}}", {
                          title: work.wikipediaTitle,
                        })
                      : t("Wikipedia article")}{" "}
                    ↗
                  </a>
                </div>
              )}
              {!work.wikipediaUrl && work.openLibraryUrl && (
                <div className="description-source">
                  <a
                    href={work.openLibraryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="description-source-link"
                  >
                    {t("Open Library page")} ↗
                  </a>
                </div>
              )}
            </Tab>
          </Tabs>
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
              title={t("View book on {{provider}}", {
                provider: getProviderInfo().name,
              })}
              aria-label={t("View book on {{provider}}", {
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
            {t("Close")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default WorkModal
