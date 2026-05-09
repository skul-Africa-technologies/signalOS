"use client"

import { useState } from "react"

export default function BusinessPage() {
  const [item, setItem] = useState("")
  const [saleAmount, setSaleAmount] = useState("")
  const [customer, setCustomer] = useState("")
  const [sales, setSales] = useState([
    { id: "1", item: "Palm oil (5L)", amount: 8500, customer: "Madam Nkechi", time: "9:30 AM" },
    { id: "2", item: "Garri (1 bag)", amount: 3200, customer: "Mr. Tunde", time: "10:15 AM" },
    { id: "3", item: "Rice (25kg)", amount: 15000, customer: "Mrs. Bisi", time: "11:45 AM" },
  ])
  const inventory = [
    { id: "1", name: "Palm oil", stock: 12 },
    { id: "2", name: "Garri", stock: 3 },
    { id: "3", name: "Rice", stock: 8 },
    { id: "4", name: "Beans", stock: 1 },
  ]

  const addSale = () => {
    if (item && saleAmount) {
      const newSale = {
        id: Date.now().toString(),
        item,
        amount: Number(saleAmount),
        customer: customer || "Walk-in",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setSales([newSale, ...sales])
      setItem("")
      setSaleAmount("")
      setCustomer("")
    }
  }

  return (
    <div className="pt-6 pb-4 space-y-8">
      <h1 className="text-lg font-medium tracking-[-0.01em]">Business</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Sales logging</h2>
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium">Record a sale</h3>
          <input
            type="text"
            placeholder="Item name"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            className="w-full h-11 px-4 bg-white border border-border rounded-lg text-sm"
          />
          <input
            type="number"
            placeholder="Amount"
            value={saleAmount}
            onChange={(e) => setSaleAmount(e.target.value)}
            className="w-full h-11 px-4 bg-white border border-border rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Customer (optional)"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="w-full h-11 px-4 bg-white border border-border rounded-lg text-sm"
          />
          <button onClick={addSale} className="w-full h-11 bg-text-1 text-white rounded-lg text-sm font-medium">
            Add sale
          </button>
        </div>
<div className="space-y-1">
           <p className="text-xs text-text-2">Today&apos;s sales</p>
          <div className="space-y-2">
            {sales.map((s) => (
              <div key={s.id} className="flex justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm">{s.item}</p>
                  <p className="text-xs text-text-2">{s.customer}</p>
                </div>
                <span className="text-sm font-medium">₦{s.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Inventory</h2>
        <div className="space-y-2">
          {inventory.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-sm">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.stock}</span>
                {item.stock < 5 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-tag-bg">Low stock</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <button className="w-full h-11 border border-border rounded-lg text-sm font-medium">
          Add item
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Customers</h2>
        <div className="space-y-3">
          {[
            { name: "Madam Nkechi", last: "Today", spend: 45000 },
            { name: "Mr. Tunde", last: "Today", spend: 28000 },
            { name: "Mrs. Bisi", last: "Yesterday", spend: 89000 },
          ].map((c, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm">{c.name}</p>
                <p className="text-xs text-text-2">{c.last}</p>
              </div>
              <span className="text-sm">₦{c.spend.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}