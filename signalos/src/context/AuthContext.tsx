"use client"

import { createContext, useContext, ReactNode } from "react"
import { useAuthStore } from "@/src/store/auth"
import type { AuthState } from "@/src/store/auth"

type AuthContextValue = AuthState

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={useAuthStore()}>
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