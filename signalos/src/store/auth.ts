import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { login, signup, logout as apiLogout, AuthResponse, User } from '../api/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  loading: boolean
  error: string | null
  login: (phone: string, password: string) => Promise<void>
  signup: (name: string, phone: string, password: string, businessType: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      loading: false,
      error: null,
      login: async (phone: string, password: string) => {
        set({ loading: true, error: null })
        try {
          const { user, accessToken }: AuthResponse = await login(phone, password)
          set({ user, accessToken, loading: false })
        } catch (err: any) {
          set({ error: err.message, loading: false })
        }
      },
      signup: async (name: string, phone: string, password: string, businessType: string) => {
        set({ loading: true, error: null })
        try {
          const { user, accessToken }: AuthResponse = await signup(name, phone, password, businessType)
          set({ user, accessToken, loading: false })
        } catch (err: any) {
          set({ error: err.message, loading: false })
        }
      },
      logout: () => {
        // Call the logout API if needed, but for now we just clear the store
        set({ user: null, accessToken: null })
      },
      setUser: (user: User | null) => set({ user }),
      setAccessToken: (token: string | null) => set({ accessToken: token }),
      clearAuth: () => set({ user: null, accessToken: null, error: null })
    }),
    {
      name: 'signal-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken })
    }
  )
)