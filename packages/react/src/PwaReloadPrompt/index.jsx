import React from "react"
import { useRegisterSW } from "virtual:pwa-register/react"
import "./PwaReloadPrompt.css"

const PwaReloadPrompt = ({
  message = "Update available! The app will be reloaded.",
  buttonReload = "Reload",
  buttonClose = "Close",
}) => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    /*
    onRegistered(r) {
      console.log("SW Registered", r)
    },
    */
    onRegisterError(error) {
      console.log("SW registration error", error)
    },
  })

  const close = () => {
    setNeedRefresh(false)
  }

  const handleUpdate = async () => {
    updateServiceWorker(true)
  }

  if (!needRefresh) return null

  return (
    <div className="PwaReloadPrompt-container">
      <div className="PwaReloadPrompt-toast">
        <div className="PwaReloadPrompt-message">{message}</div>
        <div className="PwaReloadPrompt-buttons">
          <button className="PwaReloadPrompt-btn" onClick={close}>
            {buttonClose}
          </button>
          <button
            className="PwaReloadPrompt-btn primary"
            onClick={handleUpdate}
          >
            {buttonReload}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PwaReloadPrompt
