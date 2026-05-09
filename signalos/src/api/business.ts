// Mock data for business
interface Sale {
  id: string
  item: string
  amount: number
  customer: string
  time: string
}

interface InventoryItem {
  id: string
  name: string
  stock: number
}

interface Customer {
  id: string
  name: string
  lastPurchase: string
  totalSpend: number
}

const mockSales: Sale[] = [
  { id: '1', item: 'Palm oil (5L)', amount: 8500, customer: 'Madam Nkechi', time: '9:30 AM' },
  { id: '2', item: 'Garri (1 bag)', amount: 3200, customer: 'Mr. Tunde', time: '10:15 AM' },
  { id: '3', item: 'Rice (25kg)', amount: 15000, customer: 'Mrs. Bisi', time: '11:45 AM' },
]

const mockInventory: InventoryItem[] = [
  { id: '1', name: 'Palm oil', stock: 12 },
  { id: '2', name: 'Garri', stock: 3 },
  { id: '3', name: 'Rice', stock: 8 },
  { id: '4', name: 'Beans', stock: 1 },
]

const mockCustomers: Customer[] = [
  { id: '1', name: 'Madam Nkechi', lastPurchase: 'Today, 9:30 AM', totalSpend: 45000 },
  { id: '2', name: 'Mr. Tunde', lastPurchase: 'Today, 10:15 AM', totalSpend: 28000 },
  { id: '3', name: 'Mrs. Bisi', lastPurchase: 'Today, 11:45 AM', totalSpend: 89000 },
  { id: '4', name: 'Chidi Okafor', lastPurchase: 'Yesterday', totalSpend: 15600 },
]

export async function getSales(): Promise<Sale[]> {
  console.log('business.getSales')
  await new Promise(r => setTimeout(r, 400))
  return mockSales
}

export async function addSale(item: string, amount: number, customer?: string): Promise<{ success: boolean; sale: Sale }> {
  console.log('business.addSale')
  await new Promise(r => setTimeout(r, 400))
  return { success: true, sale: { id: Date.now().toString(), item, amount, customer: customer || '', time: new Date().toLocaleTimeString() } }
}

export async function getInventory(): Promise<InventoryItem[]> {
  console.log('business.getInventory')
  await new Promise(r => setTimeout(r, 400))
  return mockInventory
}

export async function addInventoryItem(name: string, stock: number): Promise<{ success: boolean; item: InventoryItem }> {
  console.log('business.addInventoryItem')
  await new Promise(r => setTimeout(r, 400))
  return { success: true, item: { id: Date.now().toString(), name, stock } }
}

export async function getCustomers(): Promise<Customer[]> {
  console.log('business.getCustomers')
  await new Promise(r => setTimeout(r, 400))
  return mockCustomers
}