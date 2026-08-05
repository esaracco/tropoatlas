import React from "react"
import { Trans, useTranslation } from "react-i18next"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faInfoCircle, faUserEdit } from "@fortawesome/free-solid-svg-icons"
import { faGithub } from "@fortawesome/free-brands-svg-icons"

import { InfoModal } from "@tropo/react"
import { useAppStore } from "@tropo/core"
import { getProviderInfo } from "../provider"

import "./About.css"

// COMPONENT About
const About = () => {
  const isOnline = useAppStore((s) => s.isOnline)
  const showAbout = useAppStore((s) => s.showAbout)
  const setShowAbout = useAppStore((s) => s.setShowAbout)
  const [_] = useTranslation()

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

  // RENDER
  return (
    <>
      <InfoModal
        title={_("About TropoDisc v{{version}}", {
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
          <p>{desc}</p>
          <p className="text-center">
            <a
              href="https://github.com/esaracco/tropoatlas"
              rel="noopener noreferrer"
              target="_blank"
              className="btn btn-secondary btn-sm"
            >
              <FontAwesomeIcon icon={faGithub} fixedWidth />
              {" GitHub"}
            </a>{" "}
            <a
              href="https://www.esaracco.fr"
              rel="noopener noreferrer"
              target="_blank"
              className="btn btn-secondary btn-sm"
            >
              <FontAwesomeIcon icon={faUserEdit} fixedWidth size="xs" />
              {" " + _("Author")}
            </a>
          </p>
        </>
      </InfoModal>
      <div className="About" onClick={() => setShowAbout(true)}>
        <FontAwesomeIcon icon={faInfoCircle} />
        {!isOnline && <div className="offline">{_("Offline mode")}</div>}
      </div>
    </>
  )
}

export default About
