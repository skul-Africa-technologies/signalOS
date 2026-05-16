'use client'

import { useAuth } from "@/src/context/AuthContext"
import { BrandedLoader } from "@/src/components/BrandedLoader"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

const LOADER_TIMEOUT_MS = 15000 // Safety timeout to prevent permanently stuck loaders

 export function AuthLoaderWrapper({ children }: { children: React.ReactNode }) {
   const { isInitializing, isHydrated } = useAuth()
   const pathname = usePathname()
   const [showContent, setShowContent] = useState(false)
   const [routeChangeLoading, setRouteChangeLoading] = useState(false)
   const [currentPathname, setCurrentPathname] = useState(pathname)

   // Safety timeout to prevent loader from getting permanently stuck
   useEffect(() => {
     if (isHydrated) {
       const timer = setTimeout(() => {
         setShowContent(true)
       }, 100)

       const safetyTimer = setTimeout(() => {
         setShowContent(true)
       }, LOADER_TIMEOUT_MS)

       return () => {
         clearTimeout(timer)
         clearTimeout(safetyTimer)
       }
     }
   }, [isHydrated])

   // Detect route changes for page transition loading
   useEffect(() => {
     if (pathname !== currentPathname) {
       // Schedule loading state update outside of render phase
       const scheduleUpdate = () => {
         setRouteChangeLoading(true)
         setCurrentPathname(pathname)
       }
       
       // Use setTimeout to ensure we're not in render phase
       setTimeout(scheduleUpdate, 0)

       // Reset loading state after a short delay with safety timeout
       const timer = setTimeout(() => {
         setRouteChangeLoading(false)
       }, 150)

       const safetyTimer = setTimeout(() => {
         setRouteChangeLoading(false)
       }, LOADER_TIMEOUT_MS)

       return () => {
         clearTimeout(timer)
         clearTimeout(safetyTimer)
       }
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