import React from "react"
import { Trans, useTranslation } from "react-i18next"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGlobe, faUserEdit } from "@fortawesome/free-solid-svg-icons"
import { faGithub } from "@fortawesome/free-brands-svg-icons"

import { InfoModal } from "@tropo/react"
import { useAppStore } from "@tropo/core"
import { getProviderInfo } from "../provider"

// COMPONENT About
const About = () => {
  const showAbout = useAppStore((s) => s.showAbout)
  const setShowAbout = useAppStore((s) => s.setShowAbout)
  const { t, i18n } = useTranslation()

  const desc = (
    <Trans
      i18nKey="keyAboutMessage"
      values={{ provider: getProviderInfo().name }}
      components={{
        ProviderLink: (
          <a
            href={getProviderInfo().url}
            rel="noopener noreferrer"
            target="_blank"
          />
        ),
      }}
    />
  )

  // eslint-disable-next-line no-undef
  const appVersion = __APP_VERSION__
  // eslint-disable-next-line no-undef
  const appHomepage = __APP_HOMEPAGE__

  // RENDER
  return (
    <>
      <InfoModal
        title={t("About TropoDisc v{{version}}", {
          version: appVersion,
        })}
        show={showAbout}
        setShow={setShowAbout}
        fullscreen="sm-down"
        closeButton={false}
      >
        <>
          <img
            src="/icon-180.png"
            className="mx-auto d-block mb-2"
            alt="Logo"
          />
          <p lang={i18n.language}>{desc}</p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <a
              href={appHomepage}
              rel="noopener noreferrer"
              target="_blank"
              className="btn btn-secondary btn-sm"
            >
              <FontAwesomeIcon icon={faGlobe} fixedWidth />
              {" " + t("Website")}
            </a>
            <a
              href="https://github.com/esaracco/tropoatlas"
              rel="noopener noreferrer"
              target="_blank"
              className="btn btn-secondary btn-sm"
            >
              <FontAwesomeIcon icon={faGithub} fixedWidth />
              {" GitHub"}
            </a>
            <a
              href="https://www.esaracco.fr"
              rel="noopener noreferrer"
              target="_blank"
              className="btn btn-secondary btn-sm"
            >
              <FontAwesomeIcon icon={faUserEdit} fixedWidth size="xs" />
              {" " + t("Author")}
            </a>
          </div>
        </>
      </InfoModal>
    </>
  )
}

export default About
