import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('signalOS — Autonomous Predictive Financial Infrastructure Platform')
    .setDescription(
      `## Production-Grade Autonomous Predictive Financial Infrastructure

A bank-grade, compliance-aware, event-driven platform combining behavioral financial intelligence, programmable wallets, KYC identity verification, and production observability.

---

### PHASE 4 — Regulatory-Grade Scalable Infrastructure

#### Part 1 — KYC & Identity Verification

Progressive identity verification pipeline:

\`\`\`
User Submits BVN/NIN
  → Hash encrypted (SHA-256 + salt)
  → Provider verification (Smile Identity / Prembly)
  → KycProfile updated (verificationLevel: BASIC → INTERMEDIATE → FULL)
  → kyc.submitted event emitted
  → Audit log written

Admin Reviews KYC
  → Status: VERIFIED | REJECTED
  → kyc.verified → trust upgraded · analytics updated · notification sent
  → kyc.rejected → notification sent · reason recorded

Identity Risk Engine
  → Runs on every KYC update
  → Scores: BVN(-25) NIN(-25) Selfie(-20) Phone(-15) Bank(-10) Address(-5)
  → identity.risk.detected emitted if score > 70
\`\`\`

**Verification Levels:** NONE → BASIC (1 check) → INTERMEDIATE (2-3 checks) → FULL (4+ checks)

**KYC Statuses:** PENDING → UNDER_REVIEW → VERIFIED | REJECTED | EXPIRED

**Document Types:** SELFIE · NIN_SLIP · VOTERS_CARD · DRIVERS_LICENSE · INTERNATIONAL_PASSPORT

---

#### Part 2 — Monitoring & Observability

| Endpoint | Purpose |
|---|---|
| \`GET /api/v1/health\` | Platform liveness (DB + memory + disk) |
| \`GET /api/v1/health/database\` | Database connectivity |
| \`GET /api/v1/health/payments\` | Payment provider health |
| \`GET /api/v1/health/ready\` | Kubernetes readiness probe |
| \`GET /api/v1/metrics\` | Prometheus metrics (text/plain) |

**Prometheus Metrics Tracked:**
- \`http_request_duration_seconds\` — API latency histogram
- \`http_requests_total\` — Request counter by method/route/status
- \`http_errors_total\` — Error counter
- \`kyc_submissions_total\` — KYC submissions by type
- \`kyc_verifications_total\` — Verifications by status
- \`trust_recalculations_total\` — Trust score recalculations
- \`fraud_detections_total\` — Fraud detections by risk level
- \`repayments_processed_total\` — Repayment throughput
- \`websocket_connections_active\` — Live WebSocket connections
- \`reconciliation_failures_total\` — Reconciliation failures
- \`treasury_balance_ngn\` — Treasury balance gauge

**Structured Logging:** Winston JSON format · correlation IDs · request tracing

**Error Tracking:** Sentry integration (set \`SENTRY_DSN\` env var)

**Alert Severities:** LOW · MEDIUM · HIGH · CRITICAL

---

#### Part 3 — API Versioning & Scale Infrastructure

**URI Versioning:**
- \`/api/v1/*\` — Stable v1 contract (backward compatible)
- \`/api/v2/*\` — Enhanced v2 with compliance metadata envelopes

**v2 Response Envelope:**
\`\`\`json
{
  "data": { ... },
  "meta": {
    "apiVersion": "2",
    "complianceFramework": "CBN-KYC-2024",
    "timestamp": "2026-05-16T00:00:00.000Z"
  }
}
\`\`\`

**Throttling (global):**
- Short: 10 req/s
- Medium: 200 req/min
- Long: 2000 req/hr

**File Storage:**
\`\`\`
GET /api/v1/storage/upload-url?folder=kyc&mimeType=image/jpeg
  → Returns signed upload URL + storageKey (15 min expiry)
  → In production: S3 presigned PUT URL

GET /api/v1/storage/download-url/:storageKey
  → Returns signed read URL
  → In production: S3 presigned GET URL
\`\`\`

**Supported Folders:** kyc · receipts · contracts · statements

**Background Queues (Redis-backed in production, in-memory in dev):**

| Queue | Purpose | Retry |
|---|---|---|
| \`email\` | Transactional emails | 3x exponential backoff |
| \`sms\` | SMS notifications | 3x exponential backoff |
| \`fraud-analysis\` | Async fraud scoring | 3x exponential backoff |
| \`reconciliation\` | Reconciliation jobs | 3x exponential backoff |
| \`kyc-processing\` | KYC document processing | 3x exponential backoff |
| \`analytics\` | Analytics generation | 3x exponential backoff |

Dead-letter queue: jobs moved after max attempts exceeded.

---

#### Part 4 — Event-Driven Compliance Wiring

\`\`\`
kyc.verified
  ├── trust.recalculate.requested (trust score upgraded)
  ├── analytics queue (event recorded)
  ├── sms queue (user notified)
  └── websocket.emit (real-time UI update)

kyc.rejected
  ├── sms queue (user notified with reason)
  └── websocket.emit (real-time UI update)

identity.risk.detected (score > 80)
  ├── fraud-analysis queue
  └── HIGH alert → Sentry

reconciliation.failed
  ├── reconciliation_failures_total metric incremented
  ├── email queue (admin notified)
  └── HIGH alert → Sentry

system.error.detected
  └── CRITICAL alert → Sentry
\`\`\`

---

### External Financial Intelligence API (B2B)

Organizations (banks, fintechs, MFIs) integrate via API key authentication to access consent-gated behavioral intelligence.

**Consent Scopes:** \`trust:read\` · \`identity:read\` · \`loan:read\` · \`cooperative:read\` · \`fraud:read\` · \`activity:read\`

**Rate Limit Tiers:** FREE (100/day) · STARTER (1k) · GROWTH (10k) · BANK (50k) · ENTERPRISE (500k)

---

### Full Financial Operating Pipeline

\`\`\`
User Signup → Wallet Auto-Created → Economic Identity Established
User Activity → Signal Extraction → Trust Recalculation → Loan Eligibility
Loan Disbursement → Wallet Credited → Ledger Entry → Intelligence Re-Analysis
Withdrawal → Wallet Debited → Squad Transfer → Webhook Confirmation
\`\`\`

### Authentication
All protected endpoints require a **Bearer JWT token**. Obtain via \`POST /api/v1/auth/login\`.

---

### PHASE 5 — Autonomous Predictive Financial Intelligence

#### Predictive Intelligence Engine

\`\`\`
User Repayment Completed
  → repayment probability recalculated
  → trust trajectory forecast updated
  → fraud probability refreshed
  → autonomous trust adaptation triggered
  → treasury forecast updated
  → recommendations regenerated
  → websocket emitted

Treasury Risk Increased
  → lending pool autonomously reduced (70% of current)
  → treasury.risk.increased event emitted
  → admin alerted
  → predictive alerts propagated

Fraud Risk Escalated (probability ≥ 0.70)
  → wallet 50% frozen autonomously
  → fraud.risk.escalated event emitted
  → risk profile updated
\`\`\`

#### Prediction Types

| Type | Window | TTL | Description |
|---|---|---|---|
| \`DEFAULT_RISK\` | 30 days | 24h | Probability of loan default |
| \`REPAYMENT_SUCCESS\` | 30 days | 24h | Probability of on-time repayment |
| \`TRUST_EVOLUTION\` | 90 days | 48h | 30/90-day trust trajectory forecast |
| \`FRAUD_PROBABILITY\` | 30 days | 12h | Future fraud likelihood |
| \`TREASURY_STABILITY\` | 90 days | 24h | Cooperative treasury sustainability |
| \`LIQUIDITY_FORECAST\` | 30 days | 24h | Wallet liquidity projection |
| \`COOPERATIVE_RISK\` | 90 days | 48h | Group-level risk forecast |

#### AI-Assisted Underwriting

\`\`\`json
{
  "recommendedLoanAmount": 250000,
  "recommendedDurationMonths": 8,
  "interestAdjustment": -2,
  "riskAdjustedRate": 13,
  "confidence": 0.91,
  "approved": true,
  "reasoning": ["High trust score qualifies for premium terms"]
}
\`\`\`

#### Autonomous Adaptation Controls

- **Trust Adaptation**: score < 25 → riskLevel = Very High; score ≥ 70 → riskLevel = Low
- **Fraud Adaptation**: probability ≥ 0.70 → wallet 50% frozen
- **Treasury Adaptation**: depletionRisk > 0.70 → lendingPool reduced by 30%

#### ML-Ready Architecture

The \`PredictionProvider\` interface is pluggable. Swap the built-in rule-based engine with:
- Python ML microservice (via HTTP)
- TensorFlow Serving
- OpenAI function calls
- Custom risk models

Implement \`PredictionProvider\` and register in \`PredictiveIntelligenceModule\`.

#### Scheduled Prediction Jobs

| Job | Schedule | Purpose |
|---|---|---|
| \`daily-prediction-regeneration\` | 01:00 UTC | Refresh all user predictions |
| \`daily-treasury-adaptation\` | 01:30 UTC | Autonomous treasury controls |
| \`refreshUserPredictions\` | 02:00 UTC | Full prediction sweep |
| \`refreshTreasuryForecasts\` | 03:00 UTC | Treasury forecast sweep |
| \`fraudProbabilitySweep\` | Every 6h | High-risk user fraud sweep |
| \`cleanExpiredPredictions\` | Weekly | Purge stale snapshots |
`,
    )
    .setVersion('5.0.0')
    .setContact('signalOS', 'https://github.com/signalOS', 'api@signalos.io')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT from /api/v1/auth/login' },
      'JWT',
    )
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key', description: 'Organization API key (sk_...)' }, 'x-api-key')
    .addTag('Authentication', 'User registration, login, and JWT issuance')
    .addTag('Users', 'Authenticated user profile retrieval')
    .addTag('KYC & Identity Verification', 'Bank-grade KYC: BVN/NIN verification, document upload, selfie liveness, identity risk scoring')
    .addTag('Health & Observability', 'Liveness/readiness probes, Prometheus metrics, infrastructure diagnostics')
    .addTag('File Storage', 'Signed upload/download URLs for KYC documents, receipts, contracts, statements')
    .addTag('Queue Infrastructure', 'Background job queues: email, SMS, fraud analysis, reconciliation, KYC processing, analytics')
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
    .addTag('External API — Organizations', 'Onboard and manage external organizations')
    .addTag('External API — Consent', 'User consent grants: authorize, list, and revoke')
    .addTag('External Intelligence APIs', 'Behavioral financial intelligence APIs')
    .addTag('External API — Webhooks', 'HMAC-signed real-time event subscriptions')
    .addTag('Repayment', 'Loan repayment lifecycle: schedule, installments, overdue detection, default engine')
    .addTag('Notifications', 'Event-driven notification delivery: in-app, email, SMS')
    .addTag('Admin', 'Platform administration and governance')
    .addTag('Audit', 'Immutable compliance audit trail')
    .addTag('Reconciliation', 'Financial reconciliation and mismatch resolution')
    .addTag('Predictive Intelligence', 'Phase 5: AI-assisted repayment prediction, trust evolution forecasting, fraud probability, treasury forecasting, autonomous adaptation, underwriting, loan simulation, and investor-grade portfolio analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'signalOS API — Regulated Financial Infrastructure',
  });
}
