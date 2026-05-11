"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export function BrandedLoader() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  
  // Smooth entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 50)
    
    return () => clearTimeout(timer)
  }, [])
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-bg">
      <div className="relative">
        {/* Optional pulse/glow effect */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-slow"></div>
        </div>
        
        {/* Logo with smooth animation */}
        <div className="relative w-24 h-24 mx-auto">
          <Image
            src="/icons/logo.png"
            alt="SignalOS Logo"
            width={120}
            height={120}
            priority
            className={`transition-transform duration-700 ease-out ${
              isMounted ? "transform scale-100 opacity-100" : "transform scale-90 opacity-0"
            }`}
          />
        </div>
      </div>
    </div>
  )
}

// Page transition loader (smaller, subtle)
export function PageTransitionLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-bg/50 backdrop-blur-sm">
      <div className="relative w-12 h-12 mx-auto">
        <Image
          src="/icons/logo.png"
          alt="SignalOS Logo"
          width={48}
          height={48}
          priority
          className="animate-spin-slow"
        />
      </div>
    </div>
  )
}

// Skeleton loader for content areas
export function BrandedSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-bg/50 rounded w-1/2"></div>
        <div className="h-4 bg-bg/50 rounded w-2/3"></div>
        <div className="h-4 bg-bg/50 rounded w-1/2"></div>
      </div>
    </div>
  )
}