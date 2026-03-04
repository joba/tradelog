import api from "./api";
import type {
  Trade, PaginatedResponse, Summary, EquityPoint,
  TickerStat, TagStat, TimeStats, Tag, User,
} from "@tradelog/types";

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>("/auth/login", { email, password }),
  register: (email: string, password: string, name?: string) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>("/auth/register", { email, password, name }),
  me: () => api.get<User>("/auth/me"),
};

// ─── Trades ───────────────────────────────────────────────────
export type TradeFilters = {
  status?: string; direction?: string; tradeType?: string;
  assetClass?: string; ticker?: string; from?: string; to?: string;
  tagId?: string; page?: number; limit?: number;
  sort?: string; order?: string;
};

export const tradesApi = {
  list: (params?: TradeFilters) =>
    api.get<PaginatedResponse<Trade>>("/trades", { params }),
  get: (id: string) => api.get<Trade>(`/trades/${id}`),
  create: (data: Partial<Trade> & { tagIds?: string[] }) =>
    api.post<Trade>("/trades", data),
  update: (id: string, data: Partial<Trade> & { tagIds?: string[] }) =>
    api.put<Trade>(`/trades/${id}`, data),
  close: (id: string, data: { exitPrice: number; exitAt?: string; fees?: number; fxRate?: number }) =>
    api.patch<Trade>(`/trades/${id}/close`, data),
  delete: (id: string) => api.delete(`/trades/${id}`),
};

// ─── Stats ────────────────────────────────────────────────────
export type StatFilters = { from?: string; to?: string; tradeType?: string; assetClass?: string };

export const statsApi = {
  summary: (params?: StatFilters) =>
    api.get<Summary>("/stats/summary", { params }),
  equityCurve: (params?: StatFilters) =>
    api.get<EquityPoint[]>("/stats/equity-curve", { params }),
  byTicker: (params?: StatFilters) =>
    api.get<TickerStat[]>("/stats/by-ticker", { params }),
  byTag: (params?: StatFilters) =>
    api.get<TagStat[]>("/stats/by-tag", { params }),
  byTime: (params?: StatFilters) =>
    api.get<TimeStats>("/stats/by-time", { params }),
};

// ─── Tags ─────────────────────────────────────────────────────
export const tagsApi = {
  list: () => api.get<Tag[]>("/tags"),
  create: (name: string, color?: string) => api.post<Tag>("/tags", { name, color }),
  update: (id: string, data: { name?: string; color?: string }) =>
    api.put<Tag>(`/tags/${id}`, data),
  delete: (id: string) => api.delete(`/tags/${id}`),
};
