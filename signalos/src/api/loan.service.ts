/**
 * Loan Service Layer
 *
 * Production-grade loan API functions using the centralized api client
 * with automatic token injection and proper error handling.
 *
 * Behavioral Credit Scoring Infrastructure:
 * - Alternative credit assessment based on transaction behavior
 * - Explainable AI lending decisions
 * - Trust-based microfinance integration
 */

import api from './client'
import type { LoanEligibility, LoanDisbursement, DisbursementHistory, RiskLevel } from '@/types'

const LOANS_ENDPOINT = '/api/v1/loans'

/**
 * Get cached loan eligibility
 * GET /api/v1/loans/eligibility
 *
 * Returns previously evaluated eligibility or triggers a fresh evaluation
 * if no cached result exists.
 */
export async function getEligibility(): Promise<LoanEligibility> {
  const response = await api.get<LoanEligibility>(`${LOANS_ENDPOINT}/eligibility`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch loan eligibility')
  }

  return response.data
}

/**
 * Evaluate loan eligibility (full behavioral credit assessment)
 * POST /api/v1/loans/evaluate
 *
 * Runs a comprehensive analysis of:
 * - Transaction consistency
 * - Payment frequency
 * - Savings reliability
 * - Activity level
 * - Trust score integration
 *
 * Updates cached eligibility and persists evaluation result.
 */
export async function evaluateEligibility(): Promise<LoanEligibility> {
  const response = await api.post<LoanEligibility>(`${LOANS_ENDPOINT}/evaluate`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to evaluate loan eligibility')
  }

  return response.data
}

/**
 * Disburse approved loan to wallet
 * POST /api/v1/loans/disburse
 *
 * Flow:
 * 1. Validates eligibility cache
 * 2. Checks requested amount <= eligible amount
 * 3. Prevents duplicate active disbursements
 * 4. Creates loan disbursement record
 * 5. Credits wallet immediately
 * 6. Creates ledger entry
 * 7. Emits disbursement event
 * 8. Returns disbursement record
 *
 * @param amount - Requested loan amount (must be <= eligible amount)
 * @param loanTermDays - Loan term in days (default: 30)
 */
export async function disburseLoan(
  amount: number,
  loanTermDays: number = 30
): Promise<LoanDisbursement> {
  const response = await api.post<LoanDisbursement>(
    `${LOANS_ENDPOINT}/disburse`,
    { amount, loanTermDays }
  )

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to disburse loan')
  }

  return response.data
}

/**
 * Get loan disbursement history
 * GET /api/v1/loans/disbursements
 *
 * Returns all loan disbursements for the authenticated user,
 * ordered by creation date (most recent first).
 */
export async function getDisbursementHistory(): Promise<DisbursementHistory> {
  const response = await api.get<DisbursementHistory>(`${LOANS_ENDPOINT}/disbursements`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch disbursement history')
  }

  return response.data
}

/**
 * Validate disbursement request before submission
 * Client-side validation mirroring backend rules
 */
export function validateDisbursement(
  requestedAmount: number,
  eligibleAmount: number,
  hasActiveLoan: boolean
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (requestedAmount <= 0) {
    errors.push('Loan amount must be greater than zero')
  }

  if (requestedAmount > eligibleAmount) {
    errors.push(`Requested amount ₦${requestedAmount.toLocaleString()} exceeds eligible amount ₦${eligibleAmount.toLocaleString()}`)
  }

  if (hasActiveLoan) {
    errors.push('You already have an active loan. Please repay current loan before applying.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Format loan amount for display (Nigerian Naira)
 */
export function formatLoanAmount(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Get risk level color class for UI
 */
export function getRiskLevelColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'Low':
      return 'text-green-500'
    case 'Medium':
      return 'text-yellow-500'
    case 'High':
      return 'text-orange-500'
    case 'Very High':
      return 'text-red-500'
    default:
      return 'text-text-2'
  }
}

/**
 * Get risk level badge variant for UI
 */
export function getRiskLevelBadge(riskLevel: RiskLevel): 'success' | 'warning' | 'error' | 'neutral' {
  switch (riskLevel) {
    case 'Low':
      return 'success'
    case 'Medium':
      return 'warning'
    case 'High':
      return 'error'
    case 'Very High':
      return 'neutral'
    default:
      return 'neutral'
  }
}
