/**
 * SQLite-compatible string constants replacing Prisma enums.
 * The schema uses plain String fields; these provide type safety without Prisma enum generation.
 */

export const TransactionStatus = { PENDING: 'PENDING', SUCCESS: 'SUCCESS', FAILED: 'FAILED' } as const;
export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

export const TransactionType = { CREDIT: 'CREDIT', DEBIT: 'DEBIT', TRANSFER: 'TRANSFER', SAVINGS: 'SAVINGS' } as const;
export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

export const BusinessType = { TRADER: 'TRADER', ARTISAN: 'ARTISAN', FREELANCER: 'FREELANCER', FARMER: 'FARMER', OTHER: 'OTHER' } as const;
export type BusinessType = typeof BusinessType[keyof typeof BusinessType];

export const AdminRole = {
  SUPER_ADMIN: 'SUPER_ADMIN', SUPPORT_ADMIN: 'SUPPORT_ADMIN', COMPLIANCE_ADMIN: 'COMPLIANCE_ADMIN',
  READ_ONLY: 'READ_ONLY', OPERATIONS_ADMIN: 'OPERATIONS_ADMIN', TREASURY_ADMIN: 'TREASURY_ADMIN',
  FRAUD_ANALYST: 'FRAUD_ANALYST', AUDITOR: 'AUDITOR',
} as const;
export type AdminRole = typeof AdminRole[keyof typeof AdminRole];

export const DisbursementStatus = {
  PENDING: 'PENDING', APPROVED: 'APPROVED', DISBURSED: 'DISBURSED',
  REPAID: 'REPAID', DEFAULTED: 'DEFAULTED', CANCELLED: 'CANCELLED',
} as const;
export type DisbursementStatus = typeof DisbursementStatus[keyof typeof DisbursementStatus];

export const RepaymentScheduleStatus = { PENDING: 'PENDING', PAID: 'PAID', OVERDUE: 'OVERDUE', PARTIAL: 'PARTIAL', MISSED: 'MISSED' } as const;
export type RepaymentScheduleStatus = typeof RepaymentScheduleStatus[keyof typeof RepaymentScheduleStatus];

export const MismatchStatus = { OPEN: 'OPEN', RESOLVED: 'RESOLVED', IGNORED: 'IGNORED', ESCALATED: 'ESCALATED' } as const;
export type MismatchStatus = typeof MismatchStatus[keyof typeof MismatchStatus];

export const MismatchType = {
  AMOUNT: 'AMOUNT', STATUS: 'STATUS', MISSING: 'MISSING', DUPLICATE: 'DUPLICATE',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION', STATUS_MISMATCH: 'STATUS_MISMATCH', LEDGER_INCONSISTENCY: 'LEDGER_INCONSISTENCY',
} as const;
export type MismatchType = typeof MismatchType[keyof typeof MismatchType];

export const ReconciliationJobStatus = { RUNNING: 'RUNNING', COMPLETED: 'COMPLETED', FAILED: 'FAILED' } as const;
export type ReconciliationJobStatus = typeof ReconciliationJobStatus[keyof typeof ReconciliationJobStatus];

export const LedgerCategory = {
  LOAN: 'LOAN', SAVINGS: 'SAVINGS', REPAYMENT: 'REPAYMENT', TRANSFER: 'TRANSFER',
  FEE: 'FEE', PAYOUT: 'PAYOUT', WITHDRAWAL: 'WITHDRAWAL', CONTRIBUTION: 'CONTRIBUTION',
  LOAN_DISBURSEMENT: 'LOAN_DISBURSEMENT', SAVINGS_CONTRIBUTION: 'SAVINGS_CONTRIBUTION',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED', INTERNAL_TRANSFER: 'INTERNAL_TRANSFER', REFUND: 'REFUND',
} as const;
export type LedgerCategory = typeof LedgerCategory[keyof typeof LedgerCategory];

export const LedgerDirection = { CREDIT: 'CREDIT', DEBIT: 'DEBIT' } as const;
export type LedgerDirection = typeof LedgerDirection[keyof typeof LedgerDirection];

export const LedgerEntryType = { TRANSACTION: 'TRANSACTION', ADJUSTMENT: 'ADJUSTMENT', FEE: 'FEE', REVERSAL: 'REVERSAL', CREDIT: 'CREDIT', DEBIT: 'DEBIT' } as const;
export type LedgerEntryType = typeof LedgerEntryType[keyof typeof LedgerEntryType];

