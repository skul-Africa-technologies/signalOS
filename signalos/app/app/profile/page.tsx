"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/src/context/AuthContext"
import { LogOut, UserRound } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, isInitializing, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Ignore logout errors
    } finally {
      router.push("/login")
    }
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-text-2 text-sm">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <p className="text-text-2">Redirecting to login...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <p className="text-text-2">User data not available</p>
      </div>
    )
  }

  return (
    <div className="pt-6 pb-4 space-y-8">
      <h1 className="text-lg font-medium tracking-[-0.01em]">Profile</h1>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-tag-bg rounded-full flex items-center justify-center">
          <UserRound className="w-8 h-8 text-text-2" />
        </div>
        <div>
          <h2 className="text-lg font-medium">{user.name}</h2>
          <p className="text-sm text-text-2">{user.phone}</p>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-text-2">
          Business Type
        </span>
        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
          {formatBusinessType(user.businessType)}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Identity</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-2">Phone</span>
            <span className="text-sm">{user.phone}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-2">Member since</span>
            <span className="text-sm">{formatDate(user.createdAt)}</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Trust Score</h2>
        <div className="p-4 bg-surface rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-2">Your score</span>
            <span className="text-lg font-bold text-blue-600">{user.trustScore}</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${user.trustScore}%` }}
            />
          </div>
        </div>
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-medium tracking-[-0.01em] mb-3">Settings</h2>
        <div className="space-y-1">
          <div className="flex justify-between items-center py-3 border-b border-border">
            <span className="text-sm">Notifications</span>
            <input type="checkbox" className="w-5 h-5" defaultChecked />
          </div>
          <div className="flex justify-between py-3 border-b border-border">
            <span className="text-sm">Language</span>
            <span className="text-sm text-text-2">English</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 py-3 text-danger w-full text-left hover:bg-surface transition-colors rounded-lg px-2"
          >
            <LogOut size={18} />
            <span className="text-sm">Log out</span>
          </button>
        </div>
      </section>
    </div>
  )
}

function formatBusinessType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}
