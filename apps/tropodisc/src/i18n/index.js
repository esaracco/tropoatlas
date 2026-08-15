import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import FR from "./fr.json"
import EN from "./en.json"

// Replace spaces before high punctuation (:;!?») and after « with NBSP
// for French typography to prevent orphan punctuation on line breaks
export const fixFrenchPunctuation = (str) =>
  typeof str === "string"
    ? str.replace(/\s+([:;!?»])/g, "\u00A0$1").replace(/(«)\s+/g, "$1\u00A0")
    : str

// Pre-process French translations dictionary to add non-breaking spaces
const processedFR = Object.fromEntries(
  Object.entries(FR).map(([k, v]) => [k, fixFrenchPunctuation(v)]),
)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translations: processedFR },
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
