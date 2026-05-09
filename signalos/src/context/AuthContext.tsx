"use client"

import { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from '../store/auth'
import { User } from '../api/auth'

interface AuthContextType {
  user: User | null
  accessToken: string | null
  loading: boolean
  error: string | null
  login: (phone: string, password: string) => Promise<void>
  signup: (name: string, phone: string, password: string, businessType: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, accessToken, loading, error, login, signup, logout } = useAuthStore()

  const value = {
    user,
    accessToken,
    loading,
    error,
    login,
    signup,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}