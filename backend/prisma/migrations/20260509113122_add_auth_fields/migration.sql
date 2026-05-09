/*
  Warnings:

  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `users` table. All the data in the column will be lost.
  - Added the required column `passwordHash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('TRADER', 'ARTISAN', 'FREELANCER', 'VENDOR', 'OTHER');

-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email",
DROP COLUMN "isVerified",
ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'TRADER',
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "name" SET NOT NULL;
