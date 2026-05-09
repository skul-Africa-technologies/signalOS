"use client"

import { useState } from "react"
import { useAuth } from "@/src/context/AuthContext"

export default function SignupPage() {
  const { signup, loading, error } = useAuth()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [businessType, setBusinessType] = useState("TRADER")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup(name, phone, password, businessType)
      window.location.href = "/app/home"
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm space-y-6">
        <h2 className="text-2xl font-bold text-center text-text-1">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-2 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-2 border border-input rounded-lg bg-bg text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="name"
              required
            />
          </div>
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
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="businessType" className="block text-sm font-medium text-text-2 mb-1">
              Business Type
            </label>
            <select
              id="businessType"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full px-4 py-2 border border-input rounded-lg bg-bg text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="organization-type"
              required
            >
              <option value="TRADER">Trader</option>
              <option value="FARMER">Farmer</option>
              <option value="ARTISAN">Artisan</option>
              <option value="SERVICE_PROVIDER">Service Provider</option>
            </select>
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
                <span>Creating account...</span>
              </>
            ) : (
              <span>Sign up</span>
            )}
          </button>
        </form>
        <p className="text-sm text-text-2 text-center">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Login
          </a>
        </p>
      </div>
    </div>
  )
}