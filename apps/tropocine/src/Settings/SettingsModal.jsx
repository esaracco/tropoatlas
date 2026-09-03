import React, { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Modal, Form, Button, Alert } from "react-bootstrap"
import { useSettingsStore } from "@tropo/core"
import provider from "../provider"

const SettingsModal = ({ show, onHide }) => {
  const { t } = useTranslation()
  const activeProvider = import.meta.env.VITE_DATA_PROVIDER || "tmdb"
  const activeProviderConfig =
    useSettingsStore((s) => s.pluginsConfig[activeProvider]) || {}
  const setPluginConfig = useSettingsStore((s) => s.setPluginConfig)

  const initialProviderConfig = useRef({ ...activeProviderConfig })
  const [needsResync, setNeedsResync] = useState(false)

  const handleProviderChange = (key, value, type) => {
    let val = value
    if (type === "number") {
      val = parseInt(value, 10)
      if (isNaN(val) || val <= 0) val = 1
    }

    const schema = provider.plugin?.getSettingsSchema
      ? provider.plugin.getSettingsSchema()
      : []
    const fieldSchema = schema.find((f) => f.key === key)

    if (fieldSchema && fieldSchema.requiresResync) {
      const nextConfig = { ...activeProviderConfig, [key]: val }
      const isDirty = schema
        .filter((f) => f.requiresResync)
        .some((f) => nextConfig[f.key] !== initialProviderConfig.current[f.key])
      setNeedsResync(isDirty)
    }

    if (setPluginConfig) {
      setPluginConfig(activeProvider, { [key]: val })
    }
  }

  const renderSchemaForm = () => {
    if (!provider.plugin?.getSettingsSchema) return null
    const schema = provider.plugin.getSettingsSchema()

    return (
      <Form className="p-3">
        {needsResync && (
          <Alert variant="warning" className="mb-4">
            {t(
              "Warning: Changing these values requires a manual resynchronization to take effect.",
            )}
          </Alert>
        )}
        {schema.map((field, idx) => {
          if (field.type === "header") {
            return (
              <h5
                key={idx}
                className={
                  (idx === 0 ? "mb-3" : "mt-4 mb-3") + " pb-2 border-bottom"
                }
                style={{ color: "var(--bs-heading-color)" }}
              >
                {t(field.label)}
              </h5>
            )
          }
          if (field.type === "boolean") {
            return (
              <Form.Group className="mb-3" key={field.key}>
                <Form.Check
                  id={field.key}
                  label={t(field.label)}
                  checked={
                    activeProviderConfig[field.key] === "yes" ||
                    activeProviderConfig[field.key] === true
                  }
                  onChange={(e) =>
                    handleProviderChange(
                      field.key,
                      e.target.checked ? "yes" : "no",
                      field.type,
                    )
                  }
                />
              </Form.Group>
            )
          }
          return (
            <Form.Group className="mb-3" key={field.key}>
              <Form.Label htmlFor={field.key}>{t(field.label)}</Form.Label>
              <Form.Control
                id={field.key}
                type={field.type === "number" ? "number" : "text"}
                min={field.min}
                value={activeProviderConfig[field.key] || ""}
                onChange={(e) =>
                  handleProviderChange(field.key, e.target.value, field.type)
                }
              />
            </Form.Group>
          )
        })}
      </Form>
    )
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="md"
      scrollable
      fullscreen="sm-down"
    >
      <Modal.Header closeButton>
        <Modal.Title>{t("Settings")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{renderSchemaForm()}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t("Close")}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default SettingsModal
