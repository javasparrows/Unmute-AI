-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlanChangeSource" AS ENUM ('STRIPE_WEBHOOK', 'ADMIN_OVERRIDE', 'BACKFILL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "path" TEXT NOT NULL,
    "locale" TEXT,
    "countryCode" VARCHAR(2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanChangeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromPlan" "Plan" NOT NULL,
    "toPlan" "Plan" NOT NULL,
    "source" "PlanChangeSource" NOT NULL,
    "externalEventId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_path_createdAt_visitorId_idx" ON "PageView"("path", "createdAt", "visitorId");

-- CreateIndex
CREATE INDEX "PageView_visitorId_createdAt_idx" ON "PageView"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_userId_createdAt_idx" ON "PageView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_countryCode_createdAt_idx" ON "PageView"("countryCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlanChangeLog_externalEventId_key" ON "PlanChangeLog"("externalEventId");

-- CreateIndex
CREATE INDEX "PlanChangeLog_userId_createdAt_idx" ON "PlanChangeLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanChangeLog_createdAt_idx" ON "PlanChangeLog"("createdAt");

-- CreateIndex
CREATE INDEX "PlanChangeLog_toPlan_createdAt_idx" ON "PlanChangeLog"("toPlan", "createdAt");

-- CreateIndex
CREATE INDEX "PlanChangeLog_source_createdAt_idx" ON "PlanChangeLog"("source", "createdAt");

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeLog" ADD CONSTRAINT "PlanChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
