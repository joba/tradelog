"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { tradesApi } from "@/lib/queries";
import { fmtCurrency, fmtDateTime, fmtPercent, toLocalDatetimeInput } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";
import { Trash2, ChevronDown, ChevronRight, X, Pencil } from "lucide-react";
import type { Trade, Execution, ExecutionType, Direction } from "@tradelog/types";

function fmtPrice(value: number, currency: string): string {
  if (currency === "USD") return `$${value.toFixed(2)}`;
  return fmtCurrency(value);
}

function outcomeVariant(o: string | null) {
  if (o === "WIN") return "profit";
  if (o === "LOSS") return "loss";
  return "dim";
}

function useInvalidateTrades() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["trades"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["equity-curve"] });
  };
}

function apiError(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error || fallback
  );
}

/** Quantity still held: entries minus exits. */
function openQuantity(trade: Trade) {
  return trade.executions.reduce(
    (a, e) => a + (e.type === "ENTRY" ? 1 : -1) * Number(e.quantity),
    0,
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "number",
  className = "w-24",
  required = false,
  placeholder,
  autoFocus,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <div className="text-[9px] text-terminal-dim tracking-widest uppercase mb-1">
        {label}
      </div>
      <input
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`terminal-input px-2 py-1 text-xs rounded-sm ${className}`}
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function FormButtons({ pending, label, onCancel }: { pending: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="flex items-end gap-1 pb-0.5">
      <Button type="submit" disabled={pending} variant="primary" className="py-1 text-[10px]">
        {pending ? "..." : label}
      </Button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 text-terminal-dim hover:text-terminal-text"
      >
        <X size={12} />
      </button>
    </div>
  );
}

const numStr = (v: number | string | null | undefined) =>
  v === null || v === undefined ? "" : String(Number(v));
const optNum = (v: string) => (v === "" ? null : Number(v));

const formClass =
  "flex flex-wrap items-end gap-2 mt-2 p-2 bg-terminal-muted/50 rounded-sm border border-terminal-border";

type FillFormState =
  | { mode: "add"; type: ExecutionType }
  | { mode: "edit"; execution: Execution };

/** Add or edit one buy/sell fill. Closing a trade is just adding an EXIT for the open quantity. */
function ExecutionForm({
  trade,
  state,
  onDone,
}: {
  trade: Trade;
  state: FillFormState;
  onDone: () => void;
}) {
  const invalidate = useInvalidateTrades();
  const isUsd = trade.currency === "USD";
  const existing = state.mode === "edit" ? state.execution : null;
  const type = existing ? existing.type : (state as { type: ExecutionType }).type;
  const open = openQuantity(trade);

  const [form, setForm] = useState({
    price: numStr(existing?.price),
    quantity: existing
      ? numStr(existing.quantity)
      : type === "EXIT" && open > 0
        ? String(open)
        : "",
    fees: numStr(existing?.fees),
    fxRate: numStr(existing?.fxRate),
    executedAt: toLocalDatetimeInput(existing ? new Date(existing.executedAt) : new Date()),
  });
  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // New USD fills: prefill today's rate (user can overwrite)
  const [fetchingRate, setFetchingRate] = useState(false);
  useEffect(() => {
    if (!isUsd || existing) return;
    setFetchingRate(true);
    fetch("https://api.frankfurter.app/latest?from=USD&to=SEK")
      .then((r) => r.json())
      .then((d) =>
        setForm((f) => (f.fxRate ? f : { ...f, fxRate: String(d.rates.SEK) })),
      )
      .catch(() => {
        /* user can type manually */
      })
      .finally(() => setFetchingRate(false));
  }, [isUsd, existing]);

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        type,
        price: Number(form.price),
        quantity: Number(form.quantity),
        fees: Number(form.fees || 0),
        fxRate: isUsd ? optNum(form.fxRate) : null,
        executedAt: new Date(form.executedAt).toISOString(),
      };
      return existing
        ? tradesApi.updateExecution(trade.id, existing.id, data)
        : tradesApi.addExecution(trade.id, data);
    },
    onSuccess: () => {
      invalidate();
      onDone();
    },
  });

  const usd = isUsd && <span className="text-accent">USD</span>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className={formClass}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="self-center pr-1">
        <Badge variant={type === "ENTRY" ? "profit" : "loss"}>
          {type === "ENTRY" ? "BUY" : "SELL"}
        </Badge>
      </div>
      <EditField label={<>Price {usd}</>} value={form.price} onChange={set("price")} required autoFocus />
      <EditField label="Quantity" value={form.quantity} onChange={set("quantity")} required />
      <EditField label={<>Fees {usd}</>} value={form.fees} onChange={set("fees")} className="w-20" placeholder="0.00" />
      {isUsd && (
        <EditField
          label="USD/SEK Rate"
          value={form.fxRate}
          onChange={set("fxRate")}
          className="w-20"
          placeholder={fetchingRate ? "…" : "10.52"}
          required
        />
      )}
      <EditField
        label="Time"
        type="datetime-local"
        value={form.executedAt}
        onChange={set("executedAt")}
        className="w-44"
        required
      />
      <FormButtons
        pending={mutation.isPending}
        label={existing ? "Save" : type === "EXIT" ? "Sell" : "Buy"}
        onCancel={onDone}
      />
      {mutation.isError && (
        <div className="w-full text-[10px] text-loss">
          {apiError(mutation.error, "Could not save fill.")}
        </div>
      )}
    </form>
  );
}

