export type AssetClass =
  | "STOCK"
  | "OPTION"
  | "CRYPTO"
  | "FOREX"
  | "FUTURES"
  | "ETF"
  | "ETP";
export type Direction = "LONG" | "SHORT";
export type TradeType = "DAY" | "SWING";
export type TradeStatus = "OPEN" | "CLOSED";
export type Outcome = "WIN" | "LOSS" | "BREAKEVEN";
export type Currency = "USD" | "SEK";
export type ExecutionType = "ENTRY" | "EXIT";

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

/** A single buy (ENTRY) or sell (EXIT) fill. Trade totals and P&L derive from these. */
export interface Execution {
  id: string;
  tradeId: string;
  type: ExecutionType;
  price: number;
  quantity: number;
  fees: number;
  fxRate: number | null;
  executedAt: string;
}

export interface Trade {
  id: string;
  userId: string;
  ticker: string;
  assetClass: AssetClass;
  direction: Direction;
  tradeType: TradeType;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  entryAt: string;
  exitAt: string | null;
  stopLoss: number | null;
  takeProfit: number | null;
  fees: number;
  pnl: number | null; // realised SEK P&L; final once CLOSED
  fxPnl: number | null; // part of pnl from USD/SEK moves
  pnlPercent: number | null;
  riskReward: number | null;
  status: TradeStatus;
  outcome: Outcome | null;
  currency: Currency;
  fxRate: number | null; // avg entry rate
  exitFxRate: number | null; // avg exit rate
  leverage: number | null;
  notes: string | null;
  screenshot: string | null;
  createdAt: string;
  tags: { tag: Tag }[];
  executions: Execution[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface Summary {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number | null;
  avgRR: number | null;
  totalFees: number;
  maxWinStreak: number;
  maxLossStreak: number;
}

export interface EquityPoint {
  date: string;
  pnl: number;
  cumulative: number;
  ticker: string;
  outcome: Outcome;
}

export interface TickerStat {
  ticker: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgRR: number | null;
  totalFees: number;
}

export interface TagStat {
  tagId: string;
  tagName: string;
  color: string | null;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgRR: number | null;
}

export interface TimeBucket {
  key: number;
  totalTrades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface TimeStats {
  byDayOfWeek: TimeBucket[];
  byHourOfDay: TimeBucket[];
}

export interface User {
  id: string;
  email: string;
  name: string | null;
}
