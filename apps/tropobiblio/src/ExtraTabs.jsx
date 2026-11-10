import React from "react"
import { useTranslation } from "react-i18next"
import { Tabs, Tab, Spinner } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons"
import { useCollectionStore } from "@tropo/core"

export const ExtraTabs = ({ instanceId }) => {
  const { t } = useTranslation()
  const work = useCollectionStore((s) => s.items[instanceId])
  if (!work) return null

  // Show loader while initial item description is being fetched
  const loadingDetails = !work.hasDetails

  // Determine external enrichment source if available
  const sourceInfo = (() => {
    if (work.wikipediaUrl) {
      return { label: t("Wikipedia"), url: work.wikipediaUrl }
    }
    if (work.bnfUrl) {
      return { label: t("BnF"), url: work.bnfUrl }
    }
    if (work.openLibraryUrl) {
      return { label: t("Open Library"), url: work.openLibraryUrl }
    }
    return null
  })()

  return (
    <Tabs defaultActiveKey="work-description">
      <Tab
        eventKey="work-description"
        title={t("Description")}
        className="work-description"
      >
        {loadingDetails && (
          <div className="description-loading">
            <Spinner animation="border" size="sm" />
            <span>{t("Loading details...")}</span>
          </div>
        )}
        {work.wikipediaUrl && work.wikipediaExact === false && (
          <div className="description-notice">
            <FontAwesomeIcon icon={faInfoCircle} className="notice-icon" />
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
        {work.description && sourceInfo && (
          <div className="description-source">
            <a
              href={sourceInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="description-source-link"
            >
              <span>
                {t("Source: {{source}}", { source: sourceInfo.label })}
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        )}
        {!loadingDetails && !work.description && (
          <div className="description-empty">
            <FontAwesomeIcon icon={faInfoCircle} />
            <span>{t("No description available.")}</span>
          </div>
        )}
      </Tab>
    </Tabs>
  )
}

export default ExtraTabs
