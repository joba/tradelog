import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fmt(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}

export function fmtCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return (value < 0 ? "-" : "") + formatted + " kr";
}

export function fmtPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function fmtHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export function pnlColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-terminal-dim";
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-terminal-dim";
}

export function outcomeColor(outcome: string | null | undefined): string {
  if (outcome === "WIN") return "text-profit";
  if (outcome === "LOSS") return "text-loss";
  return "text-terminal-dim";
}
