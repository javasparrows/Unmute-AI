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

// --- Types ---

interface AcquisitionData {
  pageViews: {
    total: number;
    uniqueVisitors: number;
    today: number;
    todayUnique: number;
  };
  pageViewTrend: Array<{
    date: string;
    views: number;
    uniqueVisitors: number;
  }>;
  topPages: Array<{
    path: string;
    views: number;
    uniqueVisitors: number;
  }>;
  countryBreakdown: Array<{
    country: string;
    views: number;
    uniqueVisitors: number;
  }>;
  conversionFunnel: {
    pricingVisitors: number;
    attributedSignups: number;
    paidConversions: number;
  };
}

// --- Chart config ---

const trendChartConfig: ChartConfig = {
  views: {
    label: "PV数",
    color: "var(--chart-1)",
  },
  uniqueVisitors: {
    label: "ユニーク訪問者",
    color: "var(--chart-2)",
  },
};

// --- Component ---

export function AcquisitionClient() {
  const [data, setData] = useState<AcquisitionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/acquisition");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const funnel = data?.conversionFunnel;
  const maxFunnelValue = funnel
    ? Math.max(funnel.pricingVisitors, funnel.attributedSignups, funnel.paidConversions, 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="総PV数 (30日)"
          value={data?.pageViews.total}
          loading={loading}
        />
        <KPICard
          title="ユニーク訪問者 (30日)"
          value={data?.pageViews.uniqueVisitors}
          loading={loading}
        />
        <KPICard
          title="本日のPV数"
          value={data?.pageViews.today}
          loading={loading}
        />
        <KPICard
          title="本日のユニーク訪問者"
          value={data?.pageViews.todayUnique}
          loading={loading}
        />
      </div>

      {/* Page View Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>PV推移</CardTitle>
          <CardDescription>日別PV数とユニーク訪問者数（過去30日間）</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              読み込み中...
            </div>
          ) : (data?.pageViewTrend.length ?? 0) === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              データなし
            </div>
          ) : (
            <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
              <BarChart data={data?.pageViewTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.slice(5)} // "MM-DD"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="views"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="uniqueVisitors"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Two-column layout: Top Pages + Country Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages Table */}
        <Card>
          <CardHeader>
            <CardTitle>人気ページ</CardTitle>
            <CardDescription>閲覧数の多いページ（過去30日間）</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            ) : (data?.topPages.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">データなし</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-start py-2 font-medium">パス</th>
                      <th className="text-end py-2 font-medium">PV</th>
                      <th className="text-end py-2 font-medium">ユニーク</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.topPages.map((page) => (
                      <tr key={page.path} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs">{page.path}</td>
                        <td className="text-end py-2">
                          {page.views.toLocaleString()}
                        </td>
                        <td className="text-end py-2">
                          {page.uniqueVisitors.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Country Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>国別内訳</CardTitle>
            <CardDescription>国別PV数（過去30日間）</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            ) : (data?.countryBreakdown.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">データなし</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-start py-2 font-medium">国</th>
                      <th className="text-end py-2 font-medium">PV</th>
                      <th className="text-end py-2 font-medium">ユニーク</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.countryBreakdown.map((row) => (
                      <tr key={row.country} className="border-b last:border-0">
                        <td className="py-2">{row.country}</td>
                        <td className="text-end py-2">
                          {row.views.toLocaleString()}
                        </td>
                        <td className="text-end py-2">
                          {row.uniqueVisitors.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>コンバージョンファネル</CardTitle>
          <CardDescription>
            料金ページ訪問者から有料転換まで（過去30日間、7日間アトリビューション）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : !funnel ? (
            <p className="text-sm text-muted-foreground">データなし</p>
          ) : (
            <div className="space-y-4">
              <FunnelStage
                label="料金ページ訪問者"
                count={funnel.pricingVisitors}
                maxValue={maxFunnelValue}
                color="var(--chart-1)"
              />
              <FunnelStage
                label="登録（アトリビューション）"
                count={funnel.attributedSignups}
                maxValue={maxFunnelValue}
                rate={
                  funnel.pricingVisitors > 0
                    ? (funnel.attributedSignups / funnel.pricingVisitors) * 100
                    : 0
                }
                color="var(--chart-2)"
              />
              <FunnelStage
                label="有料転換"
                count={funnel.paidConversions}
                maxValue={maxFunnelValue}
                rate={
                  funnel.attributedSignups > 0
                    ? (funnel.paidConversions / funnel.attributedSignups) * 100
                    : 0
                }
                color="var(--chart-3)"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Sub-components ---

function KPICard({
  title,
  value,
  loading,
}: {
  title: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">
          {loading ? "..." : (value ?? 0).toLocaleString()}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function FunnelStage({
  label,
  count,
  maxValue,
  rate,
  color,
}: {
  label: string;
  count: number;
  maxValue: number;
  rate?: number;
  color: string;
}) {
  const widthPercent = maxValue > 0 ? (count / maxValue) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count.toLocaleString()}
          {rate !== undefined && (
            <span className="ml-2 text-xs">({rate.toFixed(1)}%)</span>
          )}
        </span>
      </div>
      <div className="h-8 w-full rounded bg-muted overflow-hidden">
        <div
          className="h-full rounded transition-all duration-500"
          style={{
            width: `${Math.max(widthPercent, 1)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
