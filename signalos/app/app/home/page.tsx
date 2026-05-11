"use client"

import { useWallet } from "@/src/hooks/useWallet"
import { getTrustScore } from "@/src/api/trust"
import { useOnboardingStore } from "@/src/store"
import { useState, useEffect } from "react"

export default function HomePage() {
  const { name, location } = useOnboardingStore()
  const { balance, transactions, loading: walletLoading, error: walletError } = useWallet()
  const [trustScore, setTrustScore] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const score = await getTrustScore()
        setTrustScore(score)
      } catch (err) {
        console.error('Failed to load trust score:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // Combined loading state
  const isLoading = walletLoading || loading

  // Error state
  if (walletError) {
    return (
      <div className="pt-6 pb-4">
        <p className="text-sm text-destructive text-center">{walletError}</p>
      </div>
    )
  }

  return (
    <div className="pt-6 pb-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-medium tracking-[-0.01em]">
          {greeting()}, {name || "Ada"}
        </h1>
        <p className="text-sm text-text-2">{location || "Wuse Market"}</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="space-y-1 mb-4">
          <p className="text-sm text-text-2">Balance</p>
          {isLoading ? (
            <div className="h-8 bg-tag-bg rounded animate-pulse mb-2" />
          ) : (
            <p className="text-2xl font-medium tracking-[-0.01em]">₦{balance?.balance.toLocaleString() ?? '0'}.00</p>
          )}
          <p className="text-xs text-text-2">
            Today: ₦{balance?.availableBalance.toLocaleString() ?? '0'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 h-10 border border-border rounded-lg text-sm font-medium">
            Receive
          </button>
          <button className="flex-1 h-10 bg-text-1 text-white rounded-lg text-sm font-medium">
            Send
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm">Business trust score</span>
          <span className="text-sm font-medium">{trustScore}/100</span>
        </div>
        <div className="h-2 bg-tag-bg rounded-full overflow-hidden">
          <div className="h-full bg-text-1" style={{ width: `${trustScore}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-medium">₦12,500</p>
          <p className="text-[10px] text-text-2 uppercase tracking-wide">Sales today</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-medium">24</p>
          <p className="text-[10px] text-text-2 uppercase tracking-wide">Customers</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-medium">12</p>
          <p className="text-[10px] text-text-2 uppercase tracking-wide">Inventory</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Activity</h2>
        <div className="space-y-2">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-12 bg-tag-bg rounded-lg animate-pulse" />
            ))
          ) : transactions.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-4">No transactions yet</p>
          ) : (
            transactions.slice(0, 3).map((txn) => (
              <div key={txn.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm">{txn.name}</p>
                  <p className="text-xs text-text-2">{txn.time}</p>
                </div>
                <span className={`text-sm font-medium ${txn.amount >= 0 ? 'text-green-500' : 'text-text-1'}`}>
                  ₦{Math.abs(txn.amount).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}