export const LedgerStatus = { PENDING: 'PENDING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', REVERSED: 'REVERSED' } as const;
export type LedgerStatus = typeof LedgerStatus[keyof typeof LedgerStatus];

export const GroupLedgerCategory = {
  CONTRIBUTION: 'CONTRIBUTION', LOAN: 'LOAN', REPAYMENT: 'REPAYMENT', WITHDRAWAL: 'WITHDRAWAL', FEE: 'FEE',
  MEMBER_CONTRIBUTION: 'MEMBER_CONTRIBUTION', GROUP_LOAN_DISBURSEMENT: 'GROUP_LOAN_DISBURSEMENT', GROUP_LOAN_REPAYMENT: 'GROUP_LOAN_REPAYMENT',
} as const;
export type GroupLedgerCategory = typeof GroupLedgerCategory[keyof typeof GroupLedgerCategory];

export const GroupLoanStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', DISBURSED: 'DISBURSED', REPAID: 'REPAID', DEFAULTED: 'DEFAULTED', REJECTED: 'REJECTED' } as const;
export type GroupLoanStatus = typeof GroupLoanStatus[keyof typeof GroupLoanStatus];

export const NotificationChannel = { EMAIL: 'EMAIL', SMS: 'SMS', IN_APP: 'IN_APP', PUSH: 'PUSH' } as const;
export type NotificationChannel = typeof NotificationChannel[keyof typeof NotificationChannel];

export const NotificationType = {
  LOAN: 'LOAN', REPAYMENT: 'REPAYMENT', SAVINGS: 'SAVINGS', TRUST: 'TRUST', FRAUD: 'FRAUD', SYSTEM: 'SYSTEM', KYC: 'KYC',
  LOAN_APPROVED: 'LOAN_APPROVED', REPAYMENT_DUE: 'REPAYMENT_DUE', REPAYMENT_OVERDUE: 'REPAYMENT_OVERDUE',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS', SAVINGS_REMINDER: 'SAVINGS_REMINDER', TRUST_SCORE_CHANGED: 'TRUST_SCORE_CHANGED',
  FRAUD_ALERT: 'FRAUD_ALERT', WITHDRAWAL_SUCCESS: 'WITHDRAWAL_SUCCESS',
} as const;
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const NotificationStatus = { PENDING: 'PENDING', SENT: 'SENT', FAILED: 'FAILED', READ: 'READ' } as const;
export type NotificationStatus = typeof NotificationStatus[keyof typeof NotificationStatus];

export const OrgType = { BANK: 'BANK', FINTECH: 'FINTECH', COOPERATIVE: 'COOPERATIVE', GOVERNMENT: 'GOVERNMENT', NGO: 'NGO' } as const;
export type OrgType = typeof OrgType[keyof typeof OrgType];

export const RateLimitTier = { FREE: 'FREE', STARTER: 'STARTER', BASIC: 'BASIC', PROFESSIONAL: 'PROFESSIONAL', ENTERPRISE: 'ENTERPRISE', BANK: 'BANK' } as const;
export type RateLimitTier = typeof RateLimitTier[keyof typeof RateLimitTier];

export const WebhookDeliveryStatus = { PENDING: 'PENDING', DELIVERED: 'DELIVERED', FAILED: 'FAILED', RETRYING: 'RETRYING', SUCCESS: 'SUCCESS', EXHAUSTED: 'EXHAUSTED' } as const;
export type WebhookDeliveryStatus = typeof WebhookDeliveryStatus[keyof typeof WebhookDeliveryStatus];

export const PayoutStatus = { PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', SUCCESS: 'SUCCESS' } as const;
export type PayoutStatus = typeof PayoutStatus[keyof typeof PayoutStatus];

export const WithdrawalStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', REJECTED: 'REJECTED', FAILED: 'FAILED' } as const;
export type WithdrawalStatus = typeof WithdrawalStatus[keyof typeof WithdrawalStatus];

export const AuditActorType = { USER: 'USER', ADMIN: 'ADMIN', SYSTEM: 'SYSTEM', EXTERNAL: 'EXTERNAL' } as const;
export type AuditActorType = typeof AuditActorType[keyof typeof AuditActorType];
