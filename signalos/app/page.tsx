"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

export default function LandingPage() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      ;(e as BeforeInstallPromptEvent).preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      setCanInstall(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg px-5 justify-center items-center">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-medium tracking-tight text-text-1 mb-3">
          Kora OS
        </h1>
        <p className="text-text-2 mb-12">
          Turn your daily trade into financial power
        </p>
        
        <button
          onClick={handleInstall}
          disabled={!canInstall}
          className="w-full h-11 bg-text-1 text-white font-medium rounded-lg text-sm tracking-[-0.01em] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canInstall ? "Install app" : "Install on Android Chrome"}
        </button>

        {!canInstall && (
          <button
            onClick={() => setShowManual(!showManual)}
            className="w-full h-11 border border-border rounded-lg text-sm font-medium mt-2"
          >
            Show manual install options
          </button>
        )}

        {showManual && (
          <div className="mt-4 p-4 bg-surface border border-border rounded-lg text-left text-sm space-y-2">
            <p className="font-medium">To install manually:</p>
            <p>1. Open in Chrome on Android</p>
            <p>2. Tap menu (⋮) → Add to Home screen</p>
          </div>
        )}

        <div className="mt-16 space-y-2 text-sm text-text-2">
          <p>PWA installable on Android Chrome</p>
          <p>Works offline with local data</p>
          <p>No internet required</p>
          <p>Designed for informal traders</p>
        </div>
      </div>
    </div>
  )
}