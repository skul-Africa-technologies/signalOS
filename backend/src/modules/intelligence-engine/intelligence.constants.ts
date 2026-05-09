// Event names
export const INTELLIGENCE_EVENTS = {
  ANALYSE_USER: 'intelligence.analyse.user',
  PROFILE_UPDATED: 'intelligence.profile.updated',
  SCORES_COMPUTED: 'intelligence.scores.computed',
  SIGNALS_EXTRACTED: 'intelligence.signals.extracted',
} as const;

// Score thresholds
export const SCORE_THRESHOLDS = {
  TRUST: { LOW: 70, MEDIUM: 50, HIGH: 30 },
  RELIABILITY: { LOW: 70, MEDIUM: 50, HIGH: 30 },
  LIQUIDITY: { LOW: 70, MEDIUM: 50, HIGH: 30 },
  EMPLOYABILITY: { LOW: 70, MEDIUM: 50, HIGH: 30 },
} as const;

// Eligibility thresholds
export const ELIGIBILITY_THRESHOLDS = {
  LOAN_MIN_TRUST_SCORE: 50,
  SAVINGS_MIN_TRUST_SCORE: 30,
  OPPORTUNITY_MIN_EMPLOYABILITY_SCORE: 40,
} as const;

// Scoring weights (must sum to 100)
export const SIGNAL_WEIGHTS = {
  TRANSACTION_FREQUENCY: 25,
  REPAYMENT_CONSISTENCY: 30,
  INCOME_STABILITY: 20,
  SAVINGS_BEHAVIOUR: 15,
  REPEAT_CUSTOMER_RATE: 10,
} as const;

// Minimum data requirements
export const MIN_DATA_REQUIREMENTS = {
  MIN_TRANSACTIONS: 3,
  MIN_DAYS_ACTIVE: 7,
} as const;
