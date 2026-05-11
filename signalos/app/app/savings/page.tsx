"use client"

import { useRecommendations } from "@/src/hooks/useRecommendations"

export default function SavingsPage() {
  const { summary, recommendations, loading, error } = useRecommendations()
  
  const groups = [
    { id: "1", name: "Market Women Cooperative", members: 12, contribution: 5000 },
    { id: "2", name: "Wuse Traders Circle", members: 8, contribution: 10000 },
    { id: "3", name: "Everyday Savers", members: 15, contribution: 2000 },
  ]
  const activeGroup = {
    id: "1",
    name: "Market Women Cooperative",
    members: ["Ada", "Nkechi", "Bisi", "Fatima"],
    nextContribution: "Tomorrow",
    status: "Active",
  }
  const contributions = [
    { id: "1", date: "May 5", amount: 5000, status: "paid" },
    { id: "2", date: "May 3", amount: 5000, status: "paid" },
    { id: "3", date: "May 1", amount: 5000, status: "paid" },
    { id: "4", date: "Apr 29", amount: 5000, status: "pending" },
  ]

  return (
    <div className="pt-6 pb-4 space-y-8">
      <h1 className="text-lg font-medium tracking-[-0.01em]">Savings & Growth</h1>

      {/* AI Recommendation Intelligence Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Financial Intelligence</h2>
        {loading ? (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div className="h-6 bg-tag-bg rounded animate-pulse mb-2" />
            <div className="h-4 bg-tag-bg rounded animate-pulse mb-2" />
            <div className="h-4 bg-tag-bg rounded animate-pulse" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : summary ? (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
            {/* Eligibility Intelligence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-2">Loan Eligibility</span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                  summary.eligibility.eligible ? 'bg-green-100 text-green-700' : 'bg-tag-bg text-text-2'
                }`}>
                  {summary.eligibility.eligible ? 'Eligible' : 'Not Eligible'}
                </span>
              </div>
              {summary.eligibility.eligible && (
                <div className="text-center py-2">
                  <p className="text-[10px] text-text-2 uppercase tracking-wide">Eligible Amount</p>
                  <p className="text-2xl font-medium">₦{summary.eligibility.eligibleAmount.toLocaleString()}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-2">Trust Score</span>
                <span className="font-medium">{summary.eligibility.trustScore}/100</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-2">Risk Level</span>
                <span className={`font-medium ${
                  summary.eligibility.riskLevel === 'Low' ? 'text-green-600' : 
                  summary.eligibility.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {summary.eligibility.riskLevel}
                </span>
              </div>
            </div>

            {/* High Priority Recommendations */}
            {recommendations.filter(r => r.priority === 'high').map((rec, i) => (
              <div key={i} className="bg-tag-bg rounded-lg p-3">
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-xs text-text-2 mt-1">{rec.description}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Join a group</h2>
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium">{group.name}</p>
                  <p className="text-xs text-text-2">{group.members} members</p>
                </div>
                <span className="text-sm">₦{group.contribution.toLocaleString()}</span>
              </div>
              <button className="w-full h-9 border border-border rounded-lg text-sm">
                Join
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Active group</h2>
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">{activeGroup.name}</p>
              <p className="text-xs text-text-2">Next contribution: {activeGroup.nextContribution}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-tag-bg">
              {activeGroup.status}
            </span>
          </div>
          <div className="flex gap-2">
            {activeGroup.members.map((m, i) => (
              <div key={i} className="w-8 h-8 bg-tag-bg rounded-full flex items-center justify-center">
                <span className="text-[10px] font-medium">{m.charAt(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Contribution timeline</h2>
        <div className="space-y-2">
          {contributions.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  c.status === "paid" ? "bg-text-1" : "bg-text-3"
                }`} />
                <span className="text-sm">{c.date}</span>
              </div>
              <span className="text-sm">₦{c.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}