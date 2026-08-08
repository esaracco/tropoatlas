import React from "react"
import { useTranslation } from "react-i18next"
import { Modal, Tabs, Tab, Form, Button, Alert } from "react-bootstrap"
import { useSettingsStore } from "@tropo/core"
import provider from "../provider"

const SettingsModal = ({ show, onHide }) => {
  const [_] = useTranslation()
  const general = useSettingsStore((s) => s.general)
  const hardware = useSettingsStore((s) => s.hardware)
  const setGeneral = useSettingsStore((s) => s.setGeneral)
  const setHardware = useSettingsStore((s) => s.setHardware)

  const showLeds = import.meta.env.VITE_SET_LEDS === "yes"

  const activeProviderConfig =
    useSettingsStore(
      (s) => s.pluginsConfig[import.meta.env.VITE_DATA_PROVIDER],
    ) || {}
  const draftCaps = provider.plugin?.getDraftCapabilities
    ? provider.plugin.getDraftCapabilities(activeProviderConfig)
    : {}
  const showGeneral = !!draftCaps.supportsPrice

  const defaultTab = showGeneral
    ? "general"
    : showLeds
      ? "hardware"
      : "datasource"

  const setPluginConfig = useSettingsStore((s) => s.setPluginConfig)
  const initialProviderConfig = React.useRef({ ...activeProviderConfig })
  const [needsResync, setNeedsResync] = React.useState(false)

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
      setPluginConfig(import.meta.env.VITE_DATA_PROVIDER, { [key]: val })
    }
  }

  const renderSchemaForm = () => {
    if (!provider.plugin?.getSettingsSchema) return null
    const schema = provider.plugin.getSettingsSchema()

    return (
      <Form className="p-3">
        {needsResync && (
          <Alert variant="warning" className="mb-4">
            {_(
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
                {_(field.label)}
              </h5>
            )
          }
          if (field.type === "boolean") {
            return (
              <Form.Group className="mb-3" key={field.key}>
                <Form.Check
                  id={field.key}
                  label={_(field.label)}
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
              <Form.Label>{_(field.label)}</Form.Label>
              <Form.Control
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

  const isValidColor = (val) => {
    if (!val) return false
    const str = String(val).replace(/\s/g, "")
    if (str === "0,0,0") return false
    const match = str.match(/^(\d{1,3}),(\d{1,3}),(\d{1,3})$/)
    if (!match) return false
    const [, r, g, b] = match
    return Number(r) <= 255 && Number(g) <= 255 && Number(b) <= 255
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      scrollable
      fullscreen="sm-down"
    >
      <Modal.Header closeButton>
        <Modal.Title>{_("Settings")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs defaultActiveKey={defaultTab}>
          {showGeneral && (
            <Tab eventKey="general" title={_("General")}>
              <Form className="p-3">
                <Form.Group className="mb-3">
                  <Form.Label>{_("Currency")}</Form.Label>
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

          {showLeds && (
            <Tab eventKey="hardware" title={_("LEDs")}>
              <Form className="p-3">
                {!draftCaps.supportsPlace && (
                  <Alert variant="warning" className="mb-4">
                    {_(
                      "LEDs are enabled but your data provider is not configured to support the physical location field (place).",
                    )}
                  </Alert>
                )}
                <Form.Group className="mb-3">
                  <Form.Label>{_("Artists Color (RGB)")}</Form.Label>
                  <Form.Control
                    type="text"
                    value={hardware.ledsArtistsColor}
                    isInvalid={!isValidColor(hardware.ledsArtistsColor)}
                    onChange={(e) =>
                      setHardware({ ledsArtistsColor: e.target.value })
                    }
                  />
                  <Form.Control.Feedback type="invalid">
                    {_(
                      "Must be a valid RGB format (e.g. 255,0,0) and not 0,0,0",
                    )}
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{_("Styles Color (RGB)")}</Form.Label>
                  <Form.Control
                    type="text"
                    value={hardware.ledsStylesColor}
                    isInvalid={!isValidColor(hardware.ledsStylesColor)}
                    onChange={(e) =>
                      setHardware({ ledsStylesColor: e.target.value })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{_("Album Color (RGB)")}</Form.Label>
                  <Form.Control
                    type="text"
                    value={hardware.ledsAlbumColor}
                    isInvalid={!isValidColor(hardware.ledsAlbumColor)}
                    onChange={(e) =>
                      setHardware({ ledsAlbumColor: e.target.value })
                    }
                  />
                </Form.Group>
              </Form>
            </Tab>
          )}

          {provider.plugin?.getSettingsSchema && (
            <Tab
              eventKey="datasource"
              title={provider.plugin.getProviderInfo().name}
            >
              {showLeds && !draftCaps.supportsPlace && (
                <Alert variant="warning" className="m-3 mb-0">
                  {_(
                    "Your data provider is not configured to support the physical location field (place) but LEDs are enabled.",
                  )}
                </Alert>
              )}
              {renderSchemaForm()}
            </Tab>
          )}
        </Tabs>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {_("Close")}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default SettingsModal
