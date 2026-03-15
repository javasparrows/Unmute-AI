"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Granularity = "hour" | "day" | "week" | "month";

interface ModelData {
  model: string;
  cost_usd: number;
  share_percent: number;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  last_used_at: string;
}

interface ChartPoint {
  bucket_label: string;
  total_cost_usd: number;
  values: Record<string, number>;
}

interface AnalyticsData {
  summary: {
    total_cost_usd: number;
    top_model: {
      name: string;
      cost_usd: number;
      share_percent: number;
    } | null;
    granularity: Granularity;
  };
  chart: ChartPoint[];
  models: ModelData[];
}

const GRANULARITY_KEYS: Granularity[] = ["hour", "day", "week", "month"];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function AnalyticsClient() {
  const t = useTranslations("analytics");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const granularityOptions: { value: Granularity; label: string }[] =
    GRANULARITY_KEYS.map((key) => ({
      value: key,
      label: t(`granularity.${key}`),
    }));

  const fetchData = useCallback(async (g: Granularity) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/analytics/model-costs?granularity=${g}`);
      const json = await res.json();
      setData(json);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(granularity);
  }, [granularity, fetchData]);

  // Build chart config from model names
  const modelNames = data?.models.map((m) => m.model) ?? [];
  const chartConfig: ChartConfig = {};
  modelNames.forEach((name, i) => {
    chartConfig[name] = {
      label: name,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });

  // Transform chart data for Recharts stacked bar
  const chartData = (data?.chart ?? []).map((point) => ({
    name: point.bucket_label,
    ...point.values,
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("periodTotal")}</CardDescription>
            <CardTitle className="text-2xl">
              {loading
                ? "..."
                : `$${(data?.summary.total_cost_usd ?? 0).toFixed(4)}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("topModel")}</CardDescription>
            <CardTitle className="text-2xl">
              {loading
                ? "..."
                : data?.summary.top_model
                  ? data.summary.top_model.name
                  : t("noData")}
            </CardTitle>
          </CardHeader>
          {data?.summary.top_model && (
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                ${data.summary.top_model.cost_usd.toFixed(4)} (
                {data.summary.top_model.share_percent.toFixed(0)}%)
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("costTrend")}</CardTitle>
              <CardDescription>
                {t("costTrendDescription")}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {granularityOptions.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={granularity === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGranularity(value)}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              {t("loading")}
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              {t("noDataForPeriod")}
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {modelNames.map((model, i) => (
                  <Bar
                    key={model}
                    dataKey={model}
                    stackId="cost"
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    radius={
                      i === modelNames.length - 1
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Model breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("modelBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (data?.models.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-start py-2 font-medium">{t("tableHeaders.model")}</th>
                    <th className="text-end py-2 font-medium">{t("tableHeaders.estimatedCost")}</th>
                    <th className="text-end py-2 font-medium">{t("tableHeaders.share")}</th>
                    <th className="text-end py-2 font-medium hidden sm:table-cell">
                      {t("tableHeaders.requests")}
                    </th>
                    <th className="text-end py-2 font-medium hidden md:table-cell">
                      {t("tableHeaders.inputTokens")}
                    </th>
                    <th className="text-end py-2 font-medium hidden md:table-cell">
                      {t("tableHeaders.outputTokens")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.models.map((m, i) => (
                    <tr
                      key={m.model}
                      className={cn(
                        "border-b last:border-0",
                        i === 0 && "font-medium",
                      )}
                    >
                      <td className="py-2">{m.model}</td>
                      <td className="text-end py-2">
                        ${m.cost_usd.toFixed(4)}
                      </td>
                      <td className="text-end py-2">
                        {m.share_percent.toFixed(1)}%
                      </td>
                      <td className="text-end py-2 hidden sm:table-cell">
                        {m.request_count.toLocaleString()}
                      </td>
                      <td className="text-end py-2 hidden md:table-cell">
                        {m.input_tokens.toLocaleString()}
                      </td>
                      <td className="text-end py-2 hidden md:table-cell">
                        {m.output_tokens.toLocaleString()}
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
  );
}
