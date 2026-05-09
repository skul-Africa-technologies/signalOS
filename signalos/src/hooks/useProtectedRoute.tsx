/**
 * useProtectedRoute Hook
 * 
 * Client-side route protection utility.
 * Handles auth state during hydration and redirects if needed.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/context/AuthContext'

type UseProtectedRouteOptions = {
  redirectTo?: string
  withCallback?: boolean
}

export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const { redirectTo = '/login', withCallback = true } = options
  const { isAuthenticated, isInitializing } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitializing) {
      return
    }

    if (!isAuthenticated) {
      const loginUrl = new URL(redirectTo, window.location.origin)
      if (withCallback) {
        loginUrl.searchParams.set('callbackUrl', window.location.pathname)
      }
      router.push(loginUrl.pathname + loginUrl.search)
    }
  }, [isAuthenticated, isInitializing, router, redirectTo, withCallback])

  return {
    isLoading: isInitializing,
    isAllowed: isAuthenticated,
  }
}

export function withProtectedRoute<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  options?: UseProtectedRouteOptions
) {
  return function ProtectedRouteComponent(props: P) {
    const { isAllowed, isLoading } = useProtectedRoute(options)

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!isAllowed) {
      return null
    }

    return <Component {...props} />
  }
}
