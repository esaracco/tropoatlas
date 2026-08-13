import React from "react"
import { useTranslation } from "react-i18next"

import "./LanguageSelector.css"

// COMPONENT LanguageSelector
// Render a compact language switch control
const LanguageSelector = ({
  languages = [
    { code: "en", label: "EN" },
    { code: "fr", label: "FR" },
  ],
  ariaLabel = "Change language",
}) => {
  const { i18n } = useTranslation()

  // Extract base two-letter language code
  const currentLang = (i18n.resolvedLanguage || i18n.language || "en")
    .slice(0, 2)
    .toLowerCase()

  // Switch active language in i18next
  const handleLanguageChange = (code) => {
    if (code !== currentLang) {
      i18n.changeLanguage(code)
    }
  }

  return (
    <div
      className="LanguageSelector btn-group"
      role="group"
      aria-label={ariaLabel}
    >
      {languages.map((lang) => {
        const isActive = currentLang === lang.code
        return (
          <button
            key={lang.code}
            type="button"
            className={`btn btn-sm ${
              isActive ? "btn-primary active" : "btn-outline-secondary"
            }`}
            onClick={() => handleLanguageChange(lang.code)}
          >
            {lang.label}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSelector
