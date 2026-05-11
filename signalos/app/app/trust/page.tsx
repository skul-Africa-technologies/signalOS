"use client"

import { useTrustScore } from "@/src/hooks/useTrustScore"
import { useTransactions } from "@/src/hooks/useTransactions"

export default function TrustPage() {
  const { 
    trustScore, 
    riskLevel, 
    reasons, 
    breakdown, 
    loading: trustLoading, 
    error: trustError,
    recalculate 
  } = useTrustScore()
  
  const { transactions, loading: txLoading, error: txError } = useTransactions()

  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (trustScore / 100) * circumference

  const handleRecalculate = async () => {
    await recalculate()
  }

  if (trustError || txError) {
    return (
      <div className="pt-6 pb-4">
        <p className="text-sm text-destructive text-center">
          {trustError || txError}
        </p>
      </div>
    )
  }

  return (
    <div className="pt-6 pb-4 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium tracking-[-0.01em]">Trust & Analytics</h1>
        <button
          onClick={handleRecalculate}
          disabled={trustLoading}
          className="text-xs px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
        >
          {trustLoading ? "Calculating..." : "Recalculate"}
        </button>
      </div>

      <section className="flex justify-center">
        <div className="relative w-48 h-48">
          {trustLoading ? (
            <div className="w-full h-full rounded-full bg-tag-bg animate-pulse" />
          ) : (
            <>
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="var(--tag-bg)"
                  strokeWidth="10"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="var(--text-1)"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-medium">{trustScore}</span>
                <span className="text-xs text-text-2">/100</span>
              </div>
            </>
          )}
        </div>
      </section>

      {trustLoading ? (
        <div className="h-5 bg-tag-bg rounded animate-pulse w-48 mx-auto" />
      ) : (
        <div className="text-center">
          <span className="text-xs uppercase tracking-wide text-text-2">Risk Level</span>
          <p className="text-lg font-medium">{riskLevel}</p>
        </div>
      )}

      {!trustLoading && reasons.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium tracking-[-0.01em]">Why this score?</h2>
          <ul className="space-y-1">
            {reasons.map((reason, i) => (
              <li key={i} className="text-sm text-text-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-text-1 rounded-full" />
                {reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Score breakdown</h2>
        {trustLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-tag-bg rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-text-2 mb-1">Transaction consistency</p>
              <p className="text-lg font-medium mb-1">{breakdown.transactionConsistency}</p>
              <div className="h-1.5 bg-tag-bg rounded-full overflow-hidden">
                <div className="h-full bg-text-1" style={{ width: `${breakdown.transactionConsistency}%` }} />
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-text-2 mb-1">Payment frequency</p>
              <p className="text-lg font-medium mb-1">{breakdown.paymentFrequency}</p>
              <div className="h-1.5 bg-tag-bg rounded-full overflow-hidden">
                <div className="h-full bg-text-1" style={{ width: `${breakdown.paymentFrequency}%` }} />
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-text-2 mb-1">Savings reliability</p>
              <p className="text-lg font-medium mb-1">{breakdown.savingsReliability}</p>
              <div className="h-1.5 bg-tag-bg rounded-full overflow-hidden">
                <div className="h-full bg-text-1" style={{ width: `${breakdown.savingsReliability}%` }} />
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-text-2 mb-1">Activity level</p>
              <p className="text-lg font-medium mb-1">{breakdown.activityLevel}</p>
              <div className="h-1.5 bg-tag-bg rounded-full overflow-hidden">
                <div className="h-full bg-text-1" style={{ width: `${breakdown.activityLevel}%` }} />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Transaction history</h2>
        {txLoading ? (
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-12 bg-tag-bg rounded-lg animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-text-2 text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-text-2">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${tx.type === 'CREDIT' ? 'text-green-500' : 'text-text-1'}`}>
                    {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    tx.status === 'SUCCESS' ? 'bg-tag-bg' : 'bg-tag-bg'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}