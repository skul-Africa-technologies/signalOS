/**
 * Recommendation Hook
 *
 * Production-grade hook for recommendation data with:
 * - Auth state awareness
 * - Proper loading/error states
 * - No duplicate requests
 */

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/src/context/AuthContext'
import { getRecommendationSummary, getRecommendations } from '@/src/api/recommendation.service'
import type { Recommendation, RecommendationSummary } from '@/types'

interface UseRecommendationsReturn {
  recommendations: Recommendation[]
  summary: RecommendationSummary | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useRecommendations(): UseRecommendationsReturn {
  const { isHydrated, isAuthenticated } = useAuth()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [summary, setSummary] = useState<RecommendationSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastFetchKey = useRef<string>('')

  // Derive loading state
  const isLoading = !isHydrated || !isAuthenticated

  useEffect(() => {
    const fetchKey = `${isHydrated}-${isAuthenticated}`

    // Skip if already fetched the same state
    if (fetchKey === lastFetchKey.current) return
    lastFetchKey.current = fetchKey

    // Only fetch if authenticated and hydrated
    if (!isHydrated || !isAuthenticated) {
      return
    }

    setError(null)

    // Fetch both in parallel
    Promise.all([
      getRecommendationSummary(),
      getRecommendations(),
    ])
      .then(([summaryData, recsData]) => {
        setSummary(summaryData)
        setRecommendations(recsData)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load recommendations'
        setError(message)
        console.error('Recommendations fetch error:', err)
      })
  }, [isHydrated, isAuthenticated])

  const refetch = () => {
    lastFetchKey.current = ''
  }

  return {
    recommendations,
    summary,
    loading: isLoading,
    error,
    refetch,
  }
}