'use client'

import { useAuth } from "@/src/context/AuthContext"
import { BrandedLoader } from "@/src/components/BrandedLoader"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function AuthLoaderWrapper({ children }: { children: React.ReactNode }) {
  const { isInitializing, isHydrated } = useAuth()
  const pathname = usePathname()
  const [showContent, setShowContent] = useState(false)
  const [routeChangeLoading, setRouteChangeLoading] = useState(false)
  const [currentPathname, setCurrentPathname] = useState(pathname)

  // Delay showing content slightly for smooth transition after hydration
  useEffect(() => {
    if (isHydrated) {
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isHydrated])

  // Detect route changes for page transition loading
  useEffect(() => {
    if (pathname !== currentPathname) {
      // Set loading state for route change
      setRouteChangeLoading(true)
      setCurrentPathname(pathname)
      
      // Reset loading state after a short delay
      const timer = setTimeout(() => {
        setRouteChangeLoading(false)
      }, 150)
      
      return () => clearTimeout(timer)
    }
  }, [pathname, currentPathname])

  // Show branded loader during:
  // 1. Auth initialization
  // 2. Page transitions
  // 3. Initial content delay after hydration
  const showLoader = isInitializing || routeChangeLoading || (!showContent && isHydrated)

  return (
    <>
      {showLoader && <BrandedLoader />}
      {!showLoader && children}
    </>
  )
}