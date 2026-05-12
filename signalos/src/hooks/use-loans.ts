/**
 * Loans Hook
 *
 * Production-grade hook for loan management with:
 * - Auth state awareness
 * - Cached eligibility state management
 * - Evaluation loading states
 * - Disbursement with optimistic synchronization
 * - Automatic refresh of dependent data (wallet, trust score, recommendations)
 * - No duplicate requests
 */

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/src/context/AuthContext'
import { useWallet } from '@/src/hooks/useWallet'
import { useTrustScore } from '@/src/hooks/useTrustScore'
import { useRecommendations } from '@/src/hooks/useRecommendations'
import {
  getEligibility,
  evaluateEligibility,
  disburseLoan,
  getDisbursementHistory,
} from '@/src/api/loan.service'
import type {
  LoanEligibility,
  LoanDisbursement,
  DisbursementHistory,
} from '@/types'

/**
 * Core loans hook - unified state for all loan operations
 */
export function useLoans() {
  const { isHydrated, isAuthenticated } = useAuth()
  const { refetch: refetchWallet } = useWallet()
  const { recalculate: recalculateTrustScore } = useTrustScore()
  const { refetch: refetchRecommendations } = useRecommendations()

  // === ELIGIBILITY STATE ===
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)
  const [eligibilityError, setEligibilityError] = useState<string | null>(null)

  // === EVALUATION STATE ===
  const [evaluating, setEvaluating] = useState(false)
  const [evaluationError, setEvaluationError] = useState<string | null>(null)

  // === DISBURSEMENT STATE ===
  const [disbursing, setDisbursing] = useState(false)
  const [disbursementError, setDisbursementError] = useState<string | null>(null)
  const [lastDisbursement, setLastDisbursement] = useState<LoanDisbursement | null>(null)

  // === HISTORY STATE ===
  const [history, setHistory] = useState<DisbursementHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // === CACHING & REFRESH ===
  const lastEligibilityFetch = useRef<string>('')
  const lastHistoryFetch = useRef<string>('')
  const disbursementInProgress = useRef(false)

  // === FETCH ELIGIBILITY ===
  const fetchEligibility = useCallback(async () => {
    const fetchKey = `${isHydrated}-${isAuthenticated}`
    if (fetchKey === lastEligibilityFetch.current) return
    lastEligibilityFetch.current = fetchKey

    if (!isHydrated || !isAuthenticated) return

    setEligibilityLoading(true)
    setEligibilityError(null)

    try {
      const data = await getEligibility()
      setEligibility(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load eligibility'
      setEligibilityError(message)
      console.error('Eligibility fetch error:', err)
    } finally {
      setEligibilityLoading(false)
    }
  }, [isHydrated, isAuthenticated])

  // === FETCH HISTORY ===
  const fetchHistory = useCallback(async () => {
    const fetchKey = `${isHydrated}-${isAuthenticated}`
    if (fetchKey === lastHistoryFetch.current) return
    lastHistoryFetch.current = fetchKey

    if (!isHydrated || !isAuthenticated) return

    setHistoryLoading(true)
    setHistoryError(null)

    try {
      const data = await getDisbursementHistory()
      setHistory(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load history'
      setHistoryError(message)
      console.error('History fetch error:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [isHydrated, isAuthenticated])

  // === EVALUATE ELIGIBILITY ===
  const evaluate = useCallback(async () => {
    if (evaluating || disbursementInProgress.current) return

    setEvaluating(true)
    setEvaluationError(null)

    try {
      const data = await evaluateEligibility()
      setEligibility(data)
      // Also refresh history after evaluation (new eligibility might affect history view)
      await fetchHistory()
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to evaluate eligibility'
      setEvaluationError(message)
      console.error('Evaluation error:', err)
      throw err
    } finally {
      setEvaluating(false)
    }
  }, [evaluating, fetchHistory])

  // === DISBURSE LOAN ===
  const disburse = useCallback(async (amount: number, loanTermDays?: number) => {
    if (disbursing || disbursementInProgress.current) return
    if (!eligibility) {
      setDisbursementError('Eligibility not evaluated. Please check your eligibility first.')
      return
    }

    // Validate amount
    if (amount > eligibility.eligibleAmount) {
      setDisbursementError(
        `Requested amount ₦${amount.toLocaleString()} exceeds eligible amount ₦${eligibility.eligibleAmount.toLocaleString()}`
      )
      return
    }

    // Check for active loans (optimistic check before API call)
    const hasActiveLoan = history?.disbursements.some(
      (d) => d.status === 'DISBURSED' || d.status === 'APPROVED'
    )
    if (hasActiveLoan) {
      setDisbursementError('You already have an active loan.')
      return
    }

    disbursementInProgress.current = true
    setDisbursing(true)
    setDisbursementError(null)

    try {
      const result = await disburseLoan(amount, loanTermDays)
      setLastDisbursement(result)

      // Optimistic updates:
      // 1. Update eligibility (reduce available credit)
      setEligibility((prev) =>
        prev
          ? {
              ...prev,
              eligibleAmount: prev.eligibleAmount - amount,
            }
          : null
      )

      // 2. Add to history
      setHistory((prev) =>
        prev
          ? {
              ...prev,
              disbursements: [result, ...prev.disbursements],
              totalCount: prev.totalCount + 1,
              totalAmount: prev.totalAmount + amount,
            }
          : prev
      )

      // 3. Refresh all connected systems (wallet, trust score, recommendations)
      // These events propagate through the financial intelligence ecosystem
      await Promise.all([
        refetchWallet(),
        recalculateTrustScore(),
        refetchRecommendations(),
      ])

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disburse loan'
      setDisbursementError(message)
      console.error('Disbursement error:', err)
      throw err
    } finally {
      setDisbursing(false)
      disbursementInProgress.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disbursing, eligibility, history, refetchWallet, recalculateTrustScore, refetchRecommendations])

  // === REFRESH ALL LOAN DATA ===
  const refetch = useCallback(() => {
    lastEligibilityFetch.current = ''
    lastHistoryFetch.current = ''
    fetchEligibility()
    fetchHistory()
  }, [fetchEligibility, fetchHistory])

  // === EFFECT: FETCH DATA ON AUTH ===
  useEffect(() => {
    fetchEligibility()
    fetchHistory()
  }, [fetchEligibility, fetchHistory])

  // === COMPUTED PROPERTIES ===
  const hasActiveLoan = history?.disbursements.some(
    (d) => d.status === 'DISBURSED' || d.status === 'APPROVED'
  ) ?? false

  const totalBorrowed = history?.totalAmount ?? 0
  const totalLoans = history?.totalCount ?? 0

  const maxEligibleAmount = eligibility?.eligibleAmount ?? 0
  const isEligible = eligibility?.eligible ?? false
  const currentTrustScore = eligibility?.trustScore ?? 0
  const riskLevel = eligibility?.riskLevel ?? 'Low'
  const behavioralBreakdown = eligibility?.breakdown

  const loading = eligibilityLoading || historyLoading
  const error = eligibilityError || historyError

  return {
    // Eligibility
    eligibility,
    eligibilityLoading,
    eligibilityError,

    // Evaluation
    evaluate,
    evaluating,
    evaluationError,

    // Disbursement
    disburse,
    disbursing,
    disbursementError,
    lastDisbursement,

    // History
    history,
    historyLoading,
    historyError,

    // Computed
    hasActiveLoan,
    totalBorrowed,
    totalLoans,
    maxEligibleAmount,
    isEligible,
    currentTrustScore,
    riskLevel,
    behavioralBreakdown,

    // Refresh
    refetch,
    isLoading: loading,
    error,
  }
}

/**
 * Specialized hook for Eligibility Dashboard Card
 * Fetches only eligibility (lighter weight)
 */
export function useLoanEligibility() {
  const { isHydrated, isAuthenticated } = useAuth()
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetch = useRef<string>('')

  const fetch = useCallback(async () => {
    const fetchKey = `${isHydrated}-${isAuthenticated}`
    if (fetchKey === lastFetch.current) return
    lastFetch.current = fetchKey

    if (!isHydrated || !isAuthenticated) return

    setLoading(true)
    setError(null)

    try {
      const data = await getEligibility()
      setEligibility(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load eligibility'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [isHydrated, isAuthenticated])

  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    eligibility,
    loading,
    error,
    refetch: fetch,
  }
}

/**
 * Specialized hook for Disbursement History
 */

export function useLoanHistory() {
  const { isHydrated, isAuthenticated } = useAuth()
  const [history, setHistory] = useState<DisbursementHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetch = useRef<string>('')

  const fetch = useCallback(async () => {
    const fetchKey = `${isHydrated}-${isAuthenticated}`
    if (fetchKey === lastFetch.current) return
    lastFetch.current = fetchKey

    if (!isHydrated || !isAuthenticated) return

    setLoading(true)
    setError(null)

    try {
      const data = await getDisbursementHistory()
      setHistory(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load history'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [isHydrated, isAuthenticated])

  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    history,
    loading,
    error,
    refetch: fetch,
  }


}
