/**
 * Payment Service Layer
 *
 * Production-grade payment API functions using the centralized api client
 * with automatic token injection and proper error handling.
 *
 * Integrates with Squad payment gateway for checkout flows.
 */

import api from './client'
import type {
  PaymentSession,
  PaymentTransaction,
  PaymentStatus,
  TransactionLifecycle,
  PaymentFormErrors,
  WithdrawalValidation,
} from '@/types'

const PAYMENTS_ENDPOINT = '/api/v1/payments'
const PAYOUT_ENDPOINT = '/api/v1/payout'

/**
 * Initiate a Squad payment session
 * POST /api/v1/payments/initiate
 */
export async function initiatePayment(
  email: string,
  amount: number,
  callbackUrl?: string
): Promise<PaymentSession> {
  const body: Record<string, unknown> = {
    email,
    amount,
  }

  if (callbackUrl) {
    body.callbackUrl = callbackUrl
  }

  const response = await api.post<PaymentSession>(`${PAYMENTS_ENDPOINT}/initiate`, body)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to initiate payment')
  }

  return response.data
}

/**
 * Verify a payment by reference
 * GET /api/v1/payments/verify/:reference
 */
export async function verifyPayment(reference: string): Promise<PaymentTransaction> {
  const response = await api.get<PaymentTransaction>(`${PAYMENTS_ENDPOINT}/verify/${reference}`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to verify payment')
  }

  return response.data
}

/**
 * Get payment history
 * GET /api/v1/payments/history
 */
export async function getPaymentHistory(): Promise<PaymentTransaction[]> {
  const response = await api.get<PaymentTransaction[]>(`${PAYMENTS_ENDPOINT}/history`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch payment history')
  }

  return response.data
}

/**
 * Get payout history
 * GET /api/v1/payout/payouts
 */
export async function getPayouts(): Promise<PaymentTransaction[]> {
  const response = await api.get<PaymentTransaction[]>(`${PAYOUT_ENDPOINT}/payouts`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch payout history')
  }

  return response.data
}

/**
 * Get withdrawal history
 * GET /api/v1/payout/withdrawals
 */
export async function getWithdrawals(): Promise<PaymentTransaction[]> {
  const response = await api.get<PaymentTransaction[]>(`${PAYOUT_ENDPOINT}/withdrawals`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch withdrawal history')
  }

  return response.data
}

/**
 * Request a withdrawal
 * POST /api/v1/payout/withdraw
 */
export async function requestWithdrawal(
  payload: {
    amount: number
    bankCode: string
    accountNumber: string
    accountName: string
    narration?: string
  }
): Promise<PaymentTransaction> {
  const response = await api.post<PaymentTransaction>(`${PAYOUT_ENDPOINT}/withdraw`, payload)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to request withdrawal')
  }

  return response.data
}

/**
 * Get financial analytics
 * GET /api/v1/payments/analytics
 */
export async function getFinancialAnalytics(): Promise<{
  totalCredits: number
  totalDebits: number
  totalWithdrawals: number
  totalPayouts: number
  successfulPayments: number
  failedPayments: number
  netFlow: number
  averageTransaction: number
}> {
  const response = await api.get<{
    totalCredits: number
    totalDebits: number
    totalWithdrawals: number
    totalPayouts: number
    successfulPayments: number
    failedPayments: number
    netFlow: number
    averageTransaction: number
  }>(`${PAYMENTS_ENDPOINT}/analytics`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch financial analytics')
  }

  return response.data
}

/**
 * Validate withdrawal request
 * Returns validation errors or null if valid
 */
export function validateWithdrawal(
  amount: number,
  bankCode: string,
  accountNumber: string,
  accountName: string,
  balance: number
): PaymentFormErrors | null {
  const errors: PaymentFormErrors = {}

  if (!amount || amount <= 0) {
    errors.amount = 'Amount must be greater than zero'
  } else if (amount > balance) {
    errors.amount = 'Insufficient balance'
  } else if (amount < 100) {
    errors.amount = 'Minimum withdrawal is ₦100'
  }

  if (!bankCode) {
    errors.bankCode = 'Please select a bank'
  }

  if (!accountNumber || accountNumber.length < 10) {
    errors.accountNumber = 'Please enter a valid account number (min 10 digits)'
  } else if (!/^\d+$/.test(accountNumber)) {
    errors.accountNumber = 'Account number must contain only digits'
  }

  if (!accountName || accountName.trim().length < 2) {
    errors.accountName = 'Please enter a valid account name'
  }

  return Object.keys(errors).length > 0 ? errors : null
}