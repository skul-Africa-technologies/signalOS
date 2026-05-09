"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/src/store"

export default function OnboardingPage() {
  const { name, phone, location, businessType } = useOnboardingStore()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: name || "",
    phone: phone || "",
    location: location || "",
    businessType: businessType || "Trader",
    bvnVerified: false,
    ninVerified: false,
  })

  const updateStore = useOnboardingStore((s) => s.setOnboardingData)
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding)
  const router = useRouter()

  const handleNext = async () => {
    if (step === 1) {
      updateStore(formData)
    }
    if (step === 4) {
      updateStore(formData)
      await new Promise(r => setTimeout(r, 400))
      completeOnboarding()
      router.push("/app/home")
    }
    if (step < 4) setStep(step + 1)
  }

  const dots = Array(4).fill(0)

  return (
    <div className="flex flex-col min-h-screen bg-bg px-5">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex justify-center gap-2 mb-12">
          {dots.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${i + 1 === step ? "bg-text-1" : "bg-tag-bg"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="text-center">
            <h1 className="text-2xl font-medium tracking-[-0.01em] mb-3">Kora</h1>
            <p className="text-text-2 mb-8">Your shop in your pocket</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium tracking-[-0.01em] mb-4">Identity</h2>
            <input
              type="text"
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-11 px-4 bg-white border border-border rounded-lg text-sm font-sans"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full h-11 px-4 bg-white border border-border rounded-lg text-sm font-sans"
            />
            <input
              type="text"
              placeholder="Location (e.g., Wuse Market)"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full h-11 px-4 bg-white border border-border rounded-lg text-sm font-sans"
            />
            <select
              value={formData.businessType}
              onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
              className="w-full h-11 px-4 bg-white border border-border rounded-lg text-sm font-sans"
            >
              <option>Trader</option>
              <option>Farmer</option>
              <option>Artisan</option>
              <option>Food vendor</option>
              <option>Other</option>
            </select>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium tracking-[-0.01em] mb-4">Verification</h2>
            <label className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm">BVN verification (optional)</span>
              <input
                type="checkbox"
                checked={formData.bvnVerified}
                onChange={(e) => setFormData({ ...formData, bvnVerified: e.target.checked })}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm">NIN verification (optional)</span>
              <input
                type="checkbox"
                checked={formData.ninVerified}
                onChange={(e) => setFormData({ ...formData, ninVerified: e.target.checked })}
                className="w-5 h-5"
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <h2 className="text-2xl font-medium tracking-[-0.01em] mb-3">Your shop is ready</h2>
            <p className="text-text-2 mb-8">
              Start tracking sales, saving with groups, and building trust.
            </p>
          </div>
        )}

        <button
          onClick={handleNext}
          className="w-full h-11 bg-text-1 text-white font-medium rounded-lg text-sm tracking-[-0.01em] mt-8"
        >
          {step < 4 ? "Continue" : "Go to my dashboard"}
        </button>
      </div>
    </div>
  )
}