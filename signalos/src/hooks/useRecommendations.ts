/**
 * Recommendation Hook
 *
 * Production-grade hook for recommendation data with:
 * - Auth state awareness
 * - Proper loading/error states
 * - No duplicate requests
 */

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [loading, setLoading] = useState(false)
  const lastFetchKey = useRef<string>('')

  const fetchData = useCallback(() => {
    const fetchKey = `${isHydrated}-${isAuthenticated}`
    if (fetchKey === lastFetchKey.current) return
    lastFetchKey.current = fetchKey

    if (!isHydrated || !isAuthenticated) return

    setError(null)
    setLoading(true)

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
      .finally(() => {
        setLoading(false)
      })
  }, [isHydrated, isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = () => {
    lastFetchKey.current = ''
    fetchData()
  }

  return {
    recommendations,
    summary,
    loading,
    error,
    refetch,
  }
}