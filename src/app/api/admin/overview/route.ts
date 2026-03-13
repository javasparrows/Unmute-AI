import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCost } from "@/lib/analytics";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function getJSTStartOfDay(date: Date): Date {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const startOfDayJST = new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()),
  );
  return new Date(startOfDayJST.getTime() - JST_OFFSET_MS);
}

function getJSTStartOfWeek(date: Date): Date {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const day = jst.getUTCDay();
  // Monday = 1, so shift Sunday (0) to -6, others to (1 - day)
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(jst.getTime() + diff * DAY_MS);
  const startOfWeekJST = new Date(
    Date.UTC(
      monday.getUTCFullYear(),
      monday.getUTCMonth(),
      monday.getUTCDate(),
    ),
  );
  return new Date(startOfWeekJST.getTime() - JST_OFFSET_MS);
}

function formatJSTDate(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const m = jst.getUTCMonth() + 1;
  const d = jst.getUTCDate();
  return `${m}/${d}`;
}

function generateLast30DayKeys(): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * DAY_MS);
    keys.push(formatJSTDate(date));
  }
  return keys;
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

  const now = new Date();
  const startOfDayUTC = getJSTStartOfDay(now);
  const startOfWeekUTC = getJSTStartOfWeek(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

  // Run queries in parallel
  const [
    totalUsers,
    signupsToday,
    signupsThisWeek,
    activeUsersResult,
    todayLogs,
    last30DaysUsers,
    planDistributionRaw,
    last30DaysLogs,
  ] = await Promise.all([
    // Total users
    prisma.user.count(),

    // Signups today (JST)
    prisma.user.count({
      where: { createdAt: { gte: startOfDayUTC } },
    }),

    // Signups this week (JST, Monday start)
    prisma.user.count({
      where: { createdAt: { gte: startOfWeekUTC } },
    }),

    // Active users today (distinct userId from ApiUsageLog)
    prisma.apiUsageLog.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: startOfDayUTC } },
    }),

    // Today's API usage logs for token/cost calculation
    prisma.apiUsageLog.findMany({
      where: { createdAt: { gte: startOfDayUTC } },
      select: {
        model: true,
        inputTokens: true,
        outputTokens: true,
      },
    }),

    // Last 30 days user signups (for trend)
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),

    // Plan distribution using raw query for effective plan (planOverride ?? plan)
    prisma.user.findMany({
      select: { plan: true, planOverride: true },
    }),

    // Last 30 days API usage logs (for token trend)
    prisma.apiUsageLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        model: true,
        inputTokens: true,
        outputTokens: true,
        createdAt: true,
      },
    }),
  ]);

  // KPIs: tokens and cost today
  let totalTokensToday = 0;
  let totalCostToday = 0;
  for (const log of todayLogs) {
    const tokens = log.inputTokens + log.outputTokens;
    totalTokensToday += tokens;
    totalCostToday += calculateCost(log.model, log.inputTokens, log.outputTokens);
  }

  // Signup trend: group by JST date, last 30 days
  const signupBuckets = new Map<string, number>();
  for (const user of last30DaysUsers) {
    const key = formatJSTDate(user.createdAt);
    signupBuckets.set(key, (signupBuckets.get(key) ?? 0) + 1);
  }
  const allDayKeys = generateLast30DayKeys();
  const signupTrend = allDayKeys.map((date) => ({
    date,
    count: signupBuckets.get(date) ?? 0,
  }));

  // Plan distribution: use effective plan (planOverride ?? plan)
  const planCounts = new Map<string, number>();
  for (const user of planDistributionRaw) {
    const effectivePlan = user.planOverride ?? user.plan;
    planCounts.set(effectivePlan, (planCounts.get(effectivePlan) ?? 0) + 1);
  }
  const planDistribution = Array.from(planCounts.entries())
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count);

  // Token trend: group by JST date, last 30 days
  const tokenBuckets = new Map<string, { tokens: number; cost: number }>();
  for (const log of last30DaysLogs) {
    const key = formatJSTDate(log.createdAt);
    const existing = tokenBuckets.get(key) ?? { tokens: 0, cost: 0 };
    existing.tokens += log.inputTokens + log.outputTokens;
    existing.cost += calculateCost(log.model, log.inputTokens, log.outputTokens);
    tokenBuckets.set(key, existing);
  }
  const tokenTrend = allDayKeys.map((date) => {
    const bucket = tokenBuckets.get(date) ?? { tokens: 0, cost: 0 };
    return {
      date,
      tokens: bucket.tokens,
      cost: bucket.cost,
    };
  });

  return NextResponse.json({
    kpis: {
      totalUsers,
      signupsToday,
      signupsThisWeek,
      activeUsersToday: activeUsersResult.length,
      totalTokensToday,
      totalCostToday,
    },
    signupTrend,
    planDistribution,
    tokenTrend,
  });
}
