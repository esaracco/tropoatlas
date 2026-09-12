import React from "react"
import { useTranslation } from "react-i18next"

// Render subtitle, page count, publisher, and ISBN for books
export const HeaderDetails = ({ item }) => {
  const { t } = useTranslation()

  if (!item) return null

  return (
    <>
      {item.subtitle ? <div>{item.subtitle}</div> : null}
      {(item.pageCount || item.publisher) && (
        <div>
          {item.pageCount && (
            <span className="work-secondary-info">
              {item.pageCount} {t("pages")}
            </span>
          )}
          {item.publisher && (
            <span className="work-secondary-info">
              {item.pageCount && ", "}
              {item.publisher}
            </span>
          )}
        </div>
      )}
      {item.isbn !== undefined && (
        <div style={{ color: "var(--tropo-text)" }}>
          {item.isbn &&
            !item.isbn.startsWith("inv:") &&
            !item.isbn.startsWith("wd:") &&
            item.isbn}
        </div>
      )}
    </>
  )
}

export default HeaderDetails
