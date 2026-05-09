import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { login, signup, logout as apiLogout, getCurrentUser } from '@/src/api/auth'
import type { User, AuthResponse, BusinessType } from '@/types'

export interface AuthState {
  user: User | null
  accessToken: string | null
  loading: boolean
  error: string | null
  initialized: boolean
  login: (phone: string, password: string) => Promise<void>
  signup: (name: string, phone: string, password: string, businessType: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  clearAuth: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      loading: false,
      error: null,
      initialized: false,

      login: async (phone: string, password: string) => {
        set({ loading: true, error: null })
        try {
          const { user, accessToken }: AuthResponse = await login(phone, password)
          set({ user, accessToken, loading: false, initialized: true })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login failed'
          set({ error: message, loading: false })
          throw err
        }
      },

      signup: async (name: string, phone: string, password: string, businessType: string) => {
        set({ loading: true, error: null })
        try {
          const { user, accessToken }: AuthResponse = await signup(name, phone, password, businessType as BusinessType)
          set({ user, accessToken, loading: false, initialized: true })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Signup failed'
          set({ error: message, loading: false })
          throw err
        }
      },

      logout: async () => {
        try {
          await apiLogout()
        } catch (error) {
          console.error('Logout API error (ignored):', error)
        }
        set({ user: null, accessToken: null, error: null, initialized: true })
      },

      setUser: (user: User | null) => set({ user }),

      clearAuth: () => set({ user: null, accessToken: null, error: null, initialized: true }),

      hydrate: async () => {
        const { accessToken } = get()

        if (!accessToken) {
          set({ initialized: true })
          return
        }

        set({ loading: true })
        try {
          const user = await getCurrentUser()
          set({ user, loading: false, initialized: true })
        } catch (error) {
          console.error('Auth hydration failed:', error)
          // Keep existing token/user state if not cleared by auth error handler (401)
          // For network/server errors, user remains authenticated with cached data
          // For 401, the handleAuthError already cleared storage and dispatched event
          set({ loading: false, initialized: true })
        }
      },
    }),
    {
      name: 'signal-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken
      }),
      // IMPORTANT: Do NOT set initialized here. Let hydrate() control it.
      // onRehydrateStorage would set initialized=true prematurely before user fetch
    }
   )
 )

// Listen for auth invalidation events
if (typeof window !== 'undefined') {
  window.addEventListener('auth:invalidated', () => {
    useAuthStore.getState().clearAuth()
  })
}
