import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Plan } from "@/generated/prisma/client";

const PLAN_RANK: Record<Plan, number> = {
  FREE: 0,
  PRO: 1,
  MAX: 2,
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Format a Date as "YYYY-MM-DD" in JST.
 */
function toJstDateString(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 10);
}

/**
 * Generate an array of "YYYY-MM-DD" strings for the last N days (inclusive of today in JST).
 */
function generateDateRange(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    result.push(toJstDateString(d));
  }
  return result;
}

export async function GET() {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Plan distribution
  const users = await prisma.user.findMany({
    select: { plan: true, planOverride: true },
  });

  const planCounts = new Map<string, number>();
  for (const u of users) {
    const effectivePlan = u.planOverride ?? u.plan;
    planCounts.set(effectivePlan, (planCounts.get(effectivePlan) ?? 0) + 1);
  }

  const totalUsers = users.length;
  const distribution = Array.from(planCounts.entries())
    .map(([plan, count]) => ({
      plan,
      count,
      percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
    }))
    .sort((a, b) => (PLAN_RANK[a.plan as Plan] ?? 0) - (PLAN_RANK[b.plan as Plan] ?? 0));

  // 2. Recent plan changes (last 50)
  const recentChanges = await prisma.planChangeLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
  });

  const recentChangesFormatted = recentChanges.map((log) => ({
    id: log.id,
    userId: log.userId,
    userEmail: log.user.email,
    fromPlan: log.fromPlan,
    toPlan: log.toPlan,
    source: log.source,
    createdAt: log.createdAt.toISOString(),
    note: log.note,
  }));

  // 3. Change trend (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const changeLogs = await prisma.planChangeLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { fromPlan: true, toPlan: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by JST date and classify
  const trendMap = new Map<string, { upgrades: number; downgrades: number }>();
  for (const log of changeLogs) {
    const dateKey = toJstDateString(log.createdAt);
    const entry = trendMap.get(dateKey) ?? { upgrades: 0, downgrades: 0 };

    const fromRank = PLAN_RANK[log.fromPlan];
    const toRank = PLAN_RANK[log.toPlan];

    if (toRank > fromRank) {
      entry.upgrades += 1;
    } else if (toRank < fromRank) {
      entry.downgrades += 1;
    }

    trendMap.set(dateKey, entry);
  }

  // Fill zero days
  const dateRange = generateDateRange(30);
  const changeTrend = dateRange.map((date) => {
    const entry = trendMap.get(date);
    return {
      date,
      upgrades: entry?.upgrades ?? 0,
      downgrades: entry?.downgrades ?? 0,
    };
  });

  // 4. Summary
  let upgrades30d = 0;
  let downgrades30d = 0;
  for (const day of changeTrend) {
    upgrades30d += day.upgrades;
    downgrades30d += day.downgrades;
  }

  const summary = {
    totalChanges30d: upgrades30d + downgrades30d,
    upgrades30d,
    downgrades30d,
    netGrowth30d: upgrades30d - downgrades30d,
  };

  return NextResponse.json({
    distribution,
    recentChanges: recentChangesFormatted,
    changeTrend,
    summary,
  });
}
