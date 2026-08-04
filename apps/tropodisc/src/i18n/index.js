import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import FR from "./fr.json"
import EN from "./en.json"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translations: FR },
      en: { translations: EN },
    },
    fallbackLng: "en",
    debug: false,

    // Have a common namespace used around the full app
    ns: ["translations"],
    defaultNS: "translations",

    // We use content as keys
    keySeparator: false,
  })

export default i18n
