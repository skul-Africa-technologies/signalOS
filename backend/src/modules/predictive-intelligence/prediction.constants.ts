export const PREDICTION_EVENTS = {
  GENERATED: 'prediction.generated',
  EXPIRED: 'prediction.expired',
  RECALCULATED: 'prediction.recalculated',
  TREASURY_RISK_INCREASED: 'treasury.risk.increased',
  TREASURY_RISK_DECREASED: 'treasury.risk.decreased',
  FRAUD_RISK_ESCALATED: 'fraud.risk.escalated',
  TRUST_TRAJECTORY_CHANGED: 'trust.trajectory.changed',
  UNDERWRITING_COMPLETED: 'underwriting.completed',
  AUTONOMOUS_THRESHOLD_ADJUSTED: 'autonomous.threshold.adjusted',
} as const;

export const PREDICTION_WINDOWS = {
  SHORT: 30,   // days
  MEDIUM: 90,  // days
  LONG: 180,   // days
} as const;

export const PREDICTION_TTL_HOURS = {
  DEFAULT_RISK: 24,
  REPAYMENT_SUCCESS: 24,
  TRUST_EVOLUTION: 48,
  FRAUD_PROBABILITY: 12,
  TREASURY_STABILITY: 24,
  LIQUIDITY_FORECAST: 24,
  COOPERATIVE_RISK: 48,
} as const;

export const AUTONOMOUS_THRESHOLDS = {
  TREASURY_STRESS_SCORE: 40,
  FRAUD_ESCALATION_PROBABILITY: 0.7,
  TRUST_CRITICAL_SCORE: 25,
  LIQUIDITY_CRITICAL_RATIO: 0.1,
  DEFAULT_RISK_HIGH: 0.6,
} as const;
