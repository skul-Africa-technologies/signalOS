"use client"

import { useState } from "react"
import { useLoans } from "@/src/hooks/use-loans"
import { useWallet } from "@/src/hooks/useWallet"
import { formatLoanAmount, getRiskLevelColor, getRiskLevelBadge } from "@/src/api/loan.service"
import type { RiskLevel } from "@/types"
import { CheckCircle, AlertCircle, Loader2, DollarSign, TrendingUp, Shield, Activity } from "lucide-react"

export default function LoansPage() {
  const {
    eligibility,
    eligibilityLoading,
    evaluating,
    evaluate,
    disburse,
    disbursing,
    disbursementError,
    history,
    historyLoading,
    error,
    isEligible,
    maxEligibleAmount,
    behavioralBreakdown,
    riskLevel,
  } = useLoans()

  const { balance, refetch: refetchWallet } = useWallet()

  // Loan application form state
  const [requestedAmount, setRequestedAmount] = useState<number>(0)
  const [loanTerm, setLoanTerm] = useState<number>(30)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Quick amount presets (based on eligibility)
  const presets = [10000, 25000, 50000, 100000, 200000].filter((amt) => amt <= maxEligibleAmount)

  // Handle loan request
  const handleRequestLoan = async () => {
    if (requestedAmount <= 0 || requestedAmount > maxEligibleAmount) {
      return
    }

    try {
      await disburse(requestedAmount, loanTerm)
      setSuccessMessage(`₦${requestedAmount.toLocaleString()} disbursed to your wallet!`)
      setShowSuccess(true)

      // Refresh wallet to show new balance
      await refetchWallet()

      // Reset form after delay
      setTimeout(() => {
        setShowSuccess(false)
        setRequestedAmount(0)
      }, 3000)
    } catch (err) {
      // Error is handled in hook state
      console.error('Loan request failed:', err)
    }
  }

  // Handle evaluation trigger
  const handleEvaluate = async () => {
    await evaluate()
  }

  // Get risk badge styling
  const riskBadge = getRiskLevelBadge(riskLevel as RiskLevel)

  // Loading state
  if (eligibilityLoading && !eligibility) {
    return (
      <div className="pt-6 pb-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium tracking-[-0.01em]">Loans</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-tag-bg rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pt-6 pb-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium tracking-[-0.01em]">Behavioral Lending</h1>
        {!eligibility && (
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {evaluating ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Evaluating...
              </>
            ) : (
              "Check Eligibility"
            )}
          </button>
        )}
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-green-500">Loan Disbursed Successfully</p>
            <p className="text-sm text-text-2 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Disbursement Error */}
      {disbursementError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-red-500">Disbursement Failed</p>
            <p className="text-sm text-text-2 mt-0.5">{disbursementError}</p>
          </div>
        </div>
      )}

      {/* Eligibility Overview Card */}
      {eligibility && (
        <section className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-medium uppercase tracking-wide text-text-2">Loan Status</h2>
              <div className="flex items-center gap-2">
                <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                  riskBadge === 'success' ? 'bg-green-500/10 text-green-500' :
                  riskBadge === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  {riskLevel} Risk
                </span>
                {isEligible ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle size={12} />
                    Eligible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={12} />
                    Not Eligible
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-medium">{formatLoanAmount(maxEligibleAmount)}</p>
              <p className="text-xs text-text-2">Maximum Available</p>
            </div>
          </div>

          {/* Current Wallet Balance */}
          {balance && (
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-text-2" />
                <span className="text-xs text-text-2">Current Balance</span>
              </div>
              <span className="text-sm font-medium">{formatLoanAmount(balance.availableBalance)}</span>
            </div>
          )}

          {/* Trust Score Influence */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              <span className="text-xs text-text-2">Trust Score</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-semibold">{eligibility.trustScore}</span>
              <span className="text-xs text-text-2">/100</span>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-tag-bg/30 rounded-xl p-3">
            <p className="text-sm">{eligibility.recommendation}</p>
          </div>
        </section>
      )}

      {/* Not Eligible CTA */}
      {eligibility && !isEligible && (
        <section className="bg-tag-bg/30 border border-border rounded-2xl p-5 text-center space-y-3">
          <AlertCircle className="mx-auto text-text-2" size={32} />
          <div>
            <h3 className="text-sm font-medium">Build Your Credit</h3>
            <p className="text-xs text-text-2 mt-1">
              Your trust score is {eligibility.trustScore}. Keep building transaction history, consistent payments, and savings to qualify.
            </p>
          </div>
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {evaluating ? "Re-evaluating..." : "Re-evaluate Eligibility"}
          </button>
        </section>
      )}

      {/* Behavioral Breakdown */}
      {eligibility && behavioralBreakdown && isEligible && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-[-0.01em] flex items-center gap-2">
              <Activity size={16} />
              Behavioral Breakdown
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(behavioralBreakdown).map(([key, value]) => {
              const labels: Record<string, string> = {
                transactionConsistency: "Transaction Consistency",
                paymentFrequency: "Payment Frequency",
                savingsReliability: "Savings Reliability",
                activityLevel: "Activity Level",
              }

              const label = labels[key] || key
              const percentage = value

              return (
                <div key={key} className="bg-surface border border-border rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wide text-text-2 mb-2">{label}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold">{percentage}</span>
                    <span className="text-xs text-text-2">/100</span>
                  </div>
                  <div className="h-1.5 bg-tag-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Explainable AI - Factors */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-medium mb-3">Why You Qualify</h3>
            <ul className="space-y-2">
              {eligibility.reasons.map((reason, i) => (
                <li key={i} className="text-sm text-text-2 flex items-start gap-2">
                  <Shield className="text-green-500 shrink-0 mt-0.5" size={14} />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Loan Application Form */}
      {eligibility && isEligible && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium tracking-[-0.01em]">Request Loan</h2>

          {/* Amount Presets */}
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setRequestedAmount(amount)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    requestedAmount === amount
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-surface border-border text-text-1 hover:border-blue-500'
                  }`}
                >
                  {formatLoanAmount(amount)}
                </button>
              ))}
            </div>
          )}

          {/* Custom Amount Input */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs text-text-2 block mb-1.5">Custom Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" size={18} />
                <input
                  type="number"
                  value={requestedAmount || ''}
                  onChange={(e) => setRequestedAmount(Number(e.target.value))}
                  placeholder="0.00"
                  max={maxEligibleAmount}
                  className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-lg text-text-1 placeholder:text-text-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-text-2 mt-1.5">
                Max: {formatLoanAmount(maxEligibleAmount)}
              </p>
            </div>

            {/* Loan Term */}
            <div>
              <label className="text-xs text-text-2 block mb-1.5">Loan Term (days)</label>
              <div className="flex gap-2">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setLoanTerm(days)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      loanTerm === days
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-bg border-border text-text-1 hover:border-blue-500'
                    }`}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {requestedAmount > 0 && (
              <div className="bg-tag-bg/30 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-text-2">Principal</span>
                  <span>{formatLoanAmount(requestedAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-2">Term</span>
                  <span>{loanTerm} days</span>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 border-t border-border">
                  <span>Total to Repay</span>
                  <span>{formatLoanAmount(requestedAmount)}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleRequestLoan}
              disabled={disbursing || requestedAmount <= 0 || requestedAmount > maxEligibleAmount}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {disbursing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign size={16} />
                  Disburse {requestedAmount > 0 ? formatLoanAmount(requestedAmount) : "Loan"}
                </>
              )}
            </button>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
          </div>
        </section>
      )}

      {/* Loan History */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Loan History</h2>

        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-tag-bg rounded-xl animate-pulse" />
            ))}
          </div>
        ) : history && history.disbursements.length > 0 ? (
          <div className="space-y-2">
            {history.disbursements.map((loan) => (
              <div
                key={loan.id}
                className="bg-surface border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatLoanAmount(loan.amount)}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        loan.status === 'DISBURSED' ? 'bg-blue-500/10 text-blue-500' :
                        loan.status === 'REPAID' ? 'bg-green-500/10 text-green-500' :
                        loan.status === 'DEFAULTED' ? 'bg-red-500/10 text-red-500' :
                        'bg-tag-bg text-text-2'
                      }`}>
                        {loan.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-2">
                      {new Date(loan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-2">Due: {new Date(loan.dueDate).toLocaleDateString()}</p>
                    <p className="text-xs text-text-2">{loan.loanTermDays} days</p>
                  </div>
                </div>

                {/* Risk indicator at approval */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-2">Risk at approval</span>
                  <span className={`font-medium ${
                    loan.riskLevelAtApproval === 'Low' ? 'text-green-500' :
                    loan.riskLevelAtApproval === 'Medium' ? 'text-yellow-500' :
                    'text-orange-500'
                  }`}>
                    {loan.riskLevelAtApproval} (Score: {loan.trustScoreAtApproval})
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-text-2">No loan history yet</p>
            <p className="text-xs text-text-2 mt-1">When you take a loan, it will appear here</p>
          </div>
        )}
      </section>

      {/* Info Section */}
      {!eligibility && !eligibilityLoading && (
        <section className="bg-surface border border-border rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-medium tracking-[-0.01em]">How Behavioral Lending Works</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs text-blue-500 font-medium">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Transaction Behavior</p>
                <p className="text-xs text-text-2">We analyze your payment patterns, consistency, and financial habits</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs text-blue-500 font-medium">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">AI Credit Assessment</p>
                <p className="text-xs text-text-2">Our trust score engine evaluates your financial credibility</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs text-blue-500 font-medium">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Instant Decision</p>
                <p className="text-xs text-text-2">Get your eligible amount based on your behavioral trust score</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs text-green-500 font-medium">4</span>
              </div>
              <div>
                <p className="text-sm font-medium">Instant Disbursement</p>
                <p className="text-xs text-text-2">Approved loans are deposited directly to your wallet</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
