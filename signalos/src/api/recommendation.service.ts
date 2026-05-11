/**
 * Recommendation Service Layer
 *
 * Production-grade recommendation API functions using the centralized api client
 * with automatic token injection and proper error handling.
 */

import api from './client'
import type { Recommendation, RecommendationSummary } from '@/types'

const RECOMMENDATIONS_ENDPOINT = '/api/v1/recommendations'

/**
 * Get recommendation summary
 * GET /api/v1/recommendations/summary
 */
export async function getRecommendationSummary(): Promise<RecommendationSummary> {
  const response = await api.get<RecommendationSummary>(`${RECOMMENDATIONS_ENDPOINT}/summary`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch recommendation summary')
  }

  return response.data
}

/**
 * Get financial recommendations
 * GET /api/v1/recommendations
 */
export async function getRecommendations(): Promise<Recommendation[]> {
  const response = await api.get<Recommendation[]>(RECOMMENDATIONS_ENDPOINT)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch recommendations')
  }

  return response.data
}