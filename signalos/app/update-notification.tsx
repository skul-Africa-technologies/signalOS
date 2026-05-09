"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "UPDATE_AVAILABLE") {
        setShowUpdate(true)
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage)

    // Check for updates periodically
    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update()
      })
    }, 60000)

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage)
      clearInterval(interval)
    }
  }, [])

  const handleUpdate = () => {
    navigator.serviceWorker.ready.then((reg) => {
      reg.waiting?.postMessage({ type: "SKIP_WAITING" })
    })
    setShowUpdate(false)
    window.location.reload()
  }

  if (!showUpdate) return null

  return (
    <div className="fixed top-2 left-2 right-2 bg-surface border border-border rounded-lg p-3 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={16} />
          <span className="text-sm">Update available</span>
        </div>
        <button
          onClick={handleUpdate}
          className="text-sm font-medium text-text-1"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}