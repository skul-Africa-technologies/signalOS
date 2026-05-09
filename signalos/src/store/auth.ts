import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { login, signup, logout as apiLogout, getCurrentUser } from '@/src/api/auth'
import type { User, AuthResponse, BusinessType } from '@/types'

/**
 * AUTHENTICATION STATE MACHINE
 *
 * 3-Stage Hydration for Production-Grade Session Persistence:
 *
 * Stage 1 - StorageRestored (sync):
 *   - localStorage/sessionStorage read complete
 *   - token and user state restored from cache
 *   - occurs immediately on app startup via zustand persist
 *
 * Stage 2 - HasToken (derived):
 *   - accessToken exists in storage
 *   - indicates potential active session
 *
 * Stage 3 - Hydrated (async):
 *   - Background validation of token via /users/me complete
 *   - Session confirmed valid OR cleared if invalid (401)
 *   - If network error, trust cached session temporarily
 *
 * UX Flow:
 *   storageRestored=false → show app loading
 *   storageRestored=true, hasToken=true → show app instantly (trust cache)
 *   hydrated=false → continue with cached data, validate in background
 *   hydrated=true → session confirmed (or cleared if invalid)
 *   hydrated=true, !hasToken → show login
 */
export interface AuthState {
  // Auth data
  user: User | null
  accessToken: string | null

  // Hydration state flags (3-stage)
  storageRestored: boolean   // localStorage read complete (sync)
  hasToken: boolean         // token exists in storage (derived from accessToken)
  hydrated: boolean         // async user validation complete

  // Loading/error states
  loading: boolean          // async operation in progress
  error: string | null

  // Actions
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
      // Initial state - all flags false until storage loads
      user: null,
      accessToken: null,
      storageRestored: false,
      hasToken: false,
      hydrated: false,
      loading: false,
      error: null,

      login: async (phone: string, password: string) => {
        set({ loading: true, error: null })
        try {
          const { user, accessToken }: AuthResponse = await login(phone, password)
          set({ user, accessToken, loading: false, hydrated: true, hasToken: true })
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
          set({ user, accessToken, loading: false, hydrated: true, hasToken: true })
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
        set({ user: null, accessToken: null, error: null, hydrated: true, hasToken: false })
      },

      setUser: (user: User | null) => set({ user }),

      clearAuth: () => set({ user: null, accessToken: null, error: null, hydrated: true, hasToken: false }),

      hydrate: async () => {
        const { accessToken } = get()

        // No token = not authenticated, hydration complete immediately
        if (!accessToken) {
          set({ storageRestored: true, hydrated: true, hasToken: false })
          return
        }

        // Token exists - validate in background
        // User state is already restored from localStorage by zustand persist
        // We set hydrated=true immediately to allow app access, then validate
        set({ hydrated: true, hasToken: true })

        // Background validation - doesn't block UI
        try {
          const user = await getCurrentUser()
          set({ user }) // Update with fresh user data
        } catch (error) {
          console.error('Auth validation failed:', error)
          // Only clear on 401 (invalid token)
          // For network errors, keep cached session active
          if (error instanceof Error && error.message.includes('401')) {
            set({ user: null, accessToken: null, error: 'Session expired', hasToken: false })
          }
        }
      },
    }),
    {
      name: 'signal-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
      // onRehydrateStorage fires AFTER storage is read
      // We use it to mark storageRestored=true instantly
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.storageRestored = true
          state.hasToken = !!state.accessToken
          // hydrated remains false until hydrate() completes async validation
        }
      },
    }
  )
)

// Listen for auth invalidation events
if (typeof window !== 'undefined') {
  window.addEventListener('auth:invalidated', () => {
    useAuthStore.getState().clearAuth()
  })
}
