/**
 * Transaction Service Layer
 *
 * Production-grade transaction API functions using the centralized api client
 * with automatic token injection and proper error handling.
 */

import api from './client'
import type { TransactionRecord } from '@/types'

const TRANSACTIONS_ENDPOINT = '/api/v1/transactions'

/**
 * Get transaction history
 * GET /api/v1/transactions
 */
export async function getTransactions(): Promise<TransactionRecord[]> {
  const response = await api.get<TransactionRecord[]>(TRANSACTIONS_ENDPOINT)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch transactions')
  }

  return response.data
}

/**
 * Get a single transaction by ID
 * GET /api/v1/transactions/:id
 */
export async function getTransactionById(id: string): Promise<TransactionRecord> {
  const response = await api.get<TransactionRecord>(`${TRANSACTIONS_ENDPOINT}/${id}`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch transaction')
  }

  return response.data
}