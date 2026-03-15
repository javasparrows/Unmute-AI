"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
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
import { Link } from "@/i18n/navigation";

interface KPIs {
  totalUsers: number;
  signupsToday: number;
  signupsThisWeek: number;
  activeUsersToday: number;
  totalTokensToday: number;
  totalCostToday: number;
}

interface SignupTrendPoint {
  date: string;
  count: number;
}

interface PlanDistributionItem {
  plan: string;
  count: number;
}

interface TokenTrendPoint {
  date: string;
  tokens: number;
  cost: number;
}

interface OverviewData {
  kpis: KPIs;
  signupTrend: SignupTrendPoint[];
  planDistribution: PlanDistributionItem[];
  tokenTrend: TokenTrendPoint[];
}

const signupChartConfig: ChartConfig = {
  count: {
    label: "登録数",
    color: "var(--chart-1)",
  },
};

const tokenChartConfig: ChartConfig = {
  tokens: {
    label: "トークン",
    color: "var(--chart-2)",
  },
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "var(--chart-1)",
  PRO: "var(--chart-2)",
  MAX: "var(--chart-3)",
};

export function OverviewClient() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="rounded-lg border p-6">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  const totalPlanUsers =
    data?.planDistribution.reduce((sum, item) => sum + item.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPICard
          title="総ユーザー数"
          value={loading ? "..." : data?.kpis.totalUsers.toLocaleString() ?? "0"}
          href="/admin/users"
        />
        <KPICard
          title="本日の登録数"
          value={loading ? "..." : String(data?.kpis.signupsToday ?? 0)}
          subtitle={
            loading
              ? undefined
              : `今週 ${data?.kpis.signupsThisWeek ?? 0} 件`
          }
        />
        <KPICard
          title="本日のアクティブ"
          value={loading ? "..." : String(data?.kpis.activeUsersToday ?? 0)}
        />
        <KPICard
          title="本日のトークン数"
          value={
            loading
              ? "..."
              : (data?.kpis.totalTokensToday ?? 0).toLocaleString()
          }
        />
        <KPICard
          title="本日の推定コスト"
          value={
            loading
              ? "..."
              : `$${(data?.kpis.totalCostToday ?? 0).toFixed(4)}`
          }
        />
      </div>

      {/* Signup Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>登録推移</CardTitle>
          <CardDescription>過去30日間の新規登録数</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              読み込み中...
            </div>
          ) : (data?.signupTrend.length ?? 0) === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              データなし
            </div>
          ) : (
            <ChartContainer config={signupChartConfig} className="h-[300px] w-full">
              <BarChart data={data?.signupTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>プラン分布</CardTitle>
          <CardDescription>有効プラン別ユーザー数</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : (data?.planDistribution.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">データなし</p>
          ) : (
            <div className="space-y-3">
              {data?.planDistribution.map((item) => {
                const percentage =
                  totalPlanUsers > 0
                    ? ((item.count / totalPlanUsers) * 100).toFixed(1)
                    : "0";
                return (
                  <div key={item.plan} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.plan}</span>
                      <span className="text-muted-foreground">
                        {item.count.toLocaleString()} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${totalPlanUsers > 0 ? (item.count / totalPlanUsers) * 100 : 0}%`,
                          backgroundColor:
                            PLAN_COLORS[item.plan] ?? "var(--chart-4)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Usage Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>トークン使用推移</CardTitle>
          <CardDescription>
            過去30日間の総トークン消費量
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              読み込み中...
            </div>
          ) : (data?.tokenTrend.length ?? 0) === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              データなし
            </div>
          ) : (
            <ChartContainer config={tokenChartConfig} className="h-[300px] w-full">
              <BarChart data={data?.tokenTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => {
                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                    return String(v);
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="tokens"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  href,
}: {
  title: string;
  value: string;
  subtitle?: string;
  href?: string;
}) {
  const card = (
    <Card className={href ? "cursor-pointer transition-colors hover:bg-muted/50" : undefined}>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {subtitle && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </CardContent>
      )}
    </Card>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }
  return card;
}
