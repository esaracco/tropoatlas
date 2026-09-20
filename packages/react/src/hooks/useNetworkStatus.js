import { useEffect } from "react"
import { useAppStore } from "@tropo/core"

// Manages network connectivity state and notifies the Service Worker
// to replay background sync queues when reconnecting online
export const useNetworkStatus = () => {
  const setIsOnline = useAppStore((s) => s.setIsOnline)

  useEffect(() => {
    const handleNetworkChange = (e) => {
      const isOnline = e.type === "online"
      setIsOnline(isOnline)

      if (
        isOnline &&
        typeof navigator !== "undefined" &&
        "serviceWorker" in navigator &&
        navigator.serviceWorker.controller
      ) {
        navigator.serviceWorker.controller.postMessage({
          type: "REPLAY_QUEUES",
        })
      }
    }

    window.addEventListener("online", handleNetworkChange)
    window.addEventListener("offline", handleNetworkChange)

    return () => {
      window.removeEventListener("offline", handleNetworkChange)
      window.removeEventListener("online", handleNetworkChange)
    }
  }, [setIsOnline])
}

export default useNetworkStatus
