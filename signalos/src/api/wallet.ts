// Mock data for wallet
export interface Transaction {
  id: string
  name: string
  amount: number
  time: string
  status: string
}

const mockTransactions: Transaction[] = [
  { id: '1', name: 'Chidi Okonkwo', amount: 5000, time: '2h ago', status: 'Paid' },
  { id: '2', name: 'Fatima Aliyu', amount: 3500, time: '4h ago', status: 'Pending' },
  { id: '3', name: 'Musa Ahmed', amount: 12000, time: 'Yesterday', status: 'Paid' },
  { id: '4', name: 'Grace Eze', amount: 2500, time: 'Yesterday', status: 'Paid' },
  { id: '5', name: 'Ibrahim Bello', amount: 8000, time: '2 days ago', status: 'Paid' },
]

export async function getBalance(): Promise<{ balance: number; earningsToday: number }> {
  console.log('wallet.getBalance')
  await new Promise(r => setTimeout(r, 400))
  return { balance: 0, earningsToday: 12500 }
}

export async function sendMoney(_phone: string, _amount: number): Promise<{ success: boolean; transactionId: string }> {
  console.log('wallet.sendMoney')
  await new Promise(r => setTimeout(r, 400))
  return { success: true, transactionId: Date.now().toString() }
}

export async function getTransactions(): Promise<Transaction[]> {
  console.log('wallet.getTransactions')
  await new Promise(r => setTimeout(r, 400))
  return mockTransactions
}