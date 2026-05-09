// Mock data for auth
const mockUser = {
  id: '1',
  name: 'Ada Johnson',
  phone: '+234 803 123 4567',
  location: 'Wuse Market',
  businessType: 'Trader',
  bvnVerified: true,
  ninVerified: false,
}

export async function login(_phone: string): Promise<{ success: boolean; user: typeof mockUser }> {
  console.log('auth.login')
  await new Promise(r => setTimeout(r, 400))
  return { success: true, user: mockUser }
}

export async function logout(): Promise<{ success: boolean }> {
  console.log('auth.logout')
  await new Promise(r => setTimeout(r, 400))
  return { success: true }
}

export async function getProfile(): Promise<typeof mockUser> {
  console.log('auth.getProfile')
  await new Promise(r => setTimeout(r, 400))
  return mockUser
}