"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Send, BarChart3, PiggyBank, User } from "lucide-react"

const tabs = [
  { href: "/app/home", label: "Home", icon: Home },
  { href: "/app/payments", label: "Payments", icon: Send },
  { href: "/app/business", label: "Business", icon: BarChart3 },
  { href: "/app/savings", label: "Savings", icon: PiggyBank },
  { href: "/app/profile", label: "Profile", icon: User },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <main className="flex-1 pb-16 px-4">{children}</main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border h-15 flex justify-around items-center px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${
                isActive ? "text-text-1" : "text-text-2"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}