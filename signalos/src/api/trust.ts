// Mock data for trust
interface ScoreBreakdownItem {
  label: string
  score: number
  description: string
}

const mockScoreBreakdown: ScoreBreakdownItem[] = [
  { label: 'Payment consistency', score: 85, description: 'Always pays on time' },
  { label: 'Business growth', score: 72, description: 'Steady sales increase' },
  { label: 'Savings behavior', score: 68, description: 'Regular contributions' },
  { label: 'Risk level', score: 25, description: 'Low risk' },
]

export async function getTrustScore(): Promise<number> {
  console.log('trust.getTrustScore')
  await new Promise(r => setTimeout(r, 400))
  return 74
}

export async function getScoreBreakdown(): Promise<ScoreBreakdownItem[]> {
  console.log('trust.getScoreBreakdown')
  await new Promise(r => setTimeout(r, 400))
  return mockScoreBreakdown
}

export async function getLoanEligibility(): Promise<{ eligible: boolean; amount: number; term: string; interest: string }> {
  console.log('trust.getLoanEligibility')
  await new Promise(r => setTimeout(r, 400))
  return {
    eligible: true,
    amount: 50000,
    term: '90 days',
    interest: '5%',
  }
}

export async function applyForLoan(): Promise<{ success: boolean; loanId: string }> {
  console.log('trust.applyForLoan')
  await new Promise(r => setTimeout(r, 400))
  return { success: true, loanId: 'LN' + Date.now() }
}