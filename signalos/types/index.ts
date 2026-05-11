// Centralized TypeScript types for the entire application

/**
 * Business type enumeration matching backend enum
 */
export enum BusinessType {
  TRADER = 'TRADER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  MANUFACTURER = 'MANUFACTURER',
  AGGREGATOR = 'AGGREGATOR',
  FARMER = 'FARMER',
  RETAILER = 'RETAILER',
  WHOLER = 'WHOLER',
}

/**
 * User profile data returned by GET /api/v1/users/me
 */
export interface User {
  id: string;
  name: string;
  phone: string;
  businessType: BusinessType;
  trustScore: number;
  createdAt: string; // ISO 8601 date string
}

/**
 * Authentication response from login/signup
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
}

/**
 * Generic API error response structure
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

/**
 * Standardized API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

/**
 * Wallet - represents the user's wallet/account
 */
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  createdAt: string;
  updatedAt: string;
}

/**
 * Wallet balance response from GET /api/v1/wallet/balance
 */
export interface WalletBalance {
  balance: number;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  lastUpdated: string;
}

/**
 * Transaction type for ledger entries
 */
export type TransactionType = 'credit' | 'debit' | 'transfer_in' | 'transfer_out' | 'payment' | 'refund';

/**
 * Transaction status
 */
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

/**
 * Ledger entry from GET /api/v1/wallet/ledger
 */
export interface LedgerEntry {
  id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  reference: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

/**
 * Transaction summary for dashboard
 */
export interface Transaction {
  id: string;
  name: string;
  amount: number;
  time: string;
  status: TransactionStatus;
  type: TransactionType;
}

/**
 * Risk level for trust scoring
 */
export type RiskLevel = 'Low' | 'Medium' | 'High'

/**
 * Trust score breakdown factors
 */
export interface TrustScoreBreakdown {
  transactionConsistency: number;
  paymentFrequency: number;
  savingsReliability: number;
  activityLevel: number;
}

/**
 * Trust score report from GET /api/v1/trust-score
 */
export interface TrustScoreReport {
  trustScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  breakdown: TrustScoreBreakdown;
}

/**
 * Recommendation priority
 */
export type RecommendationPriority = 'high' | 'medium' | 'low'

/**
 * Recommendation type
 */
export type RecommendationType = 'loan' | 'savings' | 'investment' | 'business' | 'coaching' | 'merchant' | 'nudge'

/**
 * Individual recommendation
 */
export interface Recommendation {
  type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
}

/**
 * Eligibility information
 */
export interface EligibilityInfo {
  eligible: boolean;
  eligibleAmount: number;
  riskLevel: RiskLevel;
  recommendation: string;
  trustScore: number;
  breakdown: TrustScoreBreakdown;
  reasons: string[];
}

/**
 * Recommendation summary response
 */
export interface RecommendationSummary {
  eligibility: EligibilityInfo;
  recommendations: Recommendation[];
}

/**
 * Trust score report from GET /api/v1/trust-score
 */
export interface TrustScoreReport {
  trustScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  breakdown: TrustScoreBreakdown;
}

/**
 * Transaction record from GET /api/v1/transactions
 */
export interface TransactionRecord {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  type: 'CREDIT' | 'DEBIT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'PAYMENT' | 'REFUND';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  createdAt: string;
}

/**
 * Auth state stored in Zustand
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string, businessType: BusinessType) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

/**
 * Onboarding state (separate from auth)
 */
export interface OnboardingState {
  step: number;
  completed: boolean;
  // ... other onboarding fields
}

/**
 * Base API client configuration options
 */
export interface ApiClientConfig {
  baseUrl: string;
  token?: string | null;
}
