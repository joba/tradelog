"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ─── Card ─────────────────────────────────────────────────────
export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative bg-terminal-surface border border-terminal-border rounded-sm overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 py-3 border-b border-terminal-border flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-xs font-medium text-terminal-dim tracking-widest uppercase", className)}>
      {children}
    </span>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

// ─── Badge ────────────────────────────────────────────────────
type BadgeVariant = "default" | "profit" | "loss" | "accent" | "neutral" | "dim";

export function Badge({ children, variant = "default", className }: {
  children: ReactNode; variant?: BadgeVariant; className?: string;
}) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-terminal-muted text-terminal-text border-terminal-border",
    profit: "bg-profit/10 text-profit border-profit/20",
    loss: "bg-loss/10 text-loss border-loss/20",
    accent: "bg-accent/10 text-accent border-accent/20",
    neutral: "bg-terminal-muted text-terminal-dim border-terminal-border",
    dim: "bg-transparent text-terminal-dim border-terminal-border",
  };
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium tracking-wider border rounded-sm uppercase",
      variants[variant], className
    )}>
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────
type ButtonVariant = "primary" | "ghost" | "danger" | "outline";

export function Button({
  children, variant = "primary", className, disabled, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-accent text-white hover:bg-accent-bright border-transparent",
    ghost: "bg-transparent text-terminal-dim hover:text-terminal-text hover:bg-terminal-muted border-transparent",
    danger: "bg-loss/10 text-loss hover:bg-loss/20 border-loss/20",
    outline: "bg-transparent text-terminal-text hover:bg-terminal-muted border-terminal-border",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded-sm",
        "transition-all duration-150 cursor-pointer select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant], className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "terminal-input w-full px-3 py-2 text-sm rounded-sm",
        "placeholder:text-terminal-dim",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "terminal-input w-full px-3 py-2 text-sm rounded-sm cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "terminal-input w-full px-3 py-2 text-sm rounded-sm resize-none",
        "placeholder:text-terminal-dim",
        className
      )}
      {...props}
    />
  );
}

// ─── Label ────────────────────────────────────────────────────
export function Label({ children, htmlFor, className }: {
  children: ReactNode; htmlFor?: string; className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-[10px] font-medium text-terminal-dim tracking-widest uppercase mb-1.5", className)}
    >
      {children}
    </label>
  );
}

// ─── Divider ──────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={cn("border-t border-terminal-border", className)} />;
}

// ─── Loading spinner ──────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("inline-block w-4 h-4 border border-terminal-border border-t-accent rounded-full animate-spin", className)} />
  );
}

// ─── Empty state ──────────────────────────────────────────────
export function EmptyState({ title, description, action }: {
  title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-terminal-dim text-3xl font-mono">[ ]</div>
      <div className="text-sm text-terminal-dim">{title}</div>
      {description && <div className="text-xs text-terminal-dim/60">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Stat cell ────────────────────────────────────────────────
export function StatCell({ label, value, className, valueClass }: {
  label: string; value: ReactNode; className?: string; valueClass?: string;
}) {
  return (
    <div className={cn("stat-card flex flex-col gap-1 p-3 md:p-4 bg-terminal-surface border border-terminal-border rounded-sm", className)}>
      <span className="text-[10px] tracking-widest uppercase text-terminal-dim">{label}</span>
      <span className={cn("text-base md:text-xl font-semibold tabular-nums", valueClass)}>{value}</span>
    </div>
  );
}
