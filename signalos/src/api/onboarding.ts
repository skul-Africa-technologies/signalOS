// Mock data for onboarding

export async function submitProfile(_data: unknown): Promise<{ success: boolean }> {
  console.log('onboarding.submitProfile')
  await new Promise(r => setTimeout(r, 400))
  return { success: true }
}

export async function submitVerification(_data: unknown): Promise<{ success: boolean }> {
  console.log('onboarding.submitVerification')
  await new Promise(r => setTimeout(r, 400))
  return { success: true }
}