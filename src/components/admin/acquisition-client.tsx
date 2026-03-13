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
    label: "Page Views",
    color: "var(--chart-1)",
  },
  uniqueVisitors: {
    label: "Unique Visitors",
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
          title="Total Page Views (30d)"
          value={data?.pageViews.total}
          loading={loading}
        />
        <KPICard
          title="Unique Visitors (30d)"
          value={data?.pageViews.uniqueVisitors}
          loading={loading}
        />
        <KPICard
          title="Today's Page Views"
          value={data?.pageViews.today}
          loading={loading}
        />
        <KPICard
          title="Today's Unique Visitors"
          value={data?.pageViews.todayUnique}
          loading={loading}
        />
      </div>

      {/* Page View Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Page View Trend</CardTitle>
          <CardDescription>Daily page views and unique visitors (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (data?.pageViewTrend.length ?? 0) === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
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
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most viewed pages (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (data?.topPages.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-start py-2 font-medium">Path</th>
                      <th className="text-end py-2 font-medium">Views</th>
                      <th className="text-end py-2 font-medium">Unique</th>
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
            <CardTitle>Country Breakdown</CardTitle>
            <CardDescription>Page views by country (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (data?.countryBreakdown.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-start py-2 font-medium">Country</th>
                      <th className="text-end py-2 font-medium">Views</th>
                      <th className="text-end py-2 font-medium">Unique</th>
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
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            Pricing page visitors to paid conversions (last 30 days, 7-day attribution window)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !funnel ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-4">
              <FunnelStage
                label="Pricing Visitors"
                count={funnel.pricingVisitors}
                maxValue={maxFunnelValue}
                color="var(--chart-1)"
              />
              <FunnelStage
                label="Attributed Signups"
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
                label="Paid Conversions"
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
