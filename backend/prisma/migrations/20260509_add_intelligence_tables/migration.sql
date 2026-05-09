CREATE TABLE "financial_signals" (
  "id"                      TEXT NOT NULL PRIMARY KEY,
  "userId"                  TEXT NOT NULL,
  "profileId"               TEXT NOT NULL,
  "transactionFrequency"    DOUBLE PRECISION NOT NULL,
  "repaymentConsistency"    DOUBLE PRECISION NOT NULL,
  "repeatCustomerRate"      DOUBLE PRECISION NOT NULL,
  "incomeStability"         DOUBLE PRECISION NOT NULL,
  "cashflowVolatility"      DOUBLE PRECISION NOT NULL,
  "activityLevel"           DOUBLE PRECISION NOT NULL,
  "savingsBehaviour"        DOUBLE PRECISION NOT NULL,
  "contributionReliability" DOUBLE PRECISION NOT NULL,
  "groupParticipation"      DOUBLE PRECISION NOT NULL,
  "dataPoints"              INTEGER NOT NULL DEFAULT 0,
  "extractedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_signals_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "economic_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "financial_signals_userId_fkey"   FOREIGN KEY ("userId")    REFERENCES "users"("id")             ON DELETE CASCADE
);
CREATE INDEX "financial_signals_userId_idx"      ON "financial_signals"("userId");
CREATE INDEX "financial_signals_extractedAt_idx" ON "financial_signals"("extractedAt");

CREATE TABLE "risk_assessments" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "userId"             TEXT NOT NULL,
  "profileId"          TEXT NOT NULL,
  "riskLevel"          TEXT NOT NULL,
  "riskScore"          DOUBLE PRECISION NOT NULL,
  "volatilityDetected" BOOLEAN NOT NULL DEFAULT false,
  "inactivityDetected" BOOLEAN NOT NULL DEFAULT false,
  "flags"              JSONB NOT NULL,
  "assessedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "risk_assessments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "economic_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "risk_assessments_userId_fkey"   FOREIGN KEY ("userId")    REFERENCES "users"("id")             ON DELETE CASCADE
);
CREATE INDEX "risk_assessments_userId_idx"    ON "risk_assessments"("userId");
CREATE INDEX "risk_assessments_assessedAt_idx" ON "risk_assessments"("assessedAt");

CREATE TABLE "intelligence_snapshots" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "userId"          TEXT NOT NULL,
  "profileId"       TEXT NOT NULL,
  "trustScore"      DOUBLE PRECISION NOT NULL,
  "riskLevel"       TEXT NOT NULL,
  "confidenceLevel" TEXT NOT NULL,
  "eligibleForLoan" BOOLEAN NOT NULL DEFAULT false,
  "eligibleAmount"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "recommendations" JSONB NOT NULL,
  "signalSummary"   JSONB NOT NULL,
  "scoreSummary"    JSONB NOT NULL,
  "triggeredBy"     TEXT NOT NULL DEFAULT 'analysis',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intelligence_snapshots_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "economic_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "intelligence_snapshots_userId_fkey"   FOREIGN KEY ("userId")    REFERENCES "users"("id")             ON DELETE CASCADE
);
CREATE INDEX "intelligence_snapshots_userId_idx"    ON "intelligence_snapshots"("userId");
CREATE INDEX "intelligence_snapshots_createdAt_idx" ON "intelligence_snapshots"("createdAt");
