"use client"

export default function TrustPage() {
  const trustScore = 74
  const breakdown = [
    { label: "Payment consistency", score: 85, description: "Always pays on time" },
    { label: "Business growth", score: 72, description: "Steady sales increase" },
    { label: "Savings behavior", score: 68, description: "Regular contributions" },
    { label: "Risk level", score: 25, description: "Low risk" },
  ]
  const loan = {
    eligible: true,
    amount: 50000,
    term: "90 days",
    interest: "5%",
  }

  const handleApply = async () => {
    // Mock apply
  }

  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (trustScore / 100) * circumference

  return (
    <div className="pt-6 pb-4 space-y-8">
      <h1 className="text-lg font-medium tracking-[-0.01em]">Trust &amp; Loans</h1>

      <section className="flex justify-center">
        <div className="relative w-48 h-48">
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
        </div>
      </section>

      {trustScore > 65 && (
        <p className="text-center text-sm text-text-2">Eligible for microloan</p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Score breakdown</h2>
        <div className="grid grid-cols-2 gap-3">
          {breakdown.map((item) => (
            <div key={item.label} className="bg-surface border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-text-2 mb-1">{item.label}</p>
              <p className="text-lg font-medium mb-1">{item.score}</p>
              <div className="h-1.5 bg-tag-bg rounded-full overflow-hidden mb-2">
                <div className="h-full bg-text-1" style={{ width: `${item.score}%` }} />
              </div>
              <p className="text-[10px] text-text-2">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Loan</h2>
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="text-center">
            <p className="text-[10px] text-text-2 uppercase">Eligible amount</p>
            <p className="text-2xl font-medium">₦{loan.amount.toLocaleString()}</p>
          </div>
          <button
            onClick={handleApply}
            className="w-full h-11 bg-text-1 text-white rounded-lg text-sm font-medium"
          >
            Apply for loan
          </button>
          <div className="text-[10px] text-text-2 space-y-1">
            <p>Term: {loan.term}</p>
            <p>Interest rate: {loan.interest}</p>
            <p>Repayment via daily sales deduction</p>
          </div>
        </div>
      </section>
    </div>
  )
}