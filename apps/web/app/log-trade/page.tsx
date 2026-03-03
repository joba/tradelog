"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tradesApi, tagsApi } from "@/lib/queries";
import AppLayout from "@/components/layout/AppLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Input,
  Select,
  Textarea,
  Label,
  Button,
  Badge,
} from "@/components/ui";
import { CheckCircle } from "lucide-react";
import { AssetClass, Direction, TradeType } from "@/types";

const toLocalDatetimeInput = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function LogTradePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => tagsApi.list().then((r) => r.data),
  });

  const [form, setForm] = useState({
    ticker: "",
    assetClass: "STOCK" as AssetClass,
    direction: "LONG" as Direction,
    tradeType: "DAY" as TradeType,
    quantity: "",
    entryPrice: "",
    exitPrice: "",
    entryAt: toLocalDatetimeInput(new Date()),
    exitAt: "",
    stopLoss: "",
    takeProfit: "",
    fees: "0",
    notes: "",
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ticker: form.ticker.toUpperCase(),
        assetClass: form.assetClass,
        direction: form.direction,
        tradeType: form.tradeType,
        quantity: Number(form.quantity),
        entryPrice: Number(form.entryPrice),
        exitPrice: form.exitPrice ? Number(form.exitPrice) : undefined,
        entryAt: new Date(form.entryAt).toISOString(),
        exitAt: form.exitAt ? new Date(form.exitAt).toISOString() : undefined,
        stopLoss: form.stopLoss ? Number(form.stopLoss) : undefined,
        takeProfit: form.takeProfit ? Number(form.takeProfit) : undefined,
        fees: Number(form.fees),
        notes: form.notes || undefined,
        tagIds: selectedTags,
      };
      return tradesApi.create(payload).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setSuccess(true);
      setTimeout(() => {
        router.push("/trades");
      }, 1500);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || "Failed to log trade");
    },
  });

  const set = (key: string, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  const toggleTag = (id: string) =>
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutation.mutate();
  };

  if (success) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
          <CheckCircle size={32} className="text-profit" />
          <div className="text-terminal-bright font-medium tracking-wide">
            Trade Logged Successfully
          </div>
          <div className="text-xs text-terminal-dim">
            Redirecting to trade log...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4 animate-fade-in">
        <div>
          <div className="text-[10px] text-terminal-dim tracking-widest uppercase mb-1">
            New Entry
          </div>
          <h1 className="text-xl font-semibold text-terminal-bright tracking-wide">
            Log Trade
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Instrument */}
          <Card>
            <CardHeader>
              <CardTitle>Instrument</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticker">Ticker *</Label>
                <Input
                  id="ticker"
                  value={form.ticker}
                  onChange={(e) => set("ticker", e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  required
                  className="uppercase"
                />
              </div>
              <div>
                <Label htmlFor="assetClass">Asset Class</Label>
                <Select
                  id="assetClass"
                  value={form.assetClass}
                  onChange={(e) => set("assetClass", e.target.value)}
                >
                  {["STOCK", "OPTION", "CRYPTO", "FOREX", "FUTURES", "ETF"].map(
                    (a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ),
                  )}
                </Select>
              </div>
              <div>
                <Label>Direction *</Label>
                <div className="flex gap-2">
                  {["LONG", "SHORT"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set("direction", d)}
                      className={`flex-1 py-2 text-xs border rounded-sm transition-all ${
                        form.direction === d
                          ? d === "LONG"
                            ? "bg-profit/10 border-profit/40 text-profit"
                            : "bg-loss/10 border-loss/40 text-loss"
                          : "bg-terminal-muted border-terminal-border text-terminal-dim hover:text-terminal-text"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Trade Type *</Label>
                <div className="flex gap-2">
                  {["DAY", "SWING"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("tradeType", t)}
                      className={`flex-1 py-2 text-xs border rounded-sm transition-all ${
                        form.tradeType === t
                          ? "bg-accent/10 border-accent/40 text-accent"
                          : "bg-terminal-muted border-terminal-border text-terminal-dim hover:text-terminal-text"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Execution */}
          <Card>
            <CardHeader>
              <CardTitle>Execution</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fees">Fees / Commission</Label>
                <Input
                  id="fees"
                  type="number"
                  step="any"
                  value={form.fees}
                  onChange={(e) => set("fees", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="entryPrice">Entry Price *</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="any"
                  value={form.entryPrice}
                  onChange={(e) => set("entryPrice", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="exitPrice">
                  Exit Price{" "}
                  <span className="text-terminal-dim/60 normal-case">
                    (leave blank if open)
                  </span>
                </Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="any"
                  value={form.exitPrice}
                  onChange={(e) => set("exitPrice", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="entryAt">Entry Time *</Label>
                <Input
                  id="entryAt"
                  type="datetime-local"
                  value={form.entryAt}
                  onChange={(e) => set("entryAt", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="exitAt">Exit Time</Label>
                <Input
                  id="exitAt"
                  type="datetime-local"
                  value={form.exitAt}
                  onChange={(e) => set("exitAt", e.target.value)}
                />
              </div>
            </CardBody>
          </Card>

          {/* Risk management */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stopLoss">Stop Loss</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="any"
                  value={form.stopLoss}
                  onChange={(e) => set("stopLoss", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="takeProfit">Take Profit</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  step="any"
                  value={form.takeProfit}
                  onChange={(e) => set("takeProfit", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </CardBody>
          </Card>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="px-2.5 py-1 text-xs border rounded-sm transition-all"
                      style={{
                        borderColor: selectedTags.includes(tag.id)
                          ? tag.color || "#4d9fff"
                          : "#1c2230",
                        color: selectedTags.includes(tag.id)
                          ? tag.color || "#4d9fff"
                          : "#5a6a82",
                        background: selectedTags.includes(tag.id)
                          ? `${tag.color || "#4d9fff"}15`
                          : "transparent",
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & Rationale</CardTitle>
            </CardHeader>
            <CardBody>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Setup, thesis, what you learned..."
                rows={4}
              />
            </CardBody>
          </Card>

          {error && (
            <div className="text-xs text-loss bg-loss/5 border border-loss/20 rounded-sm px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1 justify-center py-3"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Logging..." : "Log Trade"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
