"use client"

import { useState } from "react"
import { sendMoney } from "@/src/api/wallet"

export default function PaymentsPage() {
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState("")
  const [success, setSuccess] = useState(false)
  const transactions = [
    { id: "1", name: "Chidi Okonkwo", amount: 5000, time: "2h ago", status: "Paid" },
    { id: "2", name: "Fatima Aliyu", amount: 3500, time: "4h ago", status: "Pending" },
    { id: "3", name: "Musa Ahmed", amount: 12000, time: "Yesterday", status: "Paid" },
  ]

  const handleSend = async () => {
    if (phone && amount) {
      await sendMoney(phone, Number(amount))
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setPhone("")
        setAmount("")
      }, 2000)
    }
  }

  return (
    <div className="pt-6 pb-4 space-y-6">
      <h1 className="text-lg font-medium tracking-[-0.01em]">Payments</h1>

      <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-medium">Send money</h2>
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full h-11 px-4 bg-white border border-border rounded-lg text-sm"
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full h-11 px-4 bg-white border border-border rounded-lg text-sm"
        />
        <button
          onClick={handleSend}
          disabled={success}
          className={`w-full h-11 rounded-lg text-sm font-medium ${
            success ? "bg-tag-bg text-text-2" : "bg-text-1 text-white"
          }`}
        >
          {success ? "Sent" : "Send"}
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg">
          <div className="w-16 h-16 bg-tag-bg rounded-lg flex items-center justify-center mb-2">
            <span className="text-xs text-text-2">QR</span>
          </div>
          <p className="text-xs text-text-2">Your QR code</p>
        </div>
        <p className="text-xs text-center text-text-2 mt-2">Show to customer</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Recent transactions</h2>
        <div className="space-y-1">
          {transactions.map((txn) => (
            <div key={txn.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tag-bg rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">{txn.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm">{txn.name}</p>
                  <p className="text-xs text-text-2">{txn.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">₦{txn.amount.toLocaleString()}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  txn.status === "Paid" ? "bg-tag-bg" : "bg-tag-bg"
                }`}>
                  {txn.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}