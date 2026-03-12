import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateCost,
  getTimeWindow,
  getBucketKey,
  type Granularity,
} from "@/lib/analytics";

const VALID_GRANULARITIES = new Set<Granularity>([
  "hour",
  "day",
  "week",
  "month",
]);

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const granularity = (request.nextUrl.searchParams.get("granularity") ??
    "day") as Granularity;
  if (!VALID_GRANULARITIES.has(granularity)) {
    return NextResponse.json(
      { error: "Invalid granularity" },
      { status: 400 },
    );
  }

  const since = getTimeWindow(granularity);

  const logs = await prisma.apiUsageLog.findMany({
    where: {
      userId: session.user.id,
      createdAt: { gte: since },
    },
    select: {
      model: true,
      inputTokens: true,
      outputTokens: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Aggregate by model
  const modelMap = new Map<
    string,
    {
      cost: number;
      requests: number;
      inputTokens: number;
      outputTokens: number;
      lastUsed: Date;
    }
  >();

  // Aggregate by time bucket
  const bucketMap = new Map<string, Record<string, number>>();

  for (const log of logs) {
    const cost = calculateCost(log.model, log.inputTokens, log.outputTokens);

    // Model aggregation
    const existing = modelMap.get(log.model);
    if (existing) {
      existing.cost += cost;
      existing.requests += 1;
      existing.inputTokens += log.inputTokens;
      existing.outputTokens += log.outputTokens;
      existing.lastUsed = log.createdAt;
    } else {
      modelMap.set(log.model, {
        cost,
        requests: 1,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        lastUsed: log.createdAt,
      });
    }

    // Time bucket aggregation
    const bucketKey = getBucketKey(log.createdAt, granularity);
    const bucket = bucketMap.get(bucketKey) ?? {};
    bucket[log.model] = (bucket[log.model] ?? 0) + cost;
    bucketMap.set(bucketKey, bucket);
  }

  // Calculate totals
  let totalCost = 0;
  const models = Array.from(modelMap.entries())
    .map(([model, data]) => {
      totalCost += data.cost;
      return {
        model,
        cost_usd: data.cost,
        request_count: data.requests,
        input_tokens: data.inputTokens,
        output_tokens: data.outputTokens,
        last_used_at: data.lastUsed.toISOString(),
      };
    })
    .sort((a, b) => b.cost_usd - a.cost_usd);

  // Add share_percent
  const modelsWithShare = models.map((m) => ({
    ...m,
    share_percent: totalCost > 0 ? (m.cost_usd / totalCost) * 100 : 0,
  }));

  // Top model
  const topModel =
    modelsWithShare.length > 0
      ? {
          name: modelsWithShare[0].model,
          cost_usd: modelsWithShare[0].cost_usd,
          share_percent: modelsWithShare[0].share_percent,
        }
      : null;

  // Chart data
  const chart = Array.from(bucketMap.entries()).map(([key, values]) => ({
    bucket_label: key,
    total_cost_usd: Object.values(values).reduce((sum, v) => sum + v, 0),
    values,
  }));

  return NextResponse.json({
    summary: {
      total_cost_usd: totalCost,
      top_model: topModel,
      granularity,
    },
    chart,
    models: modelsWithShare,
  });
}
