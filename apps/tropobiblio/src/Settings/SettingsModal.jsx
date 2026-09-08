import React, { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Modal, Tabs, Tab, Form, Button, Alert } from "react-bootstrap"
import { useSettingsStore } from "@tropo/core"
import provider from "../provider"

const SettingsModal = ({ show, onHide }) => {
  const { t } = useTranslation()
  const general = useSettingsStore((s) => s.general)
  const hardware = useSettingsStore((s) => s.hardware)
  const setGeneral = useSettingsStore((s) => s.setGeneral)
  const setHardware = useSettingsStore((s) => s.setHardware)

  const showLeds = import.meta.env.VITE_SET_LEDS === "yes"
  const activeProvider = import.meta.env.VITE_DATA_PROVIDER || "inventaire"

  const activeProviderConfig =
    useSettingsStore((s) => s.pluginsConfig[activeProvider]) || {}
  const currentProviderConfig = provider.plugin?.getCurrentConfig
    ? provider.plugin.getCurrentConfig()
    : {}
  const effectiveConfig = {
    ...currentProviderConfig,
    ...activeProviderConfig,
  }

  const draftCaps = provider.plugin?.getDraftCapabilities
    ? provider.plugin.getDraftCapabilities(effectiveConfig)
    : {}
  const showGeneral = !!draftCaps.supportsPrice

  const setPluginConfig = useSettingsStore((s) => s.setPluginConfig)
  const initialProviderConfig = useRef({ ...effectiveConfig })
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
      const nextConfig = { ...effectiveConfig, [key]: val }
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
                    effectiveConfig[field.key] === "yes" ||
                    effectiveConfig[field.key] === true
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
              <Form.Label>{t(field.label)}</Form.Label>
              <Form.Control
                type={
                  field.type === "password"
                    ? "password"
                    : field.type === "number"
                      ? "number"
                      : "text"
                }
                min={field.min}
                value={effectiveConfig[field.key] ?? field.defaultValue ?? ""}
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

  const handleClose = () => {
    onHide()
  }

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      scrollable
      fullscreen="sm-down"
    >
      <Modal.Header closeButton>
        <Modal.Title>{t("Settings")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs defaultActiveKey="datasource">
          {showGeneral && (
            <Tab eventKey="general" title={t("General")}>
              <Form className="p-3">
                <Form.Group className="mb-3">
                  <Form.Label>{t("Currency")}</Form.Label>
                  <Form.Control
                    type="text"
                    value={general.currency}
                    onChange={(e) => setGeneral({ currency: e.target.value })}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) {
                        setGeneral({ currency: "€" })
                      }
                    }}
                  />
                </Form.Group>
              </Form>
            </Tab>
          )}

          <Tab
            eventKey="datasource"
            title={provider.plugin?.getProviderInfo().name}
          >
            {renderSchemaForm()}
          </Tab>

          {showLeds && (
            <Tab eventKey="hardware" title={t("LEDs")}>
              <Form className="p-3">
                {!draftCaps.supportsPlace && (
                  <Alert variant="warning" className="mb-3">
                    {t(
                      "LEDs are enabled but your data provider is not configured to support the physical location field (place).",
                    )}
                  </Alert>
                )}
                <Form.Group className="mb-3">
                  <Form.Label>{t("LED Target Host / IP")}</Form.Label>
                  <Form.Control
                    type="text"
                    value={hardware.ledTarget || ""}
                    onChange={(e) => setHardware({ ledTarget: e.target.value })}
                  />
                </Form.Group>
              </Form>
            </Tab>
          )}
        </Tabs>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          {t("Close")}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default SettingsModal
