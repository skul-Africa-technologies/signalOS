/**
 * Trust factor definitions.
 * Each factor has a weight (weights must sum to 100) and threshold labels
 * used to generate human-readable reasons.
 */
export interface TrustFactor {
  key: string;
  weight: number;
  labels: { high: string; medium: string; low: string };
}

export const TRUST_FACTORS: TrustFactor[] = [
  {
    key: 'repaymentConsistency',
    weight: 30,
    labels: {
      high: 'Strong payment consistency',
      medium: 'Moderate payment reliability',
      low: 'Inconsistent payment behaviour',
    },
  },
  {
    key: 'transactionFrequency',
    weight: 20,
    labels: {
      high: 'High transaction activity',
      medium: 'Regular transaction activity',
      low: 'Low transaction frequency',
    },
  },
  {
    key: 'incomeStability',
    weight: 20,
    labels: {
      high: 'Stable income pattern',
      medium: 'Moderate income regularity',
      low: 'Irregular income pattern',
    },
  },
  {
    key: 'savingsBehaviour',
    weight: 15,
    labels: {
      high: 'Strong savings consistency',
      medium: 'Some savings activity',
      low: 'Minimal savings behaviour',
    },
  },
  {
    key: 'groupParticipation',
    weight: 10,
    labels: {
      high: 'Reliable cooperative participation',
      medium: 'Some group engagement',
      low: 'Limited group participation',
    },
  },
  {
    key: 'activityLevel',
    weight: 5,
    labels: {
      high: 'Recently active on platform',
      medium: 'Moderately active',
      low: 'Low recent activity',
    },
  },
];

// Thresholds for labelling a factor's contribution
export const FACTOR_LABEL_THRESHOLDS = { HIGH: 65, MEDIUM: 35 } as const;

// Minimum signals needed before a trust score is meaningful
export const MIN_TRUST_DATA_POINTS = 3;
