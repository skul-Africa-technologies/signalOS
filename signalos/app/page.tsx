"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/src/store"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

export default function LandingPage() {
  const router = useRouter()
  const { completed } = useOnboardingStore()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [mounted, setMounted] = useState(false)



  // Check localStorage directly to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    // Check if user has completed onboarding from localStorage
    try {
      const stored = localStorage.getItem("signal-onboarding")
      if (stored) {
        const data = JSON.parse(stored)
        if (data?.state?.completed) {
          // Use window.location for redirect to avoid router initialization issues
          window.location.href = "/app/home"
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [])
  

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



  const handleGetStarted = () => {
    router.push("/onboarding")
  }


  return (
    <div className="flex flex-col min-h-screen bg-bg px-5 justify-center items-center">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-medium tracking-tight text-text-1 mb-3">
          Signal OS
        </h1>
        {mounted && (
          <>
            <p className="text-text-2 mb-12">
              Turn your daily trade into financial power
            </p>
            
            <button
              onClick={handleGetStarted}
              className="w-full h-11 bg-text-1 text-white font-medium rounded-lg text-sm tracking-[-0.01em] mb-3"
            >
              Get started
            </button>

            <button
              onClick={handleInstall}
              disabled={!canInstall}
              className="w-full h-11 border border-border rounded-lg text-sm font-medium"
            >
              {canInstall ? "Install app" : "Install on Android Chrome"}
            </button>

            <div className="mt-16 space-y-2 text-sm text-text-2">
              <p>PWA installable on Android Chrome</p>
              <p>Works offline with local data</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}