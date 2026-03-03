"use client";

import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { tradesApi } from "@/lib/queries";
import { fmtCurrency, fmtDateTime, fmtPercent, fmtDate } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";
import { Trash2, ChevronDown, ChevronRight, X } from "lucide-react";
import type { Trade } from "@tradelog/types";

function outcomeVariant(o: string | null) {
  if (o === "WIN") return "profit";
  if (o === "LOSS") return "loss";
  return "dim";
}

interface CloseFormProps {
  trade: Trade;
  onClose: () => void;
}

function CloseTradeForm({ trade, onClose }: CloseFormProps) {
  const queryClient = useQueryClient();
  const [exitPrice, setExitPrice] = useState("");
  const [fees, setFees] = useState(String(trade.fees || ""));
  const mutation = useMutation({
    mutationFn: () => tradesApi.close(trade.id, { exitPrice: Number(exitPrice), fees: Number(fees) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["equity-curve"] });
      onClose();
    },
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className="flex items-center gap-2 mt-2 p-2 bg-terminal-muted/50 rounded-sm border border-terminal-border"
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <div className="text-[9px] text-terminal-dim tracking-widest uppercase mb-1">Exit Price</div>
        <input
          type="number"
          step="any"
          value={exitPrice}
          onChange={(e) => setExitPrice(e.target.value)}
          className="terminal-input px-2 py-1 text-xs w-28 rounded-sm"
          placeholder="0.00"
          required
          autoFocus
        />
      </div>
      <div>
        <div className="text-[9px] text-terminal-dim tracking-widest uppercase mb-1">Fees</div>
        <input
          type="number"
          step="any"
          value={fees}
          onChange={(e) => setFees(e.target.value)}
          className="terminal-input px-2 py-1 text-xs w-20 rounded-sm"
          placeholder="0.00"
        />
      </div>
      <div className="flex items-end gap-1 pb-0.5 mt-4">
        <Button type="submit" disabled={mutation.isPending} variant="primary" className="py-1 text-[10px]">
          {mutation.isPending ? "..." : "Close"}
        </Button>
        <button type="button" onClick={onClose} className="p-1 text-terminal-dim hover:text-terminal-text">
          <X size={12} />
        </button>
      </div>
    </form>
  );
}

export default function TradeRow({ trade }: { trade: Trade }) {
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => tradesApi.delete(trade.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    },
  });

  const pnl = trade.pnl !== null ? Number(trade.pnl) : null;
  const tags = trade.tags.map((t) => t.tag);

  return (
    <>
      <tr
        className="trade-row cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-2.5 w-4">
          {expanded
            ? <ChevronDown size={11} className="text-terminal-dim" />
            : <ChevronRight size={11} className="text-terminal-dim" />
          }
        </td>
        <td className="px-3 py-2.5">
          <span className="text-terminal-bright font-semibold tracking-wider">{trade.ticker}</span>
          <span className="ml-2 text-[10px] text-terminal-dim">{trade.assetClass}</span>
        </td>
        <td className="px-3 py-2.5">
          <Badge variant={trade.direction === "LONG" ? "profit" : "loss"}>
            {trade.direction}
          </Badge>
        </td>
        <td className="px-3 py-2.5">
          <Badge variant="dim">{trade.tradeType}</Badge>
        </td>
        <td className="px-3 py-2.5 text-xs tabular-nums text-terminal-dim">
          {fmtDateTime(trade.entryAt)}
        </td>
        <td className="px-3 py-2.5 text-xs tabular-nums">
          {fmtCurrency(Number(trade.entryPrice))}
        </td>
        <td className="px-3 py-2.5 text-xs tabular-nums">
          {trade.exitPrice ? fmtCurrency(Number(trade.exitPrice)) : (
            <span className="text-accent text-[10px] cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setClosing(true); }}>
              Close ›
            </span>
          )}
        </td>
        <td className={`px-3 py-2.5 text-xs tabular-nums font-medium ${pnl === null ? "text-terminal-dim" : pnl > 0 ? "text-profit" : "text-loss"}`}>
          {pnl === null ? <Badge variant="accent">OPEN</Badge> : (
            <span className={pnl > 0 ? "glow-profit" : ""}>
              {fmtCurrency(pnl)}
              <span className="text-[10px] ml-1 opacity-70">{fmtPercent(Number(trade.pnlPercent))}</span>
            </span>
          )}
        </td>
        <td className="px-3 py-2.5">
          {trade.outcome
            ? <Badge variant={outcomeVariant(trade.outcome) as "profit" | "loss" | "dim"}>{trade.outcome}</Badge>
            : null
          }
        </td>
        <td className="px-3 py-2.5">
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm("Delete this trade?")) deleteMutation.mutate(); }}
            className="p-1 text-terminal-dim hover:text-loss transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-terminal-muted/30">
          <td colSpan={10} className="px-6 py-3">
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">Quantity</span>
                <span className="text-terminal-text tabular-nums">{Number(trade.quantity)}</span>
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">Stop Loss</span>
                <span className="text-loss tabular-nums">{trade.stopLoss ? fmtCurrency(Number(trade.stopLoss)) : "—"}</span>
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">Take Profit</span>
                <span className="text-profit tabular-nums">{trade.takeProfit ? fmtCurrency(Number(trade.takeProfit)) : "—"}</span>
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">R:R</span>
                <span className="text-terminal-text tabular-nums">{trade.riskReward ? `${Number(trade.riskReward).toFixed(2)}R` : "—"}</span>
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">Fees</span>
                <span className="text-terminal-dim tabular-nums">{fmtCurrency(Number(trade.fees))}</span>
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">Exit</span>
                <span className="text-terminal-dim tabular-nums">{fmtDateTime(trade.exitAt)}</span>
              </div>
              {tags.length > 0 && (
                <div className="col-span-2">
                  <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">Tags</span>
                  <div className="flex gap-1 flex-wrap">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-1.5 py-0.5 text-[10px] rounded-sm border"
                        style={{
                          borderColor: tag.color ? `${tag.color}40` : "#1c2230",
                          color: tag.color || "#5a6a82",
                          background: tag.color ? `${tag.color}10` : "transparent",
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {trade.notes && (
                <div className="col-span-4">
                  <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">Notes</span>
                  <span className="text-terminal-text text-xs">{trade.notes}</span>
                </div>
              )}
            </div>
            {closing && (
              <CloseTradeForm trade={trade} onClose={() => setClosing(false)} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}
