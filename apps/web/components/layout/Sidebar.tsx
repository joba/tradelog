"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  List,
  BarChart2,
  PlusCircle,
  LogOut,
  Tag,
  TrendingUp,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trade Log", icon: List },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/log-trade", label: "Log Trade", icon: PlusCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-terminal-surface border-r border-terminal-border flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-accent" />
          <span className="text-sm font-semibold tracking-[0.2em] text-terminal-bright uppercase">
            Tradelog
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs transition-all duration-150",
                active
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-terminal-dim hover:text-terminal-text hover:bg-terminal-muted border border-transparent",
              )}
            >
              <Icon size={13} />
              <span className="tracking-wide">{label}</span>
              {active && (
                <span className="ml-auto w-1 h-1 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-terminal-border space-y-0.5">
        <div className="px-3 py-2">
          <div className="text-[10px] text-terminal-dim truncate">
            {user?.email}
          </div>
          <div className="text-xs text-terminal-text truncate">
            {user?.name || "Trader"}
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-sm text-xs text-terminal-dim hover:text-loss hover:bg-loss/5 transition-all border border-transparent"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
