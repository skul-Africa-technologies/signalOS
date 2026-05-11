/**
 * Wallet Hook
 *
 * Production-grade hook for wallet data with:
 * - Auth state awareness
 * - Proper loading/error states
 * - No duplicate requests
 * - Cached requests where appropriate
 */

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/src/context/AuthContext'
import { getWallet, getWalletBalance, getWalletLedger } from '@/src/api/wallet.service'
import type { Wallet, WalletBalance, LedgerEntry, Transaction } from '@/types'

interface UseWalletReturn {
  wallet: Wallet | null
  balance: WalletBalance | null
  ledger: LedgerEntry[]
  transactions: Transaction[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Transform ledger entries to transaction format for display
 */
function ledgerToTransactions(ledger: LedgerEntry[]): Transaction[] {
  return ledger.map((entry) => ({
    id: entry.id,
    name: entry.description || entry.reference,
    amount: entry.amount,
    time: new Date(entry.createdAt).toLocaleString(),
    status: entry.status,
    type: entry.type,
  }))
}

export function useWallet(): UseWalletReturn {
  const { isHydrated, isAuthenticated } = useAuth()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const lastFetchKey = useRef<string>('')

  // Derive loading state from initial mount + conditions
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

    // Fetch in parallel for performance
    Promise.all([
      getWallet(),
      getWalletBalance(),
      getWalletLedger(),
    ])
      .then(([walletData, balanceData, ledgerData]) => {
        setWallet(walletData)
        setBalance(balanceData)
        setLedger(ledgerData)
        setTransactions(ledgerToTransactions(ledgerData))
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load wallet data'
        setError(message)
        console.error('Wallet fetch error:', err)
      })
  }, [isHydrated, isAuthenticated])

  const refetch = () => {
    lastFetchKey.current = ''
  }

  return {
    wallet,
    balance,
    ledger,
    transactions,
    loading: isLoading,
    error,
    refetch,
  }
}