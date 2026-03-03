"use client";

import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/lib/queries";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Spinner,
  EmptyState,
} from "@/components/ui";

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { ticker: string; pnl: number } }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-terminal-bg border border-terminal-border rounded-sm px-3 py-2 text-xs">
      <div className="text-terminal-dim mb-1">{label}</div>
      <div className="text-terminal-bright">
        Cumulative:{" "}
        <span className={d.value >= 0 ? "text-profit" : "text-loss"}>
          {fmtCurrency(d.value)}
        </span>
      </div>
      <div className="text-terminal-dim">
        Trade P&L:{" "}
        <span className={d.payload.pnl >= 0 ? "text-profit" : "text-loss"}>
          {fmtCurrency(d.payload.pnl)}
        </span>
      </div>
      <div className="text-terminal-dim">
        Ticker: <span className="text-terminal-text">{d.payload.ticker}</span>
      </div>
    </div>
  );
}

export default function EquityCurve({
  filters,
}: {
  filters?: Record<string, string>;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["equity-curve", filters],
    queryFn: () => statsApi.equityCurve(filters).then((r) => r.data),
  });

  const chartData =
    data?.map((p) => ({
      date: fmtDate(p.date),
      cumulative: p.cumulative,
      pnl: p.pnl,
      ticker: p.ticker,
    })) || [];

  const isPositive = (data?.[data.length - 1]?.cumulative || 0) >= 0;
  const color = isPositive ? "#00c896" : "#ff4b6e";

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Equity Curve</CardTitle>
        {data?.length ? (
          <span
            className={`text-xs tabular-nums ${isPositive ? "text-profit" : "text-loss"}`}
          >
            {fmtCurrency(data[data.length - 1]?.cumulative)}
          </span>
        ) : null}
      </CardHeader>
      <CardBody className="p-0 pt-4 pb-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !data?.length ? (
          <EmptyState
            title="No trade history yet"
            description="Close some trades to see your equity curve"
          />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={chartData}
              margin={{ left: 0, right: 16, top: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{
                  fill: "#5a6a82",
                  fontSize: 9,
                  fontFamily: "IBM Plex Mono",
                }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{
                  fill: "#5a6a82",
                  fontSize: 9,
                  fontFamily: "IBM Plex Mono",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  `${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v} kr`
                }
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#1c2230" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={color}
                strokeWidth={1.5}
                fill="url(#equityGrad)"
                dot={false}
                activeDot={{
                  r: 3,
                  fill: color,
                  stroke: "#0a0c0f",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}