function ExecutionsTable({
  trade,
  onEdit,
}: {
  trade: Trade;
  onEdit: (execution: Execution) => void;
}) {
  const invalidate = useInvalidateTrades();
  const isUsd = trade.currency === "USD";
  const deleteMutation = useMutation({
    mutationFn: (executionId: string) =>
      tradesApi.deleteExecution(trade.id, executionId),
    onSuccess: invalidate,
  });

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
        Fills
      </span>
      <div className="overflow-x-auto">
        <table className="text-xs tabular-nums">
          <tbody>
            {trade.executions.map((e) => (
              <tr key={e.id} className="group">
                <td className="pr-3 py-0.5">
                  <Badge variant={e.type === "ENTRY" ? "profit" : "loss"}>
                    {e.type === "ENTRY" ? "BUY" : "SELL"}
                  </Badge>
                </td>
                <td className="pr-3 py-0.5 text-terminal-dim">{fmtDateTime(e.executedAt)}</td>
                <td className="pr-3 py-0.5 text-terminal-text">
                  {Number(e.quantity)} × {fmtPrice(Number(e.price), trade.currency)}
                </td>
                <td className="pr-3 py-0.5 text-terminal-dim">
                  {Number(e.fees) > 0 && `fees ${fmtPrice(Number(e.fees), trade.currency)}`}
                </td>
                {isUsd && (
                  <td className="pr-3 py-0.5 text-terminal-dim">
                    {e.fxRate ? `${Number(e.fxRate).toFixed(4)} kr` : "no rate"}
                  </td>
                )}
                <td className="py-0.5 whitespace-nowrap">
                  <button
                    onClick={() => onEdit(e)}
                    className="p-1 text-terminal-dim hover:text-accent transition-colors"
                    title="Edit fill"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this fill?")) deleteMutation.mutate(e.id);
                    }}
                    className="p-1 text-terminal-dim hover:text-loss transition-colors"
                    title="Delete fill"
                  >
                    <Trash2 size={10} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deleteMutation.isError && (
        <div className="text-[10px] text-loss mt-1">
          {apiError(deleteMutation.error, "Could not delete fill.")}
        </div>
      )}
    </div>
  );
}

/** Trade-level fields. Prices, quantities, fees and rates are edited per fill. */
function EditTradeForm({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const invalidate = useInvalidateTrades();
  const [direction, setDirection] = useState<Direction>(trade.direction);
  const [form, setForm] = useState({
    stopLoss: numStr(trade.stopLoss),
    takeProfit: numStr(trade.takeProfit),
    leverage: numStr(trade.leverage),
  });
  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () =>
      tradesApi.update(trade.id, {
        direction,
        stopLoss: optNum(form.stopLoss),
        takeProfit: optNum(form.takeProfit),
        leverage: optNum(form.leverage),
      }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className={formClass}
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <div className="text-[9px] text-terminal-dim tracking-widest uppercase mb-1">
          Direction
        </div>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as Direction)}
          className="terminal-input px-2 py-1 text-xs rounded-sm"
        >
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>
      </div>
      <EditField label="Stop Loss" value={form.stopLoss} onChange={set("stopLoss")} />
      <EditField label="Take Profit" value={form.takeProfit} onChange={set("takeProfit")} />
      <EditField label="Leverage" value={form.leverage} onChange={set("leverage")} className="w-16" />
      <FormButtons pending={mutation.isPending} label="Save" onCancel={onClose} />
      {mutation.isError && (
        <div className="w-full text-[10px] text-loss">
          {apiError(mutation.error, "Could not save trade.")}
        </div>
      )}
    </form>
  );
}

