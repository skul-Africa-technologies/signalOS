import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('signalOS — Intelligent Financial Operating Infrastructure')
    .setDescription(
      `## Production-Grade Financial Intelligence + Programmable Wallet Infrastructure

An event-driven platform that converts behavioral financial activity into programmable financial trust, enabling wallets, immutable ledger accounting, loan disbursement, and outbound money movement for informal workers across Africa.

---

### Full Financial Operating Pipeline

\`\`\`
User Signup
  → Wallet Auto-Created
  → Economic Identity Established

User Activity (Payment / Savings / Loan)
  → Transaction Persisted
  → Wallet Credited / Debited (Atomic)
  → Ledger Entry Appended (Immutable)
  → Signal Extraction
  → Trust Score Recalculation
  → Economic Profile Updated
  → Loan Eligibility Recalculated
  → Recommendations Refreshed

Loan Disbursement
  → Eligibility Verified
  → Wallet Credited
  → Ledger Entry: LOAN_DISBURSEMENT
  → Intelligence Re-Analysis

Withdrawal
  → Balance Verified
  → Wallet Debited (Atomic)
  → Ledger Entry: WITHDRAWAL
  → Squad Transfer Initiated
  → Webhook Confirms Success/Failure
  → Refund on Failure
\`\`\`

---

### Event-Driven Architecture

| Event | Triggers |
|-------|----------|
| \`payment.success\` | Wallet credit · Signal extraction · Trust recalculation |
| \`savings.contribution\` | Wallet debit · Savings reliability update |
| \`loan.approved\` | Eligibility persisted · Intelligence update |
| \`loan.disbursed\` | Wallet credit · Ledger entry · Intelligence re-analysis |
| \`withdrawal.requested\` | Wallet debit · Squad transfer · Intelligence update |
| \`wallet.credited\` | Intelligence re-analysis |
| \`payout.success\` | Withdrawal confirmed |
| \`payout.failed\` | Wallet refunded · Ledger reversed |

---

### Ledger Accounting Principles

- **Append-only**: Ledger entries are never modified or deleted
- **Atomic writes**: Every wallet update creates a corresponding ledger entry in the same transaction
- **Source of truth**: Balances can always be verified against ledger history
- **Audit-ready**: Full financial history with before/after balances on every entry

---

### Authentication
All protected endpoints require a **Bearer JWT token**.
Obtain a token via \`POST /auth/login\` and click **Authorize** above.
`,
    )
    .setVersion('2.0.0')
    .setContact('signalOS', 'https://github.com/signalOS', 'api@signalos.io')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter JWT token from /auth/login' },
      'JWT',
    )
    .addTag('Authentication', 'User registration, login, and JWT issuance')
    .addTag('Users', 'Authenticated user profile retrieval')
    .addTag('Wallet', 'Programmable wallet: balances, credits, debits, and ledger history')
    .addTag('Cooperative Treasury', 'Group treasury wallets, pooled savings, cooperative lending, and treasury analytics')
    .addTag('Payouts & Withdrawals', 'Outbound money movement: bank withdrawals and payout tracking')
    .addTag('Loan Eligibility', 'Behavioral credit scoring, loan eligibility, and disbursement')
    .addTag('Savings Groups', 'Cooperative savings group management')
    .addTag('Contributions', 'Savings contribution tracking and analytics')
    .addTag('Economic Identity', 'Behavioral signal extraction and economic profile management')
    .addTag('Payments', 'Squad payment initiation and webhook processing')
    .addTag('Transactions', 'Transaction history and persistence')
    .addTag('Trust Scores', 'Behavioral trust scoring and risk assessment engine')
    .addTag('Recommendations', 'AI-driven financial opportunity recommendations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'signalOS API — Financial Infrastructure',
  });
}
