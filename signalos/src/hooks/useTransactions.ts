/**
 * Transaction Hook
 *
 * Production-grade hook for transaction data with:
 * - Auth state awareness
 * - Proper loading/error states
 * - No duplicate requests
 */

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback } from 'react'
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
   const [loading, setLoading] = useState(false)
   const lastFetchKey = useRef<string>('')

   const fetchData = useCallback(() => {
     const fetchKey = `${isHydrated}-${isAuthenticated}`

     // Skip if already fetched the same state
     if (fetchKey === lastFetchKey.current) return
     lastFetchKey.current = fetchKey

     // Only fetch if authenticated and hydrated
     if (!isHydrated || !isAuthenticated) {
       return
     }

     setError(null)
     setLoading(true)

     getTransactions()
       .then((data) => {
         setTransactions(data)
       })
       .catch((err) => {
         const message = err instanceof Error ? err.message : 'Failed to load transactions'
         setError(message)
         console.error('Transactions fetch error:', err)
       })
       .finally(() => {
         setLoading(false)
       })
   }, [isHydrated, isAuthenticated])

   useEffect(() => {
     fetchData()
   }, [fetchData])

   const refetch = useCallback(() => {
     lastFetchKey.current = ''
     fetchData()
   }, [fetchData])

   return {
     transactions,
     loading,
     error,
     refetch,
   }
 }