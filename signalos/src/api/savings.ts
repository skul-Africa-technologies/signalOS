// Mock data for savings
interface SavingsGroup {
  id: string
  name: string
  members: number
  contribution: number
}

interface ActiveGroup {
  id: string
  name: string
  members: { id: string; name: string; initials: string }[]
  nextContribution: string
  status: string
}

interface Contribution {
  id: string
  date: string
  amount: number
  status: string
}

const mockGroups: SavingsGroup[] = [
  { id: '1', name: 'Market Women Cooperative', members: 12, contribution: 5000 },
  { id: '2', name: 'Wuse Traders Circle', members: 8, contribution: 10000 },
  { id: '3', name: 'Everyday Savers', members: 15, contribution: 2000 },
]

const mockActiveGroup: ActiveGroup = {
  id: '1',
  name: 'Market Women Cooperative',
  members: [
    { id: '1', name: 'Ada', initials: 'AJ' },
    { id: '2', name: 'Nkechi', initials: 'MN' },
    { id: '3', name: 'Bisi', initials: 'MB' },
    { id: '4', name: 'Fatima', initials: 'FA' },
  ],
  nextContribution: 'Tomorrow',
  status: 'Active',
}

const mockContributions: Contribution[] = [
  { id: '1', date: 'May 5', amount: 5000, status: 'paid' },
  { id: '2', date: 'May 3', amount: 5000, status: 'paid' },
  { id: '3', date: 'May 1', amount: 5000, status: 'paid' },
  { id: '4', date: 'Apr 29', amount: 5000, status: 'pending' },
]

export async function getGroups(): Promise<SavingsGroup[]> {
  console.log('savings.getGroups')
  await new Promise(r => setTimeout(r, 400))
  return mockGroups
}

export async function joinGroup(_groupId: string): Promise<{ success: boolean }> {
  console.log('savings.joinGroup')
  await new Promise(r => setTimeout(r, 400))
  return { success: true }
}

export async function getActiveGroup(): Promise<ActiveGroup> {
  console.log('savings.getActiveGroup')
  await new Promise(r => setTimeout(r, 400))
  return mockActiveGroup
}

export async function getContributions(): Promise<Contribution[]> {
  console.log('savings.getContributions')
  await new Promise(r => setTimeout(r, 400))
  return mockContributions
}