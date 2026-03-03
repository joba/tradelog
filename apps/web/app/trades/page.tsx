"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tradesApi } from "@/lib/queries";
import AppLayout from "@/components/layout/AppLayout";
import TradeRow from "@/components/trades/TradeRow";
import { Card, CardHeader, CardTitle, Button, Select, Input, Spinner, EmptyState, Badge } from "@/components/ui";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { TradeFilters } from "@/lib/queries";

const COLS = ["", "Ticker", "Dir", "Type", "Entry Time", "Entry $", "Exit $", "P&L", "Result", ""];

export default function TradesPage() {
  const [filters, setFilters] = useState<TradeFilters>({ sort: "entryAt", order: "desc", page: 1, limit: 50 });
  const [showFilters, setShowFilters] = useState(false);
  const [tickerInput, setTickerInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["trades", filters],
    queryFn: () => tradesApi.list(filters).then((r) => r.data),
  });

  const setFilter = (key: keyof TradeFilters, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val || undefined, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ sort: "entryAt", order: "desc", page: 1, limit: 50 });
    setTickerInput("");
  };

  const activeFilterCount = [filters.status, filters.direction, filters.tradeType, filters.assetClass, filters.ticker, filters.from, filters.to]
    .filter(Boolean).length;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <div className="text-[10px] text-terminal-dim tracking-widest uppercase mb-1">Trade Log</div>
            <h1 className="text-xl font-semibold text-terminal-bright tracking-wide">All Trades</h1>
          </div>
          <Link href="/log-trade">
            <Button>+ Log Trade</Button>
          </Link>
        </div>

        {/* Filter bar */}
        <Card className="animate-fade-in">
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
            {/* Ticker search */}
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-terminal-dim" />
              <Input
                placeholder="Search ticker..."
                value={tickerInput}
                onChange={(e) => {
                  setTickerInput(e.target.value.toUpperCase());
                  setFilter("ticker", e.target.value.toUpperCase());
                }}
                className="pl-7 w-36 py-1.5 text-xs"
              />
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-terminal-border rounded-sm text-terminal-dim hover:text-terminal-text hover:bg-terminal-muted transition-all"
            >
              <SlidersHorizontal size={11} />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 bg-accent text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-terminal-dim hover:text-loss transition-colors">
                <X size={10} /> Clear
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-terminal-dim">Sort:</span>
              <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)} className="py-1 text-xs w-28">
                <option value="entryAt">Entry Date</option>
                <option value="exitAt">Exit Date</option>
                <option value="pnl">P&L</option>
                <option value="ticker">Ticker</option>
              </Select>
              <Select value={filters.order} onChange={(e) => setFilter("order", e.target.value)} className="py-1 text-xs w-20">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </Select>
            </div>
          </div>

          {showFilters && (
            <div className="px-4 py-3 border-t border-terminal-border grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] text-terminal-dim uppercase tracking-widest mb-1.5">Status</div>
                <Select value={filters.status || ""} onChange={(e) => setFilter("status", e.target.value)} className="py-1.5 text-xs">
                  <option value="">All</option>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </Select>
              </div>
              <div>
                <div className="text-[10px] text-terminal-dim uppercase tracking-widest mb-1.5">Direction</div>
                <Select value={filters.direction || ""} onChange={(e) => setFilter("direction", e.target.value)} className="py-1.5 text-xs">
                  <option value="">All</option>
                  <option value="LONG">Long</option>
                  <option value="SHORT">Short</option>
                </Select>
              </div>
              <div>
                <div className="text-[10px] text-terminal-dim uppercase tracking-widest mb-1.5">Type</div>
                <Select value={filters.tradeType || ""} onChange={(e) => setFilter("tradeType", e.target.value)} className="py-1.5 text-xs">
                  <option value="">All</option>
                  <option value="DAY">Day</option>
                  <option value="SWING">Swing</option>
                </Select>
              </div>
              <div>
                <div className="text-[10px] text-terminal-dim uppercase tracking-widest mb-1.5">Asset</div>
                <Select value={filters.assetClass || ""} onChange={(e) => setFilter("assetClass", e.target.value)} className="py-1.5 text-xs">
                  <option value="">All</option>
                  {["STOCK", "OPTION", "CRYPTO", "FOREX", "FUTURES", "ETF"].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-[10px] text-terminal-dim uppercase tracking-widest mb-1.5">From</div>
                <Input type="date" value={filters.from || ""} onChange={(e) => setFilter("from", e.target.value)} className="py-1.5 text-xs" />
              </div>
              <div>
                <div className="text-[10px] text-terminal-dim uppercase tracking-widest mb-1.5">To</div>
                <Input type="date" value={filters.to || ""} onChange={(e) => setFilter("to", e.target.value)} className="py-1.5 text-xs" />
              </div>
            </div>
          )}
        </Card>

        {/* Trade table */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>
              {data ? `${data.pagination.total} Trade${data.pagination.total !== 1 ? "s" : ""}` : "Trades"}
            </CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : !data?.data.length ? (
            <EmptyState
              title="No trades match your filters"
              action={<Button variant="outline" onClick={clearFilters}>Clear Filters</Button>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-terminal-border">
                      {COLS.map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] tracking-widest uppercase text-terminal-dim font-medium whitespace-nowrap">
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

              {/* Pagination */}
              {data.pagination.pages > 1 && (
                <div className="px-4 py-3 border-t border-terminal-border flex items-center justify-between">
                  <span className="text-[10px] text-terminal-dim">
                    Page {data.pagination.page} of {data.pagination.pages}
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      onClick={() => setFilters((p) => ({ ...p, page: (p.page || 1) - 1 }))}
                      disabled={(filters.page || 1) <= 1}
                    >
                      ← Prev
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setFilters((p) => ({ ...p, page: (p.page || 1) + 1 }))}
                      disabled={(filters.page || 1) >= data.pagination.pages}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
