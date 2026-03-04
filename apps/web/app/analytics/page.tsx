"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/lib/queries";
import AppLayout from "@/components/layout/AppLayout";
import TimeHeatmap from "@/components/charts/TimeHeatmap";
import EquityCurve from "@/components/charts/EquityCurve";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Select,
  Input,
  Spinner,
  EmptyState,
  Badge,
} from "@/components/ui";
import { fmtCurrency, fmtPercent } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

function TickerBar({ filters }: { filters: Record<string, string> }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-ticker", filters],
    queryFn: () => statsApi.byTicker(filters).then((r) => r.data),
  });

  const chartData =
    data?.slice(0, 10).map((t) => ({
      ticker: t.ticker,
      pnl: t.totalPnl,
      winRate: t.winRate,
    })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>P&L by Ticker</CardTitle>
        <span className="text-[10px] text-terminal-dim">top 10</span>
      </CardHeader>
      <CardBody className="p-0 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : !chartData.length ? (
          <EmptyState title="No ticker data" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="ticker"
                tick={{
                  fill: "#5a6a82",
                  fontSize: 9,
                  fontFamily: "IBM Plex Mono",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fill: "#5a6a82",
                  fontSize: 9,
                  fontFamily: "IBM Plex Mono",
                }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v) =>
                  `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`
                }
              />
              <Tooltip
                contentStyle={{
                  background: "#0f1217",
                  border: "1px solid #1c2230",
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono",
                }}
                formatter={(v: number) => [fmtCurrency(v), "P&L"]}
              />
              <ReferenceLine y={0} stroke="#1c2230" />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                {chartData.map((d) => (
                  <Cell
                    key={d.ticker}
                    fill={d.pnl >= 0 ? "#00c896" : "#ff4b6e"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}

function TickerTable({ filters }: { filters: Record<string, string> }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-ticker", filters],
    queryFn: () => statsApi.byTicker(filters).then((r) => r.data),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticker Breakdown</CardTitle>
      </CardHeader>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : !data?.length ? (
        <EmptyState title="No ticker data" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-border">
                {[
                  "Ticker",
                  "Trades",
                  "Win Rate",
                  "Total P&L",
                  "Avg P&L",
                  "Avg R:R",
                  "Fees",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-[10px] tracking-widest uppercase text-terminal-dim font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.ticker} className="trade-row">
                  <td className="px-4 py-2.5 font-semibold text-terminal-bright tracking-wider">
                    {t.ticker}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-terminal-dim">
                    {t.totalTrades}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    <span
                      className={t.winRate >= 50 ? "text-profit" : "text-loss"}
                    >
                      {t.winRate}%
                    </span>
                  </td>
                  <td
                    className={`px-4 py-2.5 tabular-nums font-medium ${t.totalPnl >= 0 ? "text-profit" : "text-loss"}`}
                  >
                    {fmtCurrency(t.totalPnl)}
                  </td>
                  <td
                    className={`px-4 py-2.5 tabular-nums ${t.avgPnl >= 0 ? "text-profit" : "text-loss"}`}
                  >
                    {fmtCurrency(t.avgPnl)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-terminal-dim">
                    {t.avgRR !== null ? `${t.avgRR}R` : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-terminal-dim">
                    {fmtCurrency(t.totalFees)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function TagTable({ filters }: { filters: Record<string, string> }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-tag", filters],
    queryFn: () => statsApi.byTag(filters).then((r) => r.data),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>By Strategy / Tag</CardTitle>
      </CardHeader>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : !data?.length ? (
        <EmptyState
          title="No tagged trades"
          description="Add tags when logging trades to see breakdowns by strategy or sector"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-border">
                {[
                  "Tag",
                  "Trades",
                  "Win Rate",
                  "Total P&L",
                  "Avg P&L",
                  "Avg R:R",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-[10px] tracking-widest uppercase text-terminal-dim font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.tagId} className="trade-row">
                  <td className="px-4 py-2.5">
                    <span
                      className="px-2 py-0.5 text-[10px] border rounded-sm"
                      style={{
                        borderColor: t.color ? `${t.color}40` : "#1c2230",
                        color: t.color || "#5a6a82",
                        background: t.color ? `${t.color}10` : "transparent",
                      }}
                    >
                      {t.tagName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-terminal-dim">
                    {t.totalTrades}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    <span
                      className={t.winRate >= 50 ? "text-profit" : "text-loss"}
                    >
                      {t.winRate}%
                    </span>
                  </td>
                  <td
                    className={`px-4 py-2.5 tabular-nums font-medium ${t.totalPnl >= 0 ? "text-profit" : "text-loss"}`}
                  >
                    {fmtCurrency(t.totalPnl)}
                  </td>
                  <td
                    className={`px-4 py-2.5 tabular-nums ${t.avgPnl >= 0 ? "text-profit" : "text-loss"}`}
                  >
                    {fmtCurrency(t.avgPnl)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-terminal-dim">
                    {t.avgRR !== null ? `${t.avgRR}R` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const setFilter = (key: string, val: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (val) next[key] = val;
      else delete next[key];
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between animate-fade-in">
          <div>
            <div className="text-[10px] text-terminal-dim tracking-widest uppercase mb-1">
              Performance
            </div>
            <h1 className="text-xl font-semibold text-terminal-bright tracking-wide">
              Analytics
            </h1>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select
              value={filters.tradeType || ""}
              onChange={(e) => setFilter("tradeType", e.target.value)}
              className="py-1.5 text-xs w-24"
            >
              <option value="">All Types</option>
              <option value="DAY">Day</option>
              <option value="SWING">Swing</option>
            </Select>
            <Input
              type="date"
              value={filters.from || ""}
              onChange={(e) => setFilter("from", e.target.value)}
              className="py-1.5 text-xs w-36"
            />
            <span className="text-terminal-dim text-xs">→</span>
            <Input
              type="date"
              value={filters.to || ""}
              onChange={(e) => setFilter("to", e.target.value)}
              className="py-1.5 text-xs w-36"
            />
          </div>
        </div>

        {/* Equity curve */}
        <EquityCurve filters={filters} />

        {/* Ticker charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
          <TickerBar filters={filters} />
          <TagTable filters={filters} />
        </div>

        {/* Ticker table */}
        <TickerTable filters={filters} />

        {/* Time heatmaps */}
        <div className="animate-fade-in">
          <div className="text-[10px] text-terminal-dim tracking-widest uppercase mb-3">
            Time Patterns
          </div>
          <TimeHeatmap filters={filters} />
        </div>
      </div>
    </AppLayout>
  );
}
