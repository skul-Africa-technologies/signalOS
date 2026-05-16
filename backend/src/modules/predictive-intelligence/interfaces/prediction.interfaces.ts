export type PredictionType =
  | 'DEFAULT_RISK'
  | 'REPAYMENT_SUCCESS'
  | 'TRUST_EVOLUTION'
  | 'FRAUD_PROBABILITY'
  | 'TREASURY_STABILITY'
  | 'LIQUIDITY_FORECAST'
  | 'COOPERATIVE_RISK';

export type PredictionTrajectory = 'POSITIVE' | 'STABLE' | 'DECLINING' | 'CRITICAL';
export type PredictionConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PredictionResult {
  predictionType: PredictionType;
  predictedValue: number;
  confidence: number;
  confidenceLevel: PredictionConfidenceLevel;
  metadata: Record<string, unknown>;
  expiresAt: Date;
}

export interface RepaymentPrediction {
  repaymentProbability: number;
  defaultRisk: number;
  lateProbability: number;
  confidence: number;
  riskFactors: string[];
}

export interface TrustEvolutionForecast {
  currentTrust: number;
  predicted30DayTrust: number;
  predicted90DayTrust: number;
  trajectory: PredictionTrajectory;
  confidence: number;
  drivers: string[];
}

export interface TreasuryForecast {
  groupId: string;
  currentBalance: number;
  projected30DayBalance: number;
  projected90DayBalance: number;
  depletionRisk: number;
  lendingCapacityForecast: number;
  reserveAdequacy: 'ADEQUATE' | 'MARGINAL' | 'CRITICAL';
  trajectory: PredictionTrajectory;
  confidence: number;
}

export interface FraudProbabilityForecast {
  fraudProbability: number;
  accountCompromiseProbability: number;
  behavioralDriftScore: number;
  coordinatedAbuseRisk: number;
  confidence: number;
  anomalySignals: string[];
}

export interface UnderwritingRecommendation {
  userId: string;
  recommendedLoanAmount: number;
  recommendedDurationMonths: number;
  interestAdjustment: number;
  confidence: number;
  riskAdjustedRate: number;
  reasoning: string[];
  approved: boolean;
}

export interface LoanSimulationResult {
  scenario: string;
  projectedRepaymentRate: number;
  treasuryImpact: number;
  liquidityPressure: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  recommendation: string;
}

export interface FinancialRecommendation {
  category: 'REPAYMENT' | 'SAVINGS' | 'TREASURY' | 'RISK_MITIGATION' | 'GROWTH';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  actionableSteps: string[];
  estimatedImpact: string;
}

export interface PredictionProviderInput {
  userId?: string;
  groupId?: string;
  features: Record<string, number | string | boolean>;
  predictionType: PredictionType;
}

export interface PredictionProvider {
  predict(input: PredictionProviderInput): Promise<PredictionResult>;
  isAvailable(): boolean;
  providerName(): string;
}
