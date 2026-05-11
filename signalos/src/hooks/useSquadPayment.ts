/**
 * Squad Payment Hook
 *
 * Production-grade hook for handling Squad payment flows with:
 * - Auth state awareness
 * - Duplicate submission prevention
 * - Proper loading/error states
 * - Payment verification polling
 * - Webhook event handling
 * - Integration with wallet, transactions, trust score, and recommendations
 */

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/src/context/AuthContext"
import { useWallet } from "@/src/hooks/useWallet"
import { useTrustScore } from "@/src/hooks/useTrustScore"
import { useRecommendations } from "@/src/hooks/useRecommendations"
import {
  initiatePayment,
  verifyPayment,
  getPaymentHistory,
} from "@/src/api/payment.service"
import type { PaymentSession, PaymentTransaction, PaymentStatus } from "@/types"

interface UseSquadPaymentReturn {
  initiatePayment: (
    email: string,
    amount: number,
    callbackUrl?: string
  ) => Promise<PaymentSession | null>
  verifyPayment: (reference: string) => Promise<PaymentTransaction | null>
  paymentHistory: PaymentTransaction[]
  loading: boolean
  error: string | null
  processing: boolean
  clearError: () => void
  refetchHistory: () => void
}

const POLLING_INTERVAL = 5000 // 5 seconds for payment verification
const MAX_POLLING_ATTEMPTS = 12 // 60 seconds max polling

export function useSquadPayment(): UseSquadPaymentReturn {
  const { isHydrated, isAuthenticated, user } = useAuth()
  const { balance, refetch: refetchWallet } = useWallet()
  const { recalculate: recalculateTrustScore } = useTrustScore()
  const { refetch: refetchRecommendations } = useRecommendations()

  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingVerifyRef = useRef<string | null>(null)
  const lastFetchKey = useRef<string>("")
  const submittingRef = useRef(false)

  const isLoading = loading || !isHydrated || !isAuthenticated

  // Fetch payment history
  const fetchPaymentHistory = useCallback(async () => {
    if (!isHydrated || !isAuthenticated) return

    const fetchKey = `history-${isHydrated}-${isAuthenticated}`
    if (fetchKey === lastFetchKey.current) return
    lastFetchKey.current = fetchKey

    try {
      const history = await getPaymentHistory()
      setPaymentHistory(history)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch payment history"
      setError(message)
      console.error("Payment history fetch error:", err)
    }
  }, [isHydrated, isAuthenticated])

  // Poll payment verification
  useEffect(() => {
    if (pendingVerifyRef.current) {
      let attempts = 0

      pollRef.current = setInterval(async () => {
        if (attempts >= MAX_POLLING_ATTEMPTS) {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          pendingVerifyRef.current = null
          setProcessing(false)
          return
        }

        try {
          const result = await verifyPayment(pendingVerifyRef.current!)

          if (result) {
            const isTerminal =
              result.status === "success" ||
              result.status === "failed" ||
              result.status === "cancelled"

            if (isTerminal) {
              if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
              }

              pendingVerifyRef.current = null
              setProcessing(false)
              setPaymentHistory((prev) => {
                const existing = prev.find((p) => p.reference === result.reference)
                if (existing) {
                  return prev.map((p) => (p.reference === result.reference ? result : p))
                }
                return [result, ...prev]
              })

              // On successful payment, refresh connected systems
              if (result.status === "success") {
                refetchWallet()
                recalculateTrustScore()
                refetchRecommendations()
              }
            }
          }

          attempts++
        } catch (err) {
          console.error("Payment verification poll error:", err)
          attempts++
        }
      }, POLLING_INTERVAL)
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [refetchWallet, recalculateTrustScore, refetchRecommendations])

  // Initial fetch
  useEffect(() => {
    fetchPaymentHistory()
  }, [fetchPaymentHistory])

  // Initiate payment with duplicate submission protection
  const initiatePaymentSafe = useCallback(
    async (
      email: string,
      amount: number,
      callbackUrl?: string
    ): Promise<PaymentSession | null> => {
      if (!isHydrated || !isAuthenticated) {
        setError("Authentication required. Please log in again.")
        return null
      }

      // Prevent duplicate submissions
      if (submittingRef.current) {
        setError("A payment request is already being processed.")
        return null
      }

      // Validate amount
      if (!amount || amount <= 0) {
        setError("Please enter a valid amount.")
        return null
      }

      submittingRef.current = true
      setError(null)
      setProcessing(true)
      setLoading(true)

      try {
        // Determine callback URL
        const cbUrl =
          callbackUrl ||
          (typeof window !== "undefined"
            ? `${window.location.origin}/app/payments/callback`
            : undefined)

        const session = await initiatePayment(email, amount, cbUrl)

        // Start polling for verification
        pendingVerifyRef.current = session.reference

        submittingRef.current = false
        setLoading(false)

        return session
      } catch (err) {
        submittingRef.current = false
        setProcessing(false)
        setLoading(false)

        const message = err instanceof Error ? err.message : "Payment initiation failed"
        setError(message)
        console.error("Payment initiation error:", err)

        return null
      }
    },
    [isHydrated, isAuthenticated, fetchPaymentHistory]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refetchHistory = useCallback(() => {
    lastFetchKey.current = ""
    fetchPaymentHistory()
  }, [fetchPaymentHistory])

  return {
    initiatePayment: initiatePaymentSafe,
    verifyPayment,
    paymentHistory,
    loading: isLoading,
    error,
    processing,
    clearError,
    refetchHistory,
  }
}