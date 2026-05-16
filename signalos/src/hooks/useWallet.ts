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



import { useState, useEffect, useRef, useCallback } from 'react'
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
    wallet,
    balance,
    ledger,
    transactions,
    loading,
    error,
    refetch,
  }
}