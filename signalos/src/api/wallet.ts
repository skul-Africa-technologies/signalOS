/**
 * Wallet API - Re-exports from wallet.service.ts for backward compatibility
 * 
 * New code should use @/src/api/wallet.service directly
 */

export { getWallet, getWalletBalance, getWalletLedger } from './wallet.service'

/**
 * Send money - mock implementation for demo purposes
 */
export async function sendMoney(phone: string, amount: number): Promise<{ success: boolean; transactionId: string }> {
  console.log('wallet.sendMoney', { phone, amount })
  await new Promise(r => setTimeout(r, 400))
  return { success: true, transactionId: Date.now().toString() }
}

export type { Wallet, WalletBalance, LedgerEntry, Transaction } from '@/types'