/**
 * Trust Score Hook
 *
 * Production-grade hook for trust score data with:
 * - Auth state awareness
 * - Proper loading/error states
 * - No duplicate requests
 */

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/src/context/AuthContext'
import { getTrustScore, recalculateTrustScore } from '@/src/api/trust-score.service'
import type { TrustScoreReport } from '@/types'

interface UseTrustScoreReturn {
  trustScore: number
  riskLevel: string
  reasons: string[]
  breakdown: TrustScoreReport['breakdown']
  loading: boolean
  error: string | null
  recalculate: () => Promise<void>
  refetch: () => void
}

export function useTrustScore(): UseTrustScoreReturn {
  const { isHydrated, isAuthenticated } = useAuth()
  const [trustScore, setTrustScore] = useState<number>(0)
  const [riskLevel, setRiskLevel] = useState<string>('Low')
  const [reasons, setReasons] = useState<string[]>([])
  const [breakdown, setBreakdown] = useState<UseTrustScoreReturn['breakdown']>({
    transactionConsistency: 0,
    paymentFrequency: 0,
    savingsReliability: 0,
    activityLevel: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const lastFetchKey = useRef<string>('')
  const recalculateInProgress = useRef(false)

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

    getTrustScore()
      .then((data) => {
        setTrustScore(data.trustScore)
        setRiskLevel(data.riskLevel)
        setReasons(data.reasons)
        setBreakdown(data.breakdown)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load trust score'
        setError(message)
        console.error('Trust score fetch error:', err)
      })
  }, [isHydrated, isAuthenticated])

  const recalculate = async () => {
    if (recalculateInProgress.current) return

    recalculateInProgress.current = true
    setError(null)

    try {
      const data = await recalculateTrustScore()
      setTrustScore(data.trustScore)
      setRiskLevel(data.riskLevel)
      setReasons(data.reasons)
      setBreakdown(data.breakdown)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to recalculate trust score'
      setError(message)
      console.error('Trust score recalculation error:', err)
    } finally {
      recalculateInProgress.current = false
    }
  }

  const refetch = () => {
    lastFetchKey.current = ''
  }

  return {
    trustScore,
    riskLevel,
    reasons,
    breakdown,
    loading: isLoading,
    error,
    recalculate,
    refetch,
  }
}