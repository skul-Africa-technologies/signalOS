/**
 * Transaction Hook
 *
 * Production-grade hook for transaction data with:
 * - Auth state awareness
 * - Proper loading/error states
 * - No duplicate requests
 */

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/src/context/AuthContext'
import { getTransactions } from '@/src/api/transaction.service'
import type { TransactionRecord } from '@/types'

interface UseTransactionsReturn {
  transactions: TransactionRecord[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTransactions(): UseTransactionsReturn {
  const { isHydrated, isAuthenticated } = useAuth()
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
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

    getTransactions()
      .then((data) => {
        setTransactions(data)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load transactions'
        setError(message)
        console.error('Transactions fetch error:', err)
      })
  }, [isHydrated, isAuthenticated])

  const refetch = () => {
    lastFetchKey.current = ''
  }

  return {
    transactions,
    loading: isLoading,
    error,
    refetch,
  }
}