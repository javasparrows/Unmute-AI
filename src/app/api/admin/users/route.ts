import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Run queries in parallel for efficiency
  const [
    users,
    documentCounts,
    tokenTotals,
    lastApiUsage,
    lastPageViews,
    lastLoginDevices,
  ] = await Promise.all([
    // All users
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        planOverride: true,
        subscriptionStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),

    // Document counts per user
    prisma.document.groupBy({
      by: ["userId"],
      _count: true,
    }),

    // Token totals per user (sum of input + output)
    prisma.apiUsageLog.groupBy({
      by: ["userId"],
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
    }),

    // Last API usage per user
    prisma.apiUsageLog.groupBy({
      by: ["userId"],
      _max: { createdAt: true },
    }),

    // Last page view per user
    prisma.pageView.groupBy({
      by: ["userId"],
      _max: { createdAt: true },
    }),

    // Last login device activity per user
    prisma.loginDevice.groupBy({
      by: ["userId"],
      _max: { lastSeenAt: true },
    }),
  ]);

  // Build lookup maps
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

  // Build last active map from multiple sources (API usage, page views, login devices)
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

  // Merge data
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
    };
  });

  return NextResponse.json({
    users: rows,
    total: rows.length,
  });
}
