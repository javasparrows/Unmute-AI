"use server";

import { prisma } from "@/lib/prisma";
import { getPlanInfo, isUnlimited } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getOrCreateUsageRecord(userId: string) {
  const month = getCurrentMonth();
  return prisma.usageRecord.upsert({
    where: { userId_month: { userId, month } },
    update: {},
    create: { userId, month },
  });
}

export async function checkTranslationLimit(
  userId: string,
  plan: Plan,
  additionalChars: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const limits = getPlanInfo(plan).limits;
  if (isUnlimited(limits.translationCharsPerMonth)) {
    return { allowed: true, remaining: -1 };
  }

  const usage = await getOrCreateUsageRecord(userId);
  const remaining = limits.translationCharsPerMonth - usage.translationChars;
  return {
    allowed: remaining >= additionalChars,
    remaining: Math.max(0, remaining),
  };
}

export async function recordTranslationUsage(
  userId: string,
  chars: number,
): Promise<void> {
  const month = getCurrentMonth();
  await prisma.usageRecord.upsert({
    where: { userId_month: { userId, month } },
    update: { translationChars: { increment: chars } },
    create: { userId, month, translationChars: chars },
  });
}

export async function checkStructureCheckLimit(
  userId: string,
  plan: Plan,
): Promise<{ allowed: boolean; remaining: number }> {
  const limits = getPlanInfo(plan).limits;
  if (isUnlimited(limits.structureChecksPerMonth)) {
    return { allowed: true, remaining: -1 };
  }

  const usage = await getOrCreateUsageRecord(userId);
  const remaining = limits.structureChecksPerMonth - usage.structureChecks;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}

export async function recordStructureCheckUsage(
  userId: string,
): Promise<void> {
  const month = getCurrentMonth();
  await prisma.usageRecord.upsert({
    where: { userId_month: { userId, month } },
    update: { structureChecks: { increment: 1 } },
    create: { userId, month, structureChecks: 1 },
  });
}

export async function checkDocumentLimit(
  userId: string,
  plan: Plan,
): Promise<{ allowed: boolean; current: number; max: number }> {
  const limits = getPlanInfo(plan).limits;
  if (isUnlimited(limits.maxDocuments)) {
    return { allowed: true, current: 0, max: -1 };
  }

  const count = await prisma.document.count({ where: { userId } });
  return {
    allowed: count < limits.maxDocuments,
    current: count,
    max: limits.maxDocuments,
  };
}

export async function checkVersionLimit(
  userId: string,
  plan: Plan,
  documentId: string,
): Promise<{ allowed: boolean; current: number; max: number }> {
  const limits = getPlanInfo(plan).limits;
  if (isUnlimited(limits.maxVersionsPerDoc)) {
    return { allowed: true, current: 0, max: -1 };
  }

  const count = await prisma.documentVersion.count({
    where: { documentId },
  });
  return {
    allowed: count < limits.maxVersionsPerDoc,
    current: count,
    max: limits.maxVersionsPerDoc,
  };
}

export async function getUsageSummary(userId: string, plan: Plan) {
  const usage = await getOrCreateUsageRecord(userId);
  const limits = getPlanInfo(plan).limits;
  const docCount = await prisma.document.count({ where: { userId } });

  return {
    translationChars: {
      used: usage.translationChars,
      limit: limits.translationCharsPerMonth,
    },
    structureChecks: {
      used: usage.structureChecks,
      limit: limits.structureChecksPerMonth,
    },
    documents: {
      used: docCount,
      limit: limits.maxDocuments,
    },
  };
}
