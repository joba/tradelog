# Tradelog — Web

Next.js 14 (App Router) frontend with a dark terminal aesthetic.

## Stack
- **Next.js 14** (App Router + TypeScript)
- **Tailwind CSS** — terminal dark theme
- **TanStack Query** — server state management
- **Recharts** — charts and visualizations
- **IBM Plex Mono + DM Sans** — typography

## Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL to your backend URL

npm run dev
# Open http://localhost:3000
```

Make sure the backend API is running at the configured URL.

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/register` | Create account |
| `/dashboard` | Summary stats, equity curve, recent trades |
| `/trades` | Full trade log with filters, sorting, pagination |
| `/log-trade` | Log a new trade |
| `/analytics` | Deep analytics — ticker breakdown, tags, time heatmaps |

## Project Structure

```
app/
  layout.tsx          # Root layout (fonts, providers)
  dashboard/page.tsx  # Dashboard
  trades/page.tsx     # Trade log
  log-trade/page.tsx  # Log trade form
  analytics/page.tsx  # Analytics
  login/page.tsx
  register/page.tsx

components/
  ui/index.tsx        # Card, Button, Badge, Input, etc.
  layout/
    AppLayout.tsx     # Auth guard + sidebar wrapper
    Sidebar.tsx       # Navigation
  charts/
    EquityCurve.tsx   # Cumulative P&L chart
    TimeHeatmap.tsx   # Day/hour heatmaps
  trades/
    TradeRow.tsx      # Expandable table row + close form

lib/
  api.ts              # Axios instance with JWT interceptor
  queries.ts          # API query functions
  auth.tsx            # Auth context
  queryProvider.tsx   # TanStack Query provider
  utils.ts            # Formatting helpers
```
