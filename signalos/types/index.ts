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
 * Payment status enumeration
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
}

/**
 * Transaction lifecycle stages
 */
export enum TransactionLifecycle {
  INITIATED = 'initiated',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
  REFUNDED = 'refunded',
  SETTLED = 'settled',
}

/**
 * Payout status enumeration
 */
export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Withdrawal status enumeration
 */
export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  CHARGE_COMPLETED = 'charge_completed',
  CHARGE_FAILED = 'charge_failed',
  CHARGE_REFUNDED = 'charge_refunded',
  PAYOUT_COMPLETED = 'payout_completed',
  PAYOUT_FAILED = 'payout_failed',
  WITHDRAWAL_COMPLETED = 'withdrawal_completed',
  WITHDRAWAL_FAILED = 'withdrawal_failed',
  TRUST_SCORE_UPDATED = 'trust_score_updated',
}

/**
 * Bank code mapping for Nigerian banks
 */
export const BANK_CODES: Record<string, { code: string; name: string }> = {
  '044': { code: '044', name: 'Access Bank' },
  '011': { code: '011', name: 'First Bank' },
  '214': { code: '214', name: 'First City Monument Bank (FCMB)' },
  '058': { code: '058', name: 'Guaranty Trust Bank (GTB)' },
  '033': { code: '033', name: 'United Bank for Africa (UBA)' },
  '215': { code: '215', name: 'Unity Bank' },
  '221': { code: '221', name: 'Stanbic IBTC Bank' },
  '076': { code: '076', name: 'Polaris Bank' },
  '050': { code: '050', name: 'Ecobank Nigeria' },
  '030': { code: '030', name: 'Heritage Bank' },
  '035': { code: '035', name: 'Wema Bank' },
  '232': { code: '232', name: 'Sterling Bank' },
  '032': { code: '032', name: 'Union Bank' },
  '082': { code: '082', name: 'Keystone Bank' },
  '070': { code: '070', name: 'Fidelity Bank' },
  '214': { code: '214', name: 'Fidelity Bank (Alternative)' },
  '084': { code: '084', name: 'Enterprise Bank' },
  '301': { code: '301', name: 'Jaiz Bank' },
  '309': { code: '309', name: 'FSDH Merchant Bank' },
  '014': { code: '014', name: 'Providus Bank' },
  '101': { code: '101', name: 'Globus Bank' },
  '216': { code: '216', name: 'Greenwich Trust' },
  '057': { code: '057', name: 'Zenith Bank' },
  '070': { code: '070', name: 'Fidelity Bank' },
}

/**
 * Payment session - returned when initiating a Squad payment
 */
export interface PaymentSession {
  reference: string;
  checkoutUrl: string;
  squadResponse: Record<string, unknown>;
  amount: number;
  email: string;
  status: PaymentStatus;
  createdAt: string;
}

/**
 * Payment transaction record
 */
export interface PaymentTransaction {
  id: string;
  reference: string;
  merchantReference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionLifecycle: TransactionLifecycle;
  paymentMethod: string;
  email: string;
  squadTransactionRef: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/**
 * Withdrawal request payload
 */
export interface WithdrawalRequest {
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  narration?: string;
}

/**
 * Withdrawal record
 */
export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  narration: string;
  status: WithdrawalStatus;
  reference: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/**
 * Payout record
 */
export interface Payout {
  id: string;
  userId: string;
  amount: number;
  status: PayoutStatus;
  reference: string;
  type: 'auto' | 'manual';
  description: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/**
 * Webhook event structure
 */
export interface WebhookEvent {
  event: WebhookEventType;
  body: WebhookBody;
}

export interface WebhookBody {
  transaction_ref: string;
  merchant_ref: string;
  transaction_status: 'success' | 'failed' | 'pending';
  amount: number;
  [key: string]: unknown;
}

/**
 * Financial analytics summary
 */
export interface FinancialAnalytics {
  totalCredits: number;
  totalDebits: number;
  totalWithdrawals: number;
  totalPayouts: number;
  successfulPayments: number;
  failedPayments: number;
  netFlow: number;
  averageTransaction: number;
}

/**
 * Payment form validation errors
 */
export interface PaymentFormErrors {
  amount?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  general?: string;
}

/**
 * Withdrawal validation result
 */
export interface WithdrawalValidation {
  valid: boolean;
  errors: PaymentFormErrors;
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
