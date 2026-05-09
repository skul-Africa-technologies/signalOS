"use client"

import { createContext, useContext, ReactNode, useEffect, useMemo } from "react"
import { useAuthStore } from "@/src/store/auth"
import type { AuthState } from "@/src/store/auth"

type AuthContextValue = AuthState & {
  isAuthenticated: boolean
  isInitializing: boolean
  isHydrated: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Select individual store values to prevent unnecessary re-renders
  const storageRestored = useAuthStore((state) => state.storageRestored)
  const hydrated = useAuthStore((state) => state.hydrated)
  const hasToken = useAuthStore((state) => state.hasToken)
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const loading = useAuthStore((state) => state.loading)
  const error = useAuthStore((state) => state.error)
  const hydrate = useAuthStore((state) => state.hydrate)
  const setUser = useAuthStore((state) => state.setUser)
  const login = useAuthStore((state) => state.login)
  const signup = useAuthStore((state) => state.signup)
  const logout = useAuthStore((state) => state.logout)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  // Trigger hydration after storage restoration (only once)
  useEffect(() => {
    if (storageRestored && !hydrated) {
      hydrate()
    }
  }, [storageRestored, hydrated, hydrate])

  useEffect(() => {
    const handleInvalidated = () => {
      clearAuth()
    }

    window.addEventListener('auth:invalidated', handleInvalidated)
    return () => {
      window.removeEventListener('auth:invalidated', handleInvalidated)
    }
  }, [clearAuth])

  // Derived computed values
  const isAuthenticated = Boolean(accessToken && user)
  const isHydrated = hydrated
  const isInitializing = !storageRestored || (!hydrated && hasToken)

  const contextValue: AuthContextValue = useMemo(() => ({
    user,
    accessToken,
    storageRestored,
    hasToken,
    hydrated,
    loading,
    error,
    login,
    signup,
    logout,
    setUser,
    clearAuth,
    hydrate,
    isAuthenticated,
    isHydrated,
    isInitializing,
  }), [
    user,
    accessToken,
    storageRestored,
    hasToken,
    hydrated,
    loading,
    error,
    login,
    signup,
    logout,
    setUser,
    clearAuth,
    hydrate,
    isAuthenticated,
    isHydrated,
    isInitializing,
  ])

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
