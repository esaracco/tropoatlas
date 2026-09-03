import React, { useEffect, useState, useRef } from "react"
import { useCollectionStore } from "@tropo/core"
import { useTranslation } from "react-i18next"
import { Modal, Button, Table, Tab, Tabs } from "react-bootstrap"
import { Rating } from "react-simple-star-rating"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUser } from "@fortawesome/free-solid-svg-icons"
import ImageGallery from "react-image-gallery"
import "react-image-gallery/styles/image-gallery.css"

import { getProviderInfo } from "../../provider"
import filmPlaceholder from "../../assets/film.svg"
import "./styles/AlbumModal.css"

const AlbumModal = ({ instanceId, onClose }) => {
  const setFilter = useCollectionStore((s) => s.setFilter)
  const releases = useCollectionStore((s) => s.items)
  const [count, setCount] = useState(0)
  const refIG = useRef(null)

  const release = releases ? releases[instanceId] : null
  const { t } = useTranslation()

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

  if (!release) return null

  return (
    <Modal
      show={Boolean(instanceId)}
      onHide={onClose}
      className="AlbumModal"
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
                items={[{ original: release.cover || filmPlaceholder }]}
              />
            </div>
            <div className="modal-header-info">
              <div className="artist-name">{release.creator}</div>
              <div className="album-details">
                {release.year ? release.year + " – " : ""}
                <strong>{release.title}</strong>
                {count > 1 && (
                  <div>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setFilter("creators", [release.creator])
                        onClose()
                      }}
                      title={t("Show all {{count}} movies by {{artist}}", {
                        count,
                        artist: release.creator,
                      })}
                    >
                      <FontAwesomeIcon icon={faUser} /> <b>{count}</b>{" "}
                      <span>{t("movies")}</span>
                    </a>
                  </div>
                )}
                <div>
                  <Rating
                    size="20"
                    initialValue={release.rating || 0}
                    readonly={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Table borderless size="sm">
          <tbody>
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
                          onClose()
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
            {release.runtime && (
              <tr>
                <th>{t("Runtime")}</th>
                <td style={{ fontSize: "0.8rem", color: "var(--tropo-text)" }}>
                  {release.runtime} min
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
                          onClose()
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

        {release.overview && (
          <>
            <hr />
            <Tabs defaultActiveKey="album-infos">
              <Tab
                eventKey="album-infos"
                title={t("Info")}
                className="album-infos"
              >
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {release.overview}
                </div>
              </Tab>
            </Tabs>
          </>
        )}
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
        <Button variant="secondary" onClick={onClose}>
          {t("Close")}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default AlbumModal
