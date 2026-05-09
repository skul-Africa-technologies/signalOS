CREATE TABLE "loan_eligibility" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eligible" BOOLEAN NOT NULL DEFAULT false,
  "eligibleAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "riskLevel" TEXT NOT NULL DEFAULT 'Very High',
  "recommendation" TEXT NOT NULL,
  "trustScore" DOUBLE PRECISION NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loan_eligibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loan_eligibility_userId_key" ON "loan_eligibility"("userId");

ALTER TABLE "loan_eligibility" ADD CONSTRAINT "loan_eligibility_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
