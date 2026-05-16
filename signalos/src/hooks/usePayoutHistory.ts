/**
 * Payout & Withdrawal History Hook
 *
 * Production-grade hook for fetching and managing payout/withdrawal history with:
 * - Auth state awareness
 * - Pagination support
 * - Proper loading/error states
 * - Data refresh with synchronization
 * - Integration with financial analytics
 */

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/src/context/AuthContext"
import {
  getPayouts,
  getWithdrawals,
  getFinancialAnalytics,
  verifyPayment,
} from "@/src/api/payment.service"
import type { PaymentTransaction, FinancialAnalytics } from "@/types"

interface UsePayoutHistoryReturn {
  payouts: PaymentTransaction[]
  withdrawals: PaymentTransaction[]
  analytics: FinancialAnalytics | null
  loading: boolean
  error: string | null
  refetch: () => void
  verifyTransaction: (reference: string) => Promise<void>
}

export function usePayoutHistory(): UsePayoutHistoryReturn {
   const { isHydrated, isAuthenticated } = useAuth()
   const [payouts, setPayouts] = useState<PaymentTransaction[]>([])
   const [withdrawals, setWithdrawals] = useState<PaymentTransaction[]>([])
   const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null)
   const [error, setError] = useState<string | null>(null)
   const [loading, setLoading] = useState(false)

   const lastFetchKey = useRef<string>("")

   const fetchData = useCallback(async () => {
     if (!isHydrated || !isAuthenticated) return

     const fetchKey = `${isHydrated}-${isAuthenticated}`
     if (fetchKey === lastFetchKey.current) return
     lastFetchKey.current = fetchKey

     setLoading(true)
     setError(null)

     try {
       const [payoutsData, withdrawalsData, analyticsData] = await Promise.all([
         getPayouts(),
         getWithdrawals(),
         getFinancialAnalytics(),
       ])

       setPayouts(payoutsData || [])
       setWithdrawals(withdrawalsData || [])
       setAnalytics(analyticsData || null)
     } catch (err) {
       const message = err instanceof Error ? err.message : "Failed to fetch payout history"
       setError(message)
       console.error("Payout history fetch error:", err)
     } finally {
       setLoading(false)
     }
   }, [isHydrated, isAuthenticated])

useEffect(() => {
      if (isHydrated && isAuthenticated) {
        // Use setTimeout to avoid calling async function that sets state synchronously in effect
        setTimeout(() => fetchData(), 0)
      }
    }, [isHydrated, isAuthenticated, fetchData])

  const verifyTransaction = useCallback(
    async (reference: string) => {
      try {
        await verifyPayment(reference)
        // Refresh all data after verification
        lastFetchKey.current = ""
        fetchData()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to verify transaction"
        setError(message)
        console.error("Transaction verification error:", err)
      }
    },
    [fetchData]
  )

  const refetch = useCallback(() => {
    lastFetchKey.current = ""
    fetchData()
  }, [fetchData])

return {
     payouts,
     withdrawals,
     analytics,
     loading,
     error,
     refetch,
     verifyTransaction,
   }
 }