"use client"

import { createContext, useContext, ReactNode, useEffect } from "react"
import { useAuthStore } from "@/src/store/auth"
import type { AuthState } from "@/src/store/auth"

type AuthContextValue = AuthState & {
  isAuthenticated: boolean
  isInitializing: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStore = useAuthStore()
  
  useEffect(() => {
    if (!authStore.initialized) {
      authStore.hydrate()
    }
  }, [authStore])

  useEffect(() => {
    const handleInvalidated = () => {
      authStore.clearAuth()
    }

    window.addEventListener('auth:invalidated', handleInvalidated)
    return () => {
      window.removeEventListener('auth:invalidated', handleInvalidated)
    }
  }, [authStore])

  const isAuthenticated = Boolean(authStore.accessToken && authStore.user)
  const isInitializing = !authStore.initialized || authStore.loading

  const contextValue: AuthContextValue = {
    ...authStore,
    isAuthenticated,
    isInitializing,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
