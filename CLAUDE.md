# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies from root
npm install

# Development (runs both API on :3001 and web on :3000 concurrently)
npm run dev

# Individual servers
npm run dev:api
npm run dev:web

# Lint (web only — ESLint via Next.js)
npm run lint --workspace=apps/web

# Build
npm run build

# Database
npm run db:migrate      # prisma migrate dev
npm run db:seed         # load sample trades
npm run db:studio       # open Prisma Studio UI
```

There are no automated tests in this project.

## Architecture

npm workspaces monorepo with three packages:

- **`apps/api`** (`@tradelog/api`) — Express + Prisma backend, deployed as a Vercel serverless function
- **`apps/web`** (`@tradelog/web`) — Next.js 14 App Router frontend, deployed to Vercel
- **`packages/types`** (`@tradelog/types`) — Shared TypeScript types imported by both apps

### API (`apps/api`)

Uses ES modules (`"type": "module"`). Express app structure:

- `api/index.js` — Vercel serverless entry point (exports app, no `listen()`)
- `src/app.js` — Express app definition with all routes and middleware
- `src/index.js` — Local dev server (calls `app.listen`)
- `src/routes/` — `auth.js`, `trades.js`, `stats.js`, `tags.js`
- `src/middleware/authenticate.js` — JWT bearer token validation; sets `req.userId`
- `src/lib/prisma.js` — Prisma client singleton
- `src/lib/tradeUtils.js` — `computePnl()` — calculates pnl, pnlPercent, riskReward, outcome when a trade closes

All routes under `/api/*`. Stats routes only count `status: "CLOSED"` trades. The `authenticate` middleware is applied router-wide (not per-route).

**PnL computation note:** `computePnl` always uses `(exit - entry) * qty` regardless of direction — this is intentional ("optimized for bull/bear assets"). `outcome` (WIN/LOSS/BREAKEVEN) is based on post-fee P&L; `riskReward` calculation still uses direction-aware logic.

### Web (`apps/web`)

- `lib/api.ts` — Axios instance with base URL, JWT `Authorization` header interceptor, and auto-refresh on 401 (stores tokens in `localStorage`)
- `lib/auth.tsx` — `AuthProvider` context + `useAuth()` hook; manages user state, login/register/logout
- `lib/queries.ts` — All API query functions (used by TanStack Query)
- `lib/utils.ts` — Formatting helpers
- `components/layout/AppLayout.tsx` — Auth guard + sidebar wrapper (wraps all authenticated pages)
- `components/ui/index.tsx` — Shared UI primitives (Card, Button, Badge, Input, etc.)

**Auth flow:** JWT access token + refresh token stored in `localStorage`. The Axios interceptor auto-refreshes on 401 and redirects to `/login` if refresh fails.

### Shared Types (`packages/types`)

Single `index.ts` exporting all interfaces: `Trade`, `Summary`, `EquityPoint`, `TickerStat`, `TagStat`, `TimeBucket`, `TimeStats`, `User`, `PaginatedResponse<T>`, and enum types. Both apps import from `@tradelog/types` — update types here when changing the Prisma schema.

### Data Model Key Points

- `Trade` stores derived fields (`pnl`, `pnlPercent`, `riskReward`, `outcome`) computed at close time for query performance
- `exitPrice: null` = open trade; `status: "OPEN"` / `"CLOSED"` is set accordingly
- Tags are user-scoped (`userId` on `Tag`) and linked via `TradeTag` join table
- `Execution` model exists for scaling in/out (partial fills) but is not yet surfaced in the UI

### Git Branch Strategy

- `main` — production (auto-deploys to Vercel)
- `dev` — integration branch
- `feature/xxx` — feature branches, PR into `dev`