export default function TradeRow({ trade }: { trade: Trade }) {
  const [expanded, setExpanded] = useState(false);
  const [fillForm, setFillForm] = useState<FillFormState | null>(null);
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => tradesApi.delete(trade.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    },
  });

  const pnl = trade.pnl !== null ? Number(trade.pnl) : null;
  const isOpen = trade.status === "OPEN";
  const fxPnl = trade.fxPnl !== null ? Number(trade.fxPnl) : null;
  const tags = trade.tags.map((t) => t.tag);

  return (
    <>
      <tr
        className="trade-row cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-2.5 w-4">
          {expanded ? (
            <ChevronDown size={11} className="text-terminal-dim" />
          ) : (
            <ChevronRight size={11} className="text-terminal-dim" />
          )}
        </td>
        <td className="px-3 py-2.5">
          <span className="text-terminal-bright font-semibold tracking-wider">
            {trade.ticker}
          </span>
          <span className="ml-2 text-[10px] text-terminal-dim">
            {trade.assetClass}
            {trade.leverage != null && (
              <span className="ml-1 text-accent/70">x{Number(trade.leverage)}</span>
            )}
          </span>
        </td>
        <td className="hidden sm:table-cell px-3 py-2.5">
          <Badge variant={trade.direction === "LONG" ? "profit" : "loss"}>
            {trade.direction}
          </Badge>
        </td>
        <td className="hidden sm:table-cell px-3 py-2.5">
          <Badge variant="dim">{isOpen ? "-" : trade.tradeType}</Badge>
        </td>
        <td className="hidden sm:table-cell px-3 py-2.5 text-xs tabular-nums text-terminal-dim">
          {fmtDateTime(trade.entryAt)}
        </td>
        <td className="px-3 py-2.5 text-xs tabular-nums">
          {fmtPrice(Number(trade.entryPrice), trade.currency)}
        </td>
        <td className="px-3 py-2.5 text-xs tabular-nums">
          {trade.exitPrice && fmtPrice(Number(trade.exitPrice), trade.currency)}
          {isOpen && (
            <span
              className={`text-accent text-[10px] cursor-pointer hover:underline ${trade.exitPrice ? "ml-2" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
                setEditing(false);
                setFillForm({ mode: "add", type: "EXIT" });
              }}
            >
              Close ›
            </span>
          )}
        </td>
        <td
          className={`hidden sm:table-cell px-3 py-2.5 text-xs tabular-nums font-medium ${pnl === null ? "text-terminal-dim" : pnl > 0 ? "text-profit" : "text-loss"}`}
        >
          {pnl === null ? (
            <Badge variant="accent">OPEN</Badge>
          ) : (
            <span className={pnl > 0 ? "glow-profit" : ""}>
              {fmtCurrency(pnl)}
              <span className="text-[10px] ml-1 opacity-70">
                {fmtPercent(Number(trade.pnlPercent))}
              </span>
              {isOpen && (
                <Badge variant="accent" className="ml-2">OPEN</Badge>
              )}
            </span>
          )}
        </td>
        <td className="px-3 py-2.5">
          {trade.outcome ? (
            <Badge
              variant={
                outcomeVariant(trade.outcome) as "profit" | "loss" | "dim"
              }
            >
              {trade.outcome}
            </Badge>
          ) : null}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
              setFillForm(null);
              setEditing(true);
            }}
            className="p-1 text-terminal-dim hover:text-accent transition-colors"
            title="Edit trade"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this trade?")) deleteMutation.mutate();
            }}
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
              <div className="sm:hidden">
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  Direction
                </span>
                <Badge variant={trade.direction === "LONG" ? "profit" : "loss"}>
                  {trade.direction}
                </Badge>
              </div>
              <div className="sm:hidden">
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  Type
                </span>
                <Badge variant="dim">{trade.tradeType}</Badge>
              </div>
              <div className="sm:hidden">
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  Entry Time
                </span>
                <span className="text-terminal-dim tabular-nums">
                  {fmtDateTime(trade.entryAt)}
                </span>
              </div>
              <div className="sm:hidden">
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  P&L
                </span>
                {pnl === null ? (
                  <Badge variant="accent">OPEN</Badge>
                ) : (
                  <span className={pnl > 0 ? "text-profit" : "text-loss"}>
                    {fmtCurrency(pnl)}
                    <span className="text-[10px] ml-1 opacity-70">
                      {fmtPercent(Number(trade.pnlPercent))}
                    </span>
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  Quantity
                </span>
                <span className="text-terminal-text tabular-nums">
                  {Number(trade.quantity)}
                  {isOpen && trade.exitPrice && (
                    <span className="text-terminal-dim"> ({openQuantity(trade)} open)</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  Stop Loss
                </span>
                <span className="text-loss tabular-nums">
                  {trade.stopLoss
                    ? fmtPrice(Number(trade.stopLoss), trade.currency)
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  Take Profit
                </span>
                <span className="text-profit tabular-nums">
                  {trade.takeProfit
                    ? fmtPrice(Number(trade.takeProfit), trade.currency)
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  R:R
                </span>
                <span className="text-terminal-text tabular-nums">
                  {trade.riskReward
                    ? `${Number(trade.riskReward).toFixed(2)}R`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  Fees
                </span>
                <span className="text-terminal-dim tabular-nums">
                  {fmtPrice(Number(trade.fees), trade.currency)}
                </span>
              </div>
              {trade.currency === "USD" && (
                <div>
                  <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                    Currency
                  </span>
                  <span className="text-terminal-text tabular-nums">
                    USD{" "}
                    {trade.fxRate ? (
                      <span className="text-terminal-dim">
                        ({Number(trade.fxRate).toFixed(4)}
                        {trade.exitFxRate &&
                          ` → ${Number(trade.exitFxRate).toFixed(4)}`}{" "}
                        kr)
                      </span>
                    ) : null}
                  </span>
                </div>
              )}
              {fxPnl !== null && pnl !== null && (
                <div>
                  <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                    Trade / Currency
                  </span>
                  <span className="tabular-nums">
                    <span className={pnl - fxPnl >= 0 ? "text-profit" : "text-loss"}>
                      {fmtCurrency(pnl - fxPnl)}
                    </span>
                    <span className="text-terminal-dim"> / </span>
                    <span className={fxPnl >= 0 ? "text-profit" : "text-loss"}>
                      {fmtCurrency(fxPnl)}
                    </span>
                  </span>
                </div>
              )}
              <div>
                <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                  Exit
                </span>
                <span className="text-terminal-dim tabular-nums">
                  {fmtDateTime(trade.exitAt)}
                </span>
              </div>
              {tags.length > 0 && (
                <div className="col-span-2">
                  <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                    Tags
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-1.5 py-0.5 text-[10px] rounded-sm border"
                        style={{
                          borderColor: tag.color ? `${tag.color}40` : "#1c2230",
                          color: tag.color || "#5a6a82",
                          background: tag.color
                            ? `${tag.color}10`
                            : "transparent",
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
                  <span className="text-[10px] text-terminal-dim uppercase tracking-widest block mb-1">
                    Notes
                  </span>
                  <span className="text-terminal-text text-xs">
                    {trade.notes}
                  </span>
                </div>
              )}
            </div>
            <ExecutionsTable
              trade={trade}
              onEdit={(execution) => {
                setEditing(false);
                setFillForm({ mode: "edit", execution });
              }}
            />
            {!fillForm && !editing && (
              <div className="flex gap-3 mt-2 text-[10px]" onClick={(e) => e.stopPropagation()}>
                <button
                  className="text-profit hover:underline"
                  onClick={() => setFillForm({ mode: "add", type: "ENTRY" })}
                >
                  + Buy
                </button>
                {isOpen && (
                  <button
                    className="text-loss hover:underline"
                    onClick={() => setFillForm({ mode: "add", type: "EXIT" })}
                  >
                    + Sell
                  </button>
                )}
              </div>
            )}
            {fillForm && (
              <ExecutionForm
                key={fillForm.mode === "edit" ? fillForm.execution.id : fillForm.type}
                trade={trade}
                state={fillForm}
                onDone={() => setFillForm(null)}
              />
            )}
            {editing && (
              <EditTradeForm trade={trade} onClose={() => setEditing(false)} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}
