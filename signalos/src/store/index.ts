import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  completed: boolean
  name: string
  phone: string
  location: string
  businessType: string
  bvnVerified: boolean
  ninVerified: boolean
  setOnboardingData: (data: Partial<OnboardingState>) => void
  completeOnboarding: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      name: '',
      phone: '',
      location: '',
      businessType: '',
      bvnVerified: false,
      ninVerified: false,
      setOnboardingData: (data) => set((state) => ({ ...state, ...data })),
      completeOnboarding: () => set({ completed: true }),
      reset: () => set({
        completed: false,
        name: '',
        phone: '',
        location: '',
        businessType: '',
        bvnVerified: false,
        ninVerified: false,
      }),
    }),
    {
      name: 'kora-onboarding',
    }
  )
)