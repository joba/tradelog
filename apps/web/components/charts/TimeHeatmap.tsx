"use client";

import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/lib/queries";
import { DOW_LABELS, fmtHour, fmtCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardBody, Spinner, EmptyState } from "@/components/ui";

function HeatCell({ value, max, label, subLabel }: {
  value: number; max: number; label: string; subLabel: string;
}) {
  const intensity = max > 0 ? Math.abs(value) / max : 0;
  const isPositive = value >= 0;
  const bg = isPositive
    ? `rgba(0, 200, 150, ${intensity * 0.6 + 0.04})`
    : `rgba(255, 75, 110, ${intensity * 0.6 + 0.04})`;

  return (
    <div
      className="flex flex-col items-center justify-center p-2 rounded-sm border border-terminal-border/50 cursor-default transition-all hover:scale-105 hover:border-terminal-border"
      style={{ background: bg, minHeight: 56 }}
      title={`${label}: ${subLabel}`}
    >
      <div className="text-[9px] text-terminal-dim tracking-wider">{label}</div>
      <div className={`text-xs font-medium tabular-nums mt-0.5 ${isPositive ? "text-profit" : "text-loss"}`}>
        {fmtCurrency(value)}
      </div>
    </div>
  );
}

export default function TimeHeatmap({ filters }: { filters?: Record<string, string> }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-time", filters],
    queryFn: () => statsApi.byTime(filters).then((r) => r.data),
  });

  const maxDow = Math.max(...(data?.byDayOfWeek.map((d) => Math.abs(d.avgPnl)) || [1]));
  const maxHour = Math.max(...(data?.byHourOfDay.map((d) => Math.abs(d.avgPnl)) || [1]));

  return (
    <div className="space-y-4">
      {/* Day of week */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>By Day of Week</CardTitle>
          <span className="text-[10px] text-terminal-dim">avg P&L per day</span>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !data?.byDayOfWeek.some((d) => d.totalTrades > 0) ? (
            <EmptyState title="No data yet" />
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {data?.byDayOfWeek.map((d) => (
                <HeatCell
                  key={d.key}
                  value={d.avgPnl}
                  max={maxDow}
                  label={DOW_LABELS[d.key]}
                  subLabel={`${d.totalTrades} trades, ${d.winRate}% WR`}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Hour of day — market hours 9–16 */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>By Hour of Day</CardTitle>
          <span className="text-[10px] text-terminal-dim">avg P&L per hour</span>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !data?.byHourOfDay.some((d) => d.totalTrades > 0) ? (
            <EmptyState title="No data yet" />
          ) : (
            <div className="grid grid-cols-8 gap-1.5">
              {data?.byHourOfDay.filter((d) => d.key >= 9 && d.key <= 16).map((d) => (
                <HeatCell
                  key={d.key}
                  value={d.avgPnl}
                  max={maxHour}
                  label={fmtHour(d.key)}
                  subLabel={`${d.totalTrades} trades, ${d.winRate}% WR`}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
