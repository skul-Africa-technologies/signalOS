/**
 * Wallet Service Layer
 *
 * Production-grade wallet API functions using the centralized api client
 * with automatic token injection and proper error handling.
 */

import api from './client'
import type { Wallet, WalletBalance, LedgerEntry } from '@/types'

const WALLET_ENDPOINT = '/api/v1/wallet'

/**
 * Get the authenticated user's wallet
 * GET /api/v1/wallet
 */
export async function getWallet(): Promise<Wallet> {
  const response = await api.get<Wallet>(WALLET_ENDPOINT)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch wallet')
  }

  return response.data
}

/**
 * Get wallet balance
 * GET /api/v1/wallet/balance
 */
export async function getWalletBalance(): Promise<WalletBalance> {
  const response = await api.get<WalletBalance>(`${WALLET_ENDPOINT}/balance`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch wallet balance')
  }

  return response.data
}

/**
 * Get wallet ledger/transactions
 * GET /api/v1/wallet/ledger
 */
export async function getWalletLedger(): Promise<LedgerEntry[]> {
  const response = await api.get<LedgerEntry[]>(`${WALLET_ENDPOINT}/ledger`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch wallet ledger')
  }

  return response.data
}