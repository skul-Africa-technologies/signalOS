/**
 * Trust Score Service Layer
 *
 * Production-grade trust score API functions using the centralized api client
 * with automatic token injection and proper error handling.
 */

import api from './client'
import type { TrustScoreReport } from '@/types'

const TRUST_ENDPOINT = '/api/v1/trust-score'

/**
 * Get trust score report
 * GET /api/v1/trust-score
 */
export async function getTrustScore(): Promise<TrustScoreReport> {
  const response = await api.get<TrustScoreReport>(TRUST_ENDPOINT)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch trust score')
  }

  return response.data
}

/**
 * Recalculate trust score
 * POST /api/v1/trust-score/recalculate
 */
export async function recalculateTrustScore(): Promise<TrustScoreReport> {
  const response = await api.post<TrustScoreReport>(`${TRUST_ENDPOINT}/recalculate`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to recalculate trust score')
  }

  return response.data
}