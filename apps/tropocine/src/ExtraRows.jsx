import React from "react"
import { useTranslation } from "react-i18next"

// Render interactive genre and cast filter rows for films
export const ExtraRows = ({ item, onHide, setFilter }) => {
  const { t } = useTranslation()

  if (!item) return null

  return (
    <>
      {item.categories && item.categories.length > 0 && (
        <tr>
          <th>{t("Genres")}</th>
          <td>
            <div className="d-flex flex-wrap gap-1">
              {item.categories.map((c, i) => (
                <span
                  key={i}
                  className="genre-tag"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setFilter("categories", [c])
                    onHide()
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
      {item.cast && item.cast.length > 0 && (
        <tr>
          <th>{t("Cast")}</th>
          <td>
            <div
              className="d-flex flex-wrap gap-1"
              style={{ maxWidth: "340px" }}
            >
              {item.cast.map((actor, idx) => (
                <span
                  key={idx}
                  className="genre-tag"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setFilter("creators", [actor])
                    onHide()
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
    </>
  )
}

export default ExtraRows
