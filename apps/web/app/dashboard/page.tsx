"use client";

import { useQuery } from "@tanstack/react-query";
import { statsApi, tradesApi } from "@/lib/queries";
import { fmtCurrency, fmtPercent } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import EquityCurve from "@/components/charts/EquityCurve";
import TradeRow from "@/components/trades/TradeRow";
import {
  StatCell,
  Card,
  CardHeader,
  CardTitle,
  Spinner,
  EmptyState,
  Badge,
  Button,
} from "@/components/ui";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react";

function SummaryStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: () => statsApi.summary().then((r) => r.data),
  });

  if (isLoading)
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-terminal-surface border border-terminal-border rounded-sm animate-pulse"
          />
        ))}
      </div>
    );

  if (!data || data.totalTrades === 0)
    return (
      <div className="bg-terminal-surface border border-terminal-border rounded-sm px-5 py-4 text-sm text-terminal-dim">
        No closed trades yet —{" "}
        <Link href="/log-trade" className="text-accent underline">
          log your first trade
        </Link>
      </div>
    );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
      <StatCell
        label="Total P&L"
        value={fmtCurrency(data.totalPnl)}
        valueClass={
          data.totalPnl >= 0 ? "text-profit glow-profit" : "text-loss glow-loss"
        }
        className="animate-fade-in"
      />
      <StatCell
        label="Win Rate"
        value={`${data.winRate}%`}
        valueClass={data.winRate >= 50 ? "text-profit" : "text-loss"}
        className="animate-fade-in"
      />
      <StatCell
        label="Total Trades"
        value={data.totalTrades}
        valueClass="text-terminal-bright"
        className="animate-fade-in"
      />
      <StatCell
        label="Profit Factor"
        value={data.profitFactor !== null ? data.profitFactor.toFixed(2) : "—"}
        valueClass={
          data.profitFactor && data.profitFactor >= 1
            ? "text-profit"
            : "text-loss"
        }
        className="animate-fade-in"
      />
      <StatCell
        label="Avg Win"
        value={fmtCurrency(data.avgWin)}
        valueClass="text-profit"
        className="animate-fade-in"
      />
      <StatCell
        label="Avg Loss"
        value={fmtCurrency(data.avgLoss)}
        valueClass="text-loss"
        className="animate-fade-in"
      />
      <StatCell
        label="Win Streak"
        value={`${data.maxWinStreak}W`}
        valueClass="text-profit"
        className="animate-fade-in"
      />
      <StatCell
        label="Loss Streak"
        value={`${data.maxLossStreak}L`}
        valueClass="text-loss"
        className="animate-fade-in"
      />
    </div>
  );
}

function RecentTrades() {
  const { data, isLoading } = useQuery({
    queryKey: ["trades", { limit: 5, sort: "entryAt", order: "desc" }],
    queryFn: () =>
      tradesApi
        .list({ limit: 5, sort: "entryAt", order: "desc" })
        .then((r) => r.data),
  });

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Recent Trades</CardTitle>
        <Link href="/trades">
          <Button variant="ghost" className="text-[10px]">
            View All ›
          </Button>
        </Link>
      </CardHeader>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : !data?.data.length ? (
        <EmptyState
          title="No trades logged yet"
          description="Start tracking your trades"
          action={
            <Link href="/log-trade">
              <Button>Log Trade</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-border">
                <th className="px-3 py-2 w-4" />
                {[
                  "Ticker",
                  "Dir",
                  "Type",
                  "Entry",
                  "Entry",
                  "Exit",
                  "P&L",
                  "Result",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[10px] tracking-widest uppercase text-terminal-dim font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data.map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between animate-fade-in">
          <div>
            <div className="text-[10px] text-terminal-dim tracking-widest uppercase mb-1">
              {new Date().toLocaleDateString("sv-SE", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <h1 className="text-xl font-semibold text-terminal-bright tracking-wide">
              {user?.name
                ? `${user.name.split(" ")[0]}'s Dashboard`
                : "Dashboard"}
            </h1>
          </div>
          <Link href="/log-trade">
            <Button className="tracking-wide">+ Log Trade</Button>
          </Link>
        </div>

        {/* Stats grid */}
        <SummaryStats />

        {/* Equity curve */}
        <EquityCurve />

        {/* Recent trades */}
        <RecentTrades />
      </div>
    </AppLayout>
  );
}
