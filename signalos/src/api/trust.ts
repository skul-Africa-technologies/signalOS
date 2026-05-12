// Mock data for trust score breakdown
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

/**
 * MOCK: Get trust score
 * Development-only mock - replace with real API call
 */
export async function getTrustScore(): Promise<number> {
  console.log('trust.getTrustScore (MOCK)')
  await new Promise(r => setTimeout(r, 400))
  return 74
}

/**
 * MOCK: Get score breakdown
 * Development-only mock - replace with real API call
 */
export async function getScoreBreakdown(): Promise<ScoreBreakdownItem[]> {
  console.log('trust.getScoreBreakdown (MOCK)')
  await new Promise(r => setTimeout(r, 400))
  return mockScoreBreakdown
}

/**
 * NOTE: Loan eligibility and application now use the real API:
 * - src/api/loan.service.ts
 * - src/hooks/use-loans.ts
 *
 * These mock functions are deprecated. Use the real loan service instead.
 */