/**
 * Trust Score Hook
 *
 * Production-grade hook for trust score data with:
 * - Auth state awareness
 * - Proper loading/error states
 * - No duplicate requests
 */

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [loading, setLoading] = useState(false)
  const lastFetchKey = useRef<string>('')
  const recalculateInProgress = useRef(false)

  const fetchData = useCallback(() => {
    const fetchKey = `${isHydrated}-${isAuthenticated}`
    if (fetchKey === lastFetchKey.current) return
    lastFetchKey.current = fetchKey

    if (!isHydrated || !isAuthenticated) return

    setError(null)
    setLoading(true)

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
      .finally(() => {
        setLoading(false)
      })
  }, [isHydrated, isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
    fetchData()
  }

  return {
    trustScore,
    riskLevel,
    reasons,
    breakdown,
    loading,
    error,
    recalculate,
    refetch,
  }
}