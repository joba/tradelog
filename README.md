# Tradelog

Trade journal monorepo — log trades, track performance, spot patterns.

```
tradelog/
├── apps/
│   ├── api/          Express + Prisma backend (Vercel serverless)
│   └── web/          Next.js 14 frontend (Vercel)
├── packages/
│   └── types/        Shared TypeScript types used by both apps
└── package.json      npm workspaces root
```

---

## Getting started

### 1. Install all dependencies from the root
```bash
npm install
```

### 2. Set up environment variables
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# Edit both files with your database URL, JWT secret, etc.
```

### 3. Run database migrations
```bash
npm run db:migrate
npm run db:seed    # optional: loads sample trades
```

### 4. Start both dev servers
```bash
npm run dev
# API → http://localhost:3001
# Web → http://localhost:3000
```

Or start them individually:
```bash
npm run dev:api
npm run dev:web
```

---

## Packages

### `@tradelog/types`
Shared TypeScript interfaces for `Trade`, `Summary`, `TickerStat`, etc.
Both apps import from here — change a type once, TypeScript enforces it everywhere.

```ts
import type { Trade, Summary } from "@tradelog/types";
```

### `@tradelog/api`
Express REST API. See [`apps/api/README.md`](apps/api/README.md) for full route reference.

### `@tradelog/web`
Next.js frontend. See [`apps/web/README.md`](apps/web/README.md) for page structure.

---

## Deploying to Vercel

Both apps deploy to Vercel from this single repo. Create two separate Vercel projects,
each pointed at the same GitHub repository with different Root Directory settings:

| Project | Root Directory | Framework |
|---------|---------------|-----------|
| `tradelog-api` | `apps/api` | Other |
| `tradelog-web` | `apps/web` | Next.js |

See [`apps/api/README.md`](apps/api/README.md) for the full API deployment guide
including database setup (Neon or Supabase recommended).

### Environment variables

**`apps/api`** (set in Vercel dashboard):
```
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://your-tradelog-web.vercel.app
NODE_ENV=production
```

**`apps/web`** (set in Vercel dashboard):
```
NEXT_PUBLIC_API_URL=https://your-tradelog-api.vercel.app/api
```

---

## Git workflow

```
main          production — auto-deploys both apps on Vercel
dev           integration — merge features here first
feature/xxx   individual features, PR into dev
```
