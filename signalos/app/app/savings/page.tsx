"use client"

export default function SavingsPage() {
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
      <h1 className="text-lg font-medium tracking-[-0.01em]">Savings</h1>

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