"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- Types ---

interface PlanDistribution {
  plan: string;
  count: number;
  percentage: number;
}

interface PlanChange {
  id: string;
  userId: string;
  userEmail: string;
  fromPlan: string;
  toPlan: string;
  source: string;
  createdAt: string;
  note: string | null;
}

interface ChangeTrendDay {
  date: string;
  upgrades: number;
  downgrades: number;
}

interface PlansSummary {
  totalChanges30d: number;
  upgrades30d: number;
  downgrades30d: number;
  netGrowth30d: number;
}

interface PlansData {
  distribution: PlanDistribution[];
  recentChanges: PlanChange[];
  changeTrend: ChangeTrendDay[];
  summary: PlansSummary;
}

// --- Helpers ---

/**
 * Mask email for privacy: show first 3 chars + ***@domain
 */
function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "***";
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const visible = local.slice(0, 3);
  return `${visible}***${domain}`;
}

/**
 * Format ISO date string to short display format (MM/DD).
 */
function formatShortDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length < 3) return isoDate;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

/**
 * Format ISO date string to readable format (YYYY/MM/DD HH:mm).
 */
function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${h}:${min}`;
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "var(--chart-3)",
  PRO: "var(--chart-1)",
  MAX: "var(--chart-5)",
};

const SOURCE_LABELS: Record<string, string> = {
  STRIPE_WEBHOOK: "Stripe",
  ADMIN_OVERRIDE: "Admin",
  BACKFILL: "Backfill",
};

// --- Chart config ---

const trendChartConfig: ChartConfig = {
  upgrades: {
    label: "アップグレード",
    color: "var(--chart-1)",
  },
  downgrades: {
    label: "ダウングレード",
    color: "var(--chart-2)",
  },
};

// --- Component ---

export function PlansClient() {
  const [data, setData] = useState<PlansData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/plans");
        if (!res.ok) {
          setError(`データの読み込みに失敗しました (${res.status})`);
          return;
        }
        const json: PlansData = await res.json();
        setData(json);
      } catch {
        setError("データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-2">
                <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { distribution, recentChanges, changeTrend, summary } = data;
  const totalDistribution = distribution.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="プラン変更数"
          description="過去30日間"
          value={summary.totalChanges30d}
        />
        <KpiCard
          title="アップグレード"
          description="過去30日間"
          value={summary.upgrades30d}
          accent="green"
        />
        <KpiCard
          title="ダウングレード"
          description="過去30日間"
          value={summary.downgrades30d}
          accent="red"
        />
        <KpiCard
          title="純増減"
          description="過去30日間"
          value={summary.netGrowth30d}
          accent={summary.netGrowth30d >= 0 ? "green" : "red"}
          prefix={summary.netGrowth30d > 0 ? "+" : ""}
        />
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>プラン分布</CardTitle>
          <CardDescription>
            全 {totalDistribution} ユーザーのプラン内訳
          </CardDescription>
        </CardHeader>
        <CardContent>
          {distribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">ユーザーデータなし</p>
          ) : (
            <div className="space-y-3">
              {distribution.map((d) => (
                <div key={d.plan} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.plan}</span>
                    <span className="text-muted-foreground">
                      {d.count} 人 ({d.percentage}%)
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${d.percentage}%`,
                        backgroundColor: PLAN_COLORS[d.plan] ?? "var(--chart-4)",
                        minWidth: d.percentage > 0 ? "4px" : "0px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Changes Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>プラン変更推移</CardTitle>
          <CardDescription>過去30日間のアップグレード vs ダウングレード</CardDescription>
        </CardHeader>
        <CardContent>
          {changeTrend.every((d) => d.upgrades === 0 && d.downgrades === 0) ? (
            <p className="text-sm text-muted-foreground">過去30日間のプラン変更なし</p>
          ) : (
            <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
              <BarChart data={changeTrend} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatShortDate}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="upgrades"
                  fill="var(--color-upgrades)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="downgrades"
                  fill="var(--color-downgrades)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Plan Changes Table */}
      <Card>
        <CardHeader>
          <CardTitle>最近のプラン変更</CardTitle>
          <CardDescription>直近50件のプラン変更履歴</CardDescription>
        </CardHeader>
        <CardContent>
          {recentChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">プラン変更の記録なし</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">日時</th>
                    <th className="pb-2 pr-4 font-medium">ユーザー</th>
                    <th className="pb-2 pr-4 font-medium">変更</th>
                    <th className="pb-2 pr-4 font-medium">ソース</th>
                    <th className="pb-2 font-medium">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentChanges.map((change) => {
                    const fromRank = planRank(change.fromPlan);
                    const toRank = planRank(change.toPlan);
                    const isUpgrade = toRank > fromRank;

                    return (
                      <tr key={change.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {formatDateTime(change.createdAt)}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">
                          {maskEmail(change.userEmail)}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Badge variant="outline">{change.fromPlan}</Badge>
                            <span className={isUpgrade ? "text-green-600" : "text-red-600"}>
                              {isUpgrade ? "\u2191" : "\u2193"}
                            </span>
                            <Badge variant="outline">{change.toPlan}</Badge>
                          </span>
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <Badge variant="secondary">
                            {SOURCE_LABELS[change.source] ?? change.source}
                          </Badge>
                        </td>
                        <td className="py-2 max-w-[200px] truncate text-muted-foreground">
                          {change.note ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Sub-components ---

function KpiCard({
  title,
  description,
  value,
  accent,
  prefix = "",
}: {
  title: string;
  description: string;
  value: number;
  accent?: "green" | "red";
  prefix?: string;
}) {
  const accentClass =
    accent === "green"
      ? "text-green-600 dark:text-green-400"
      : accent === "red"
        ? "text-red-600 dark:text-red-400"
        : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accentClass}`}>
          {prefix}{value}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function planRank(plan: string): number {
  const ranks: Record<string, number> = { FREE: 0, PRO: 1, MAX: 2 };
  return ranks[plan] ?? -1;
}
