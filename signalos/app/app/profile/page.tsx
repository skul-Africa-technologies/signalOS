"use client"

import { useOnboardingStore } from "@/src/store"
import { LogOut } from "lucide-react"

export default function ProfilePage() {
  const { name, location, businessType, phone, bvnVerified, ninVerified } = useOnboardingStore()

  const initials = name ? name.split(" ").map(n => n[0]).join("") : "A"

  return (
    <div className="pt-6 pb-4 space-y-8">
      <h1 className="text-lg font-medium tracking-[-0.01em]">Profile</h1>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-tag-bg rounded-full flex items-center justify-center">
          <span className="text-xl font-medium">{initials}</span>
        </div>
        <div>
          <h2 className="text-lg font-medium">{name || "Ada Johnson"}</h2>
          <p className="text-sm text-text-2">{location || "Wuse Market"}</p>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-text-2">Trader</span>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Identity</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-2">Phone</span>
            <span className="text-sm">{phone || "+234 803 123 4567"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-2">BVN status</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              bvnVerified ? "bg-tag-bg" : "bg-tag-bg"
            }`}>
              {bvnVerified ? "Verified" : "Not verified"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-2">NIN status</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              ninVerified ? "bg-tag-bg" : "bg-tag-bg"
            }`}>
              {ninVerified ? "Verified" : "Not verified"}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Business info</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-2">Name</span>
            <span className="text-sm">Ada&apos;s Store</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-2">Category</span>
            <span className="text-sm">{businessType || "Trader"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-2">Market</span>
            <span className="text-sm">{location || "Wuse Market"}</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Settings</h2>
        <div className="space-y-1">
          <div className="flex justify-between items-center py-3 border-b border-border">
            <span className="text-sm">Notifications</span>
            <input type="checkbox" className="w-5 h-5" defaultChecked />
          </div>
          <div className="flex justify-between py-3 border-b border-border">
            <span className="text-sm">Language</span>
            <span className="text-sm text-text-2">English</span>
          </div>
          <div className="flex justify-between py-3 border-b border-border">
            <span className="text-sm">Help</span>
            <span className="text-sm text-text-2">FAQ</span>
          </div>
          <button className="flex items-center gap-2 py-3 text-danger">
            <LogOut size={18} />
            <span className="text-sm">Log out</span>
          </button>
        </div>
      </section>
    </div>
  )
}