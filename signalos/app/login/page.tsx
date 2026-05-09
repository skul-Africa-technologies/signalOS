"use client"

import { useState } from "react"
import { useAuth } from "@/src/context/AuthContext"

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(phone, password)
      // Use window.location for more reliable post-login navigation
      window.location.href = "/app/home"
    } catch (err) {
      // Error is already set by the auth store via useAuth
      console.error(err)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm space-y-6">
        <h2 className="text-2xl font-bold text-center text-text-1">Welcome Back</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text-2 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 801 234 5678"
              className="w-full px-4 py-2 border border-input rounded-lg bg-bg text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="tel"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-2 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-input rounded-lg bg-bg text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-white font-medium rounded-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white rounded-full"></span>
                <span>Logging in...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>
        <p className="text-sm text-text-2 text-center">
          Don&apos;t have an account?{" "}
          <a
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}