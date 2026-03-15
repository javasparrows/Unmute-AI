import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { adminMiddleware } from "@/server/middleware/admin";
import { prismaAdmin } from "@/lib/prisma";
import { calculateCost } from "@/lib/analytics";
import {
  changeRole,
  softDeleteUser,
  restoreUser,
  setPlanOverride,
  clearPlanOverride,
  AdminActionError,
} from "@/lib/admin/user-management";
import type { Plan } from "@/generated/prisma/client";

type AdminEnv = {
  Variables: {
    userId: string;
    userEmail: string | null;
  };
};

// --- Overview helpers ---

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

// --- Acquisition helpers ---

function toJSTDateString(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(toJSTDateString(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// --- Plans helpers ---

const PLAN_RANK: Record<Plan, number> = {
  FREE: 0,
  PRO: 1,
  MAX: 2,
};

function toJstDateStringPlans(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 10);
}

function generateDateRangePlans(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    result.push(toJstDateStringPlans(d));
  }
  return result;
}

// --- User list types ---

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  planOverride: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  totalDocuments: number;
  totalTokens: number;
  deletedAt: string | null;
}

// --- Helper for AdminActionError responses ---

function handleAdminActionError(err: unknown, c: { json: (data: unknown, status: number) => Response }): Response {
  if (err instanceof AdminActionError) {
    const status = err.code === "NOT_FOUND" ? 404 : 400;
    return c.json({ error: err.message }, status);
  }
  throw err;
}

