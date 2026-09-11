import React from "react"
import { useTranslation } from "react-i18next"
import { Tabs, Tab } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons"
import { useCollectionStore } from "@tropo/core"

export const ExtraTabs = ({ instanceId }) => {
  const { t } = useTranslation()
  const release = useCollectionStore((s) => s.items[instanceId])
  if (!release) return null

  return (
    <Tabs defaultActiveKey="work-overview">
      <Tab
        eventKey="work-overview"
        title={t("Description")}
        className="work-overview"
      >
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
  )
}

export default ExtraTabs
