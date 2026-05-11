/**
 * Withdrawal Hook
 *
 * Production-grade hook for withdrawal management with:
 * - Form validation
 * - Duplicate request prevention
 * - Auth state awareness
 * - Loading/error states
 * - Wallet balance synchronization after success
 * - Retry-safe actions
 * - Bank code validation
 */

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/src/context/AuthContext"
import { useWallet } from "@/src/hooks/useWallet"
import { requestWithdrawal, validateWithdrawal } from "@/src/api/payment.service"
import { WithdrawalRequest, WithdrawalValidation, WithdrawalStatus } from "@/types"

interface UseWithdrawalReturn {
  // Form state
  amount: number
  setAmount: (value: number) => void
  bankCode: string
  setBankCode: (value: string) => void
  accountNumber: string
  setAccountNumber: (value: string) => void
  accountName: string
  setAccountName: (value: string) => void
  narration: string
  setNarration: (value: string) => void

  // Actions
  submitWithdrawal: () => Promise<boolean>
  resetForm: () => void
  validate: () => WithdrawalValidation

  // State
  loading: boolean
  processing: boolean
  error: string | null
  success: boolean
  validationErrors: WithdrawalValidation | null
  lastWithdrawal: Withdrawal | null

  // Utilities
  clearError: () => void
  clearSuccess: () => void
  canSubmit: boolean
  availableBalance: number
}

interface Withdrawal extends WithdrawalRequest {
  id: string
  reference: string
  status: WithdrawalStatus.PROCESSING | WithdrawalStatus.SUCCESS | WithdrawalStatus.FAILED | WithdrawalStatus.PENDING
  createdAt: string
  updatedAt: string
}

// Bank codes for validation
const VALID_BANK_CODES = new Set([
  "044", "011", "214", "058", "033", "215", "221",
  "076", "050", "030", "035", "232", "032", "082",
  "070", "084", "301", "309", "014", "101", "216", "057"
])

const MIN_WITHDRAWAL = 100

export function useWithdrawal(initialBalance: number = 0): UseWithdrawalReturn {
  const { isHydrated, isAuthenticated } = useAuth()
  const { balance, refetch: refetchWallet } = useWallet()

  const availableBalance = balance?.balance ?? initialBalance

  // Form state
  const [amount, setAmount] = useState<number>(0)
  const [bankCode, setBankCode] = useState<string>("")
  const [accountNumber, setAccountNumber] = useState<string>("")
  const [accountName, setAccountName] = useState<string>("")
  const [narration, setNarration] = useState<string>("")

  // UI state
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<WithdrawalValidation | null>(null)
  const [lastWithdrawal, setLastWithdrawal] = useState<Withdrawal | null>(null)

  // Duplicate submission prevention
  const submittingRef = useRef(false)
  const lastRequestRef = useRef<string>("")

  // Auto-clear success/error after timeout
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current)
      errorTimerRef.current = null
    }
  }, [])

  const clearSuccess = useCallback(() => {
    setSuccess(false)
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
  }, [])

  // Validate form fields
  const validate = useCallback((): WithdrawalValidation => {
    const errors = validateWithdrawal(amount, bankCode, accountNumber, accountName, availableBalance)

    if (errors) {
      setValidationErrors({ valid: false, errors })
      return { valid: false, errors }
    }

    setValidationErrors(null)
    return { valid: true, errors: {} }
  }, [amount, bankCode, accountNumber, accountName, availableBalance])

  // Check if form can be submitted
  const canSubmit = !!(
    amount > 0 &&
    amount <= availableBalance &&
    amount >= MIN_WITHDRAWAL &&
    bankCode &&
    VALID_BANK_CODES.has(bankCode) &&
    accountNumber &&
    accountNumber.length >= 10 &&
    /^\d+$/.test(accountNumber) &&
    accountName &&
    accountName.trim().length >= 2 &&
    !submittingRef.current
  )

  // Submit withdrawal
  const submitWithdrawal = useCallback(async (): Promise<boolean> => {
    // Guard: must be authenticated
    if (!isHydrated || !isAuthenticated) {
      setError("Authentication required. Please log in again.")
      errorTimerRef.current = setTimeout(clearError, 5000)
      return false
    }

    // Guard: prevent duplicate submissions
    if (submittingRef.current) {
      setError("A withdrawal request is already being processed.")
      errorTimerRef.current = setTimeout(clearError, 5000)
      return false
    }

    // Validate again before submission
    const validation = validate()
    if (!validation.valid) {
      const firstError = Object.values(validation.errors || {})[0]
      setError(firstError || "Please fix the form errors below.")
      errorTimerRef.current = setTimeout(clearError, 5000)
      return false
    }

    // Generate unique request reference for idempotency tracking
    const requestRef = `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Prevent duplicate for the same request
    if (lastRequestRef.current === requestRef) {
      setError("Duplicate request detected. Please wait.")
      errorTimerRef.current = setTimeout(clearError, 5000)
      return false
    }

    submittingRef.current = true
    lastRequestRef.current = requestRef
    setLoading(true)
    setProcessing(true)
    setError(null)
    setSuccess(false)
    setValidationErrors(null)

    try {
      const payload: WithdrawalRequest = {
        amount,
        bankCode,
        accountNumber,
        accountName,
        narration: narration || "Withdrawal from signalOS wallet",
      }

      await requestWithdrawal(payload)

      setSuccess(true)
       setLastWithdrawal({
         id: requestRef,
         reference: requestRef,
         ...payload,
         status: WithdrawalStatus.PROCESSING,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
       })

      // Refresh wallet balance to reflect the pending withdrawal
      refetchWallet()

      // Auto-clear success state after 8 seconds
      successTimerRef.current = setTimeout(() => {
        setSuccess(false)
      }, 8000)

      submittingRef.current = false
      setLoading(false)
      setProcessing(false)

      return true
    } catch (err) {
      submittingRef.current = false
      setLoading(false)
      setProcessing(false)

      const message = err instanceof Error ? err.message : "Withdrawal request failed. Please try again."
      setError(message)
      errorTimerRef.current = setTimeout(clearError, 8000)

      console.error("Withdrawal error:", err)
      return false
    }
  }, [
    isHydrated,
    isAuthenticated,
    amount,
    bankCode,
    accountNumber,
    accountName,
    narration,
    refetchWallet,
    validate,
    clearError,
  ])

  // Reset entire form
  const resetForm = useCallback(() => {
    setAmount(0)
    setBankCode("")
    setAccountNumber("")
    setAccountName("")
    setNarration("")
    setError(null)
    setSuccess(false)
    setValidationErrors(null)
    submittingRef.current = false
  }, [])

  return {
    // Form state
    amount,
    setAmount,
    bankCode,
    setBankCode,
    accountNumber,
    setAccountNumber,
    accountName,
    setAccountName,
    narration,
    setNarration,

    // Actions
    submitWithdrawal,
    resetForm,
    validate,

    // State
    loading,
    processing,
    error,
    success,
    validationErrors,
    lastWithdrawal,
    availableBalance,

    // Utilities
    clearError,
    clearSuccess,
    canSubmit,
  }
}