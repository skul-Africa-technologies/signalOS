export interface EconomicSignals {
  // Payment signals
  transactionFrequency: number;   // 0–100: how often payments occur
  repaymentConsistency: number;   // 0–100: success rate of payments
  repeatCustomerRate: number;     // 0–100: proportion of repeat-channel activity
  // Transaction signals
  incomeStability: number;        // 0–100: regularity of inbound credits
  cashflowVolatility: number;     // 0–100: inverse of amount variance (higher = more stable)
  activityLevel: number;          // 0–100: recency of last transaction
  // Savings signals
  savingsBehaviour: number;       // 0–100: savings contribution frequency
  contributionReliability: number; // 0–100: consistency of contribution amounts
  // Participation signals
  groupParticipation: number;     // 0–100: group membership and engagement
}

export interface IntelligenceScores {
  trustScore: number;
  reliabilityScore: number;
  liquidityScore: number;
  employabilityScore: number;
  growthScore: number;
  consistencyScore: number;
  participationScore: number;
}

/** Mirrors the persisted EconomicProfile row — all fields that live in the DB */
export interface EconomicProfileRecord {
  userId: string;
  trustScore: number;
  reliabilityScore: number;
  liquidityScore: number;
  employabilityScore: number;
  consistencyScore: number;
  growthScore: number;
  participationScore: number;
  activityLevel: number;
  riskLevel: RiskLevel;
  updatedAt: Date;
}

export interface BehaviouralProfile {
  userId: string;
  signals: EconomicSignals;
  scores: IntelligenceScores;
  riskLevel: RiskLevel;
  eligibilityFlags: EligibilityFlags;
  computedAt: Date;
}

export interface EligibilityFlags {
  loanEligible: boolean;
  savingsEligible: boolean;
  opportunityEligible: boolean;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export interface IntelligenceResult {
  userId: string;
  profile: BehaviouralProfile;
  recommendations: string[];
  processedAt: Date;
}

export interface TrustReport {
  trustScore: number;
  riskLevel: RiskLevel;
  confidence: 'High' | 'Medium' | 'Low';
  reasons: string[];
  factorBreakdown: Record<string, number>;
}

export interface RiskReport {
  riskLevel: RiskLevel;
  riskScore: number;        // 0–100: higher = more risk
  flags: string[];          // specific risk signals detected
  volatilityDetected: boolean;
  inactivityDetected: boolean;
}

export interface LoanEligibilityResult {
  eligible: boolean;
  eligibleAmount: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  riskLevel: RiskLevel;
  recommendation: string;
  reasons: string[];
}

export interface RepaymentConfidence {
  score: number;            // 0–100
  level: 'High' | 'Medium' | 'Low';
  factors: string[];
}

export type RecommendationType =
  | 'savings_improvement'
  | 'credit_readiness'
  | 'liquidity_optimization'
  | 'contribution_consistency'
  | 'growth';

export interface IntelligenceRecommendation {
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}
