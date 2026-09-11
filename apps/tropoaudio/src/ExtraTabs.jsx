import React from "react"
import { useTranslation } from "react-i18next"
import { Tabs, Tab, Spinner } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons"
import { useCollectionStore } from "@tropo/core"
import processString from "react-process-string"

const getTracks = (tracklist, prefix = "track") => {
  if (!tracklist || !Array.isArray(tracklist) || tracklist.length === 0) {
    return null
  }

  const elements = tracklist.flatMap((item, index) => {
    const key = `${prefix}-${index}-${item.position || ""}`

    switch (item.type_) {
      case "heading":
        return (
          <li key={key} className="heading">
            <b>{item.title}</b>
          </li>
        )
      case "index":
        return getTracks(item.sub_tracks, `${key}-sub`) || []
      case "track":
        return (
          <li
            key={key}
            className="track-item d-flex align-items-baseline gap-2"
          >
            <div className="position text-secondary" style={{ width: "2rem" }}>
              {item.position}
            </div>
            <div className="title text-truncate flex-grow-1">{item.title}</div>
            {item.duration && (
              <div
                className="duration text-secondary"
                style={{ width: "3.5rem" }}
              >
                <small>{item.duration}</small>
              </div>
            )}
          </li>
        )
      default:
        return []
    }
  })
  return elements.length > 0 ? elements : null
}

export const ExtraTabs = ({ instanceId }) => {
  const { t } = useTranslation()
  const release = useCollectionStore((s) => s.items[instanceId])
  if (!release) return null

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
      {
        regex: /\[(.+):\]/g,
        fn: (k, r) => <b key={k}>{r[1]}:</b>,
      },
    ]

    if (release.notes && release.globalNotes) {
      return (
        <>
          <div>
            {t("This copy")} ({release.country}
            {release.year ? " " + release.year : ""}) :
          </div>
          <div className="release" style={{ whiteSpace: "pre-wrap" }}>
            {processString(config)(release.notes)}
          </div>
          <br />
          <div>{t("General informations")} :</div>
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
  const loadingDetails = !release.hasDetails && release.tracklist === undefined

  return (
    <Tabs
      defaultActiveKey={
        renderedTracks || loadingDetails || !renderedNotes
          ? "work-tracks"
          : "work-infos"
      }
    >
      {renderedNotes && (
        <Tab eventKey="work-infos" title={t("Info")} className="work-infos">
          {renderedNotes}
        </Tab>
      )}
      <Tab eventKey="work-tracks" title={t("Tracks")} className="work-tracks">
        {loadingDetails && !renderedTracks && (
          <div className="description-loading">
            <Spinner animation="border" size="sm" />
            <span>{t("Loading details...")}</span>
          </div>
        )}
        {!loadingDetails && !renderedTracks && (
          <div className="description-empty">
            <FontAwesomeIcon icon={faInfoCircle} />
            <span>{t("No tracks available.")}</span>
          </div>
        )}
        {renderedTracks && <ul>{renderedTracks}</ul>}
      </Tab>
    </Tabs>
  )
}

export default ExtraTabs