export const adminRoutes = new Hono<AdminEnv>()
  .use(adminMiddleware)

  // GET /admin/overview
  .get("/overview", async (c) => {
    const now = new Date();
    const startOfDayUTC = getJSTStartOfDay(now);
    const startOfWeekUTC = getJSTStartOfWeek(now);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

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
      prismaAdmin.user.count(),
      prismaAdmin.user.count({
        where: { createdAt: { gte: startOfDayUTC } },
      }),
      prismaAdmin.user.count({
        where: { createdAt: { gte: startOfWeekUTC } },
      }),
      prismaAdmin.apiUsageLog.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: startOfDayUTC } },
      }),
      prismaAdmin.apiUsageLog.findMany({
        where: { createdAt: { gte: startOfDayUTC } },
        select: {
          model: true,
          inputTokens: true,
          outputTokens: true,
        },
      }),
      prismaAdmin.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      prismaAdmin.user.findMany({
        select: { plan: true, planOverride: true },
      }),
      prismaAdmin.apiUsageLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          model: true,
          inputTokens: true,
          outputTokens: true,
          createdAt: true,
        },
      }),
    ]);

    let totalTokensToday = 0;
    let totalCostToday = 0;
    for (const log of todayLogs) {
      const tokens = log.inputTokens + log.outputTokens;
      totalTokensToday += tokens;
      totalCostToday += calculateCost(log.model, log.inputTokens, log.outputTokens);
    }

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

    const planCounts = new Map<string, number>();
    for (const user of planDistributionRaw) {
      const effectivePlan = user.planOverride ?? user.plan;
      planCounts.set(effectivePlan, (planCounts.get(effectivePlan) ?? 0) + 1);
    }
    const planDistribution = Array.from(planCounts.entries())
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count);

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

    return c.json({
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
  })

  // GET /admin/acquisition
  .get("/acquisition", async (c) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
    const startOfTodayUTC = getJSTStartOfDay(now);

    const pageViews = await prismaAdmin.pageView.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        visitorId: true,
        userId: true,
        path: true,
        countryCode: true,
        createdAt: true,
      },
    });

    // KPI totals
    const total = pageViews.length;
    const uniqueVisitorSet = new Set(pageViews.map((pv) => pv.visitorId));
    const uniqueVisitors = uniqueVisitorSet.size;

    const todayViews = pageViews.filter((pv) => pv.createdAt >= startOfTodayUTC);
    const today = todayViews.length;
    const todayUniqueSet = new Set(todayViews.map((pv) => pv.visitorId));
    const todayUnique = todayUniqueSet.size;

    // Page view trend
    const trendMap = new Map<string, { views: number; visitors: Set<string> }>();
    for (const pv of pageViews) {
      const dateKey = toJSTDateString(pv.createdAt);
      let entry = trendMap.get(dateKey);
      if (!entry) {
        entry = { views: 0, visitors: new Set() };
        trendMap.set(dateKey, entry);
      }
      entry.views += 1;
      entry.visitors.add(pv.visitorId);
    }

    const allDates = generateDateRange(thirtyDaysAgo, now);
    const pageViewTrend = allDates.map((date) => {
      const entry = trendMap.get(date);
      return {
        date,
        views: entry?.views ?? 0,
        uniqueVisitors: entry?.visitors.size ?? 0,
      };
    });

    // Top pages
    const pageMap = new Map<string, { views: number; visitors: Set<string> }>();
    for (const pv of pageViews) {
      let entry = pageMap.get(pv.path);
      if (!entry) {
        entry = { views: 0, visitors: new Set() };
        pageMap.set(pv.path, entry);
      }
      entry.views += 1;
      entry.visitors.add(pv.visitorId);
    }

    const topPages = Array.from(pageMap.entries())
      .map(([path, entry]) => ({
        path,
        views: entry.views,
        uniqueVisitors: entry.visitors.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Country breakdown
    const countryMap = new Map<string, { views: number; visitors: Set<string> }>();
    for (const pv of pageViews) {
      const country = pv.countryCode ?? "Unknown";
      let entry = countryMap.get(country);
      if (!entry) {
        entry = { views: 0, visitors: new Set() };
        countryMap.set(country, entry);
      }
      entry.views += 1;
      entry.visitors.add(pv.visitorId);
    }

    const countryBreakdown = Array.from(countryMap.entries())
      .map(([country, entry]) => ({
        country,
        views: entry.views,
        uniqueVisitors: entry.visitors.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Conversion funnel
    const pricingVisitorIds = new Set<string>();
    for (const pv of pageViews) {
      if (pv.path === "/pricing") {
        pricingVisitorIds.add(pv.visitorId);
      }
    }
    const pricingVisitors = pricingVisitorIds.size;

    const attributedUserIds = new Set<string>();
    for (const pv of pageViews) {
      if (pv.userId && pricingVisitorIds.has(pv.visitorId)) {
        attributedUserIds.add(pv.userId);
      }
    }
    const attributedSignups = attributedUserIds.size;

    let paidConversions = 0;

    if (attributedUserIds.size > 0) {
      const firstAppearance = new Map<string, Date>();
      for (const pv of pageViews) {
        if (pv.userId && attributedUserIds.has(pv.userId)) {
          const existing = firstAppearance.get(pv.userId);
          if (!existing || pv.createdAt < existing) {
            firstAppearance.set(pv.userId, pv.createdAt);
          }
        }
      }

      const planChanges = await prismaAdmin.planChangeLog.findMany({
        where: {
          userId: { in: Array.from(attributedUserIds) },
          fromPlan: "FREE",
          toPlan: { in: ["PRO", "MAX"] },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          userId: true,
          createdAt: true,
        },
      });

      const SEVEN_DAYS_MS = 7 * DAY_MS;
      const convertedUserIds = new Set<string>();
      for (const change of planChanges) {
        const appearance = firstAppearance.get(change.userId);
        if (
          appearance &&
          change.createdAt.getTime() - appearance.getTime() <= SEVEN_DAYS_MS
        ) {
          convertedUserIds.add(change.userId);
        }
      }
      paidConversions = convertedUserIds.size;
    }

    return c.json({
      pageViews: {
        total,
        uniqueVisitors,
        today,
        todayUnique,
      },
      pageViewTrend,
      topPages,
      countryBreakdown,
      conversionFunnel: {
        pricingVisitors,
        attributedSignups,
        paidConversions,
      },
    });
  })

  // GET /admin/plans
  .get("/plans", async (c) => {
    // Plan distribution
    const users = await prismaAdmin.user.findMany({
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

    // Recent plan changes
    const recentChanges = await prismaAdmin.planChangeLog.findMany({
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

    // Change trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);
    const changeLogs = await prismaAdmin.planChangeLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { fromPlan: true, toPlan: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const trendMap = new Map<string, { upgrades: number; downgrades: number }>();
    for (const log of changeLogs) {
      const dateKey = toJstDateStringPlans(log.createdAt);
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

    const dateRange = generateDateRangePlans(30);
    const changeTrend = dateRange.map((date) => {
      const entry = trendMap.get(date);
      return {
        date,
        upgrades: entry?.upgrades ?? 0,
        downgrades: entry?.downgrades ?? 0,
      };
    });

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

    return c.json({
      distribution,
      recentChanges: recentChangesFormatted,
      changeTrend,
      summary,
    });
  })

  // GET /admin/users
  .get(
    "/users",
    zValidator(
      "query",
      z.object({
        status: z.enum(["active", "deleted", "all"]).optional().default("active"),
      }),
    ),
    async (c) => {
      const { status } = c.req.valid("query");

      const deletedAtFilter =
        status === "deleted"
          ? { deletedAt: { not: null } }
          : status === "all"
            ? {}
            : { deletedAt: null };

      const [
        users,
        documentCounts,
        tokenTotals,
        lastApiUsage,
        lastPageViews,
        lastLoginDevices,
      ] = await Promise.all([
        prismaAdmin.user.findMany({
          where: deletedAtFilter,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            plan: true,
            planOverride: true,
            subscriptionStatus: true,
            createdAt: true,
            deletedAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prismaAdmin.document.groupBy({
          by: ["userId"],
          _count: true,
        }),
        prismaAdmin.apiUsageLog.groupBy({
          by: ["userId"],
          _sum: {
            inputTokens: true,
            outputTokens: true,
          },
        }),
        prismaAdmin.apiUsageLog.groupBy({
          by: ["userId"],
          _max: { createdAt: true },
        }),
        prismaAdmin.pageView.groupBy({
          by: ["userId"],
          _max: { createdAt: true },
        }),
        prismaAdmin.loginDevice.groupBy({
          by: ["userId"],
          _max: { lastSeenAt: true },
        }),
      ]);

      const docCountMap = new Map<string, number>();
      for (const row of documentCounts) {
        docCountMap.set(row.userId, row._count);
      }

      const tokenMap = new Map<string, number>();
      for (const row of tokenTotals) {
        const input = row._sum.inputTokens ?? 0;
        const output = row._sum.outputTokens ?? 0;
        tokenMap.set(row.userId, input + output);
      }

      const lastActiveMap = new Map<string, Date>();

      function updateLastActive(userId: string, date: Date) {
        const existing = lastActiveMap.get(userId);
        if (!existing || date > existing) {
          lastActiveMap.set(userId, date);
        }
      }

      for (const row of lastApiUsage) {
        if (row._max.createdAt) updateLastActive(row.userId, row._max.createdAt);
      }
      for (const row of lastPageViews) {
        if (row.userId && row._max.createdAt)
          updateLastActive(row.userId, row._max.createdAt);
      }
      for (const row of lastLoginDevices) {
        if (row._max.lastSeenAt) updateLastActive(row.userId, row._max.lastSeenAt);
      }

      const rows: UserRow[] = users.map((user) => {
        const effectivePlan = user.planOverride ?? user.plan;
        const lastActive = lastActiveMap.get(user.id);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: effectivePlan,
          planOverride: user.planOverride,
          subscriptionStatus: user.subscriptionStatus,
          createdAt: user.createdAt.toISOString(),
          lastActiveAt: lastActive ? lastActive.toISOString() : null,
          totalDocuments: docCountMap.get(user.id) ?? 0,
          totalTokens: tokenMap.get(user.id) ?? 0,
          deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
        };
      });

      return c.json({
        users: rows,
        total: rows.length,
      });
    },
  )

  // PATCH /admin/users/:id/role
  .patch(
    "/users/:id/role",
    zValidator(
      "json",
      z.object({
        role: z.enum(["USER", "ADMIN"]),
      }),
    ),
    async (c) => {
      const targetId = c.req.param("id");
      const { role } = c.req.valid("json");

      try {
        const user = await changeRole(c.get("userId"), targetId, role);
        return c.json({ user });
      } catch (err) {
        return handleAdminActionError(err, c);
      }
    },
  )

  // POST /admin/users/:id/soft-delete
  .post("/users/:id/soft-delete", async (c) => {
    const targetId = c.req.param("id");

    try {
      await softDeleteUser(c.get("userId"), targetId);
      return c.json({ success: true });
    } catch (err) {
      return handleAdminActionError(err, c);
    }
  })

  // POST /admin/users/:id/restore
  .post("/users/:id/restore", async (c) => {
    const targetId = c.req.param("id");

    try {
      const user = await restoreUser(c.get("userId"), targetId);
      return c.json({ user });
    } catch (err) {
      return handleAdminActionError(err, c);
    }
  })

  // PATCH /admin/users/:id/plan-override
  .patch(
    "/users/:id/plan-override",
    zValidator(
      "json",
      z.object({
        planOverride: z.enum(["FREE", "PRO", "MAX"]).nullable(),
        note: z.string().optional(),
      }),
    ),
    async (c) => {
      const targetId = c.req.param("id");
      const { planOverride, note } = c.req.valid("json");

      try {
        const user =
          planOverride === null
            ? await clearPlanOverride(c.get("userId"), targetId)
            : await setPlanOverride(c.get("userId"), targetId, planOverride, note);
        return c.json({ user });
      } catch (err) {
        return handleAdminActionError(err, c);
      }
    },
  );
