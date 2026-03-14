import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Nightly cron job for PageView data retention.
 *
 * 1. Aggregates raw PageView records older than 48 hours into PageViewDaily.
 * 2. Deletes raw PageView records older than 31 days.
 *
 * Triggered by Vercel Cron at UTC 18:00 (JST 03:00).
 * Requires CRON_SECRET env var to be set on Vercel.
 */

const HOURS_48_MS = 48 * 60 * 60 * 1000;
const DAYS_31_MS = 31 * 24 * 60 * 60 * 1000;

interface RollupRow {
  date: string;
  path: string;
  locale: string;
  countryCode: string;
  views: number;
  uniqueVisitors: number;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Keep last 48 hours of raw data untouched
  const cutoffForRollup = new Date(now.getTime() - HOURS_48_MS);

  // Delete raw records older than 31 days
  const deleteThreshold = new Date(now.getTime() - DAYS_31_MS);

  // 1. Aggregate raw PageView records older than 48h
  //    Group by JST date, path, locale, countryCode
  //    Coalesce nulls to empty string to match PageViewDaily schema
  const rollupData = await prisma.$queryRaw<RollupRow[]>`
    SELECT
      TO_CHAR(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD') AS date,
      path,
      COALESCE(locale, '') AS locale,
      COALESCE("countryCode", '') AS "countryCode",
      COUNT(*)::int AS views,
      COUNT(DISTINCT "visitorId")::int AS "uniqueVisitors"
    FROM "PageView"
    WHERE "createdAt" < ${cutoffForRollup}
    GROUP BY date, path, locale, "countryCode"
  `;

  // 2. Upsert each aggregated row into PageViewDaily
  //    Use raw SQL ON CONFLICT for atomic upsert (handles re-runs safely)
  let upsertCount = 0;
  for (const row of rollupData) {
    const dateValue = new Date(row.date + "T00:00:00.000Z");
    const id = generateId();

    await prisma.$executeRaw`
      INSERT INTO "PageViewDaily" (id, date, path, locale, "countryCode", views, "uniqueVisitors", "createdAt")
      VALUES (${id}, ${dateValue}, ${row.path}, ${row.locale}, ${row.countryCode}, ${row.views}, ${row.uniqueVisitors}, NOW())
      ON CONFLICT (date, path, locale, "countryCode")
      DO UPDATE SET views = EXCLUDED.views, "uniqueVisitors" = EXCLUDED."uniqueVisitors"
    `;
    upsertCount++;
  }

  // 3. Delete raw PageView records older than 31 days
  const deleted = await prisma.pageView.deleteMany({
    where: { createdAt: { lt: deleteThreshold } },
  });

  return NextResponse.json({
    success: true,
    rolledUp: upsertCount,
    deletedRaw: deleted.count,
    cutoffForRollup: cutoffForRollup.toISOString(),
    deleteThreshold: deleteThreshold.toISOString(),
    executedAt: now.toISOString(),
  });
}

/**
 * Generate a unique ID for raw SQL inserts.
 * Uses timestamp + random chars for uniqueness.
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `pvd_${timestamp}${random}`;
}
