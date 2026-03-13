import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Build a JST-aware "start of today" in UTC.
 * JST = UTC+9, so we compute today's date in JST then convert back to UTC.
 */
function getJSTStartOfToday(): Date {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const startOfDayJST = new Date(
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()),
  );
  return new Date(startOfDayJST.getTime() - JST_OFFSET_MS);
}

/**
 * Format a UTC Date as a JST date string "YYYY-MM-DD".
 */
function toJSTDateString(date: Date): string {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Generate all date strings (JST) between two dates, inclusive.
 */
function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(toJSTDateString(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfTodayUTC = getJSTStartOfToday();

  // Fetch all page views for last 30 days in one query
  const pageViews = await prisma.pageView.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: {
      visitorId: true,
      userId: true,
      path: true,
      countryCode: true,
      createdAt: true,
    },
  });

  // --- KPI: totals ---
  const total = pageViews.length;
  const uniqueVisitorSet = new Set(pageViews.map((pv) => pv.visitorId));
  const uniqueVisitors = uniqueVisitorSet.size;

  const todayViews = pageViews.filter((pv) => pv.createdAt >= startOfTodayUTC);
  const today = todayViews.length;
  const todayUniqueSet = new Set(todayViews.map((pv) => pv.visitorId));
  const todayUnique = todayUniqueSet.size;

  // --- Page View Trend (last 30 days, grouped by JST date) ---
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

  // Fill zero days
  const allDates = generateDateRange(thirtyDaysAgo, now);
  const pageViewTrend = allDates.map((date) => {
    const entry = trendMap.get(date);
    return {
      date,
      views: entry?.views ?? 0,
      uniqueVisitors: entry?.visitors.size ?? 0,
    };
  });

  // --- Top Pages (top 10 by views) ---
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

  // --- Country Breakdown (top 10 by views) ---
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

  // --- Conversion Funnel ---
  // Step 1: Distinct visitorIds that visited /pricing
  const pricingVisitorIds = new Set<string>();
  for (const pv of pageViews) {
    if (pv.path === "/pricing") {
      pricingVisitorIds.add(pv.visitorId);
    }
  }
  const pricingVisitors = pricingVisitorIds.size;

  // Step 2: Of those pricing visitors, find ones that later have a userId
  // (visitor became an identified user = attributed signup)
  const attributedUserIds = new Set<string>();
  for (const pv of pageViews) {
    if (pv.userId && pricingVisitorIds.has(pv.visitorId)) {
      attributedUserIds.add(pv.userId);
    }
  }
  const attributedSignups = attributedUserIds.size;

  // Step 3: Of those userIds, find ones with PlanChangeLog FREE -> PRO/MAX
  // within 7 days of their first userId appearance in PageView
  let paidConversions = 0;

  if (attributedUserIds.size > 0) {
    // Find the first userId appearance date for each attributed user
    const firstAppearance = new Map<string, Date>();
    for (const pv of pageViews) {
      if (pv.userId && attributedUserIds.has(pv.userId)) {
        const existing = firstAppearance.get(pv.userId);
        if (!existing || pv.createdAt < existing) {
          firstAppearance.set(pv.userId, pv.createdAt);
        }
      }
    }

    // Query PlanChangeLog for these users
    const planChanges = await prisma.planChangeLog.findMany({
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

    // Count users with a plan change within 7 days of first appearance
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
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

  return NextResponse.json({
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
}
