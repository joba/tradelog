# Tradelog — API

Express + Prisma + PostgreSQL backend, deployable to Vercel as a serverless function.

## How it works

Vercel doesn't run persistent servers. Instead, `vercel.json` routes all requests
to `api/index.js`, which exports the Express app as a serverless handler.
The `src/index.js` file still runs a local server for development via `npm run dev`.

```
api/index.js        ← Vercel entry point (imports Express app, no listen())
src/app.js          ← Express app definition (routes, middleware)
src/index.js        ← Local dev server (calls app.listen)
vercel.json         ← Routes all traffic to api/index.js
```

---

## Database

Vercel functions are stateless and short-lived, so you need a **serverless-compatible
Postgres provider** — not a local database.

**Recommended options (both have free tiers):**

| Provider | Notes |
|----------|-------|
| [Neon](https://neon.tech) | Best fit for Vercel — native serverless Postgres, instant branching |
| [Supabase](https://supabase.com) | Great DX, use the **Transaction pooler** URL (port 6543) |

Both work directly with Prisma. Avoid Railway/Render Postgres for Vercel since
direct connections can be exhausted by cold starts.

---

## Deploy

### 1. Create a Postgres database
Set up Neon or Supabase and copy the connection string.

### 2. Run migrations from your local machine
```bash
# Point at your production DB
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

### 3. Deploy to Vercel
```bash
npm i -g vercel
vercel
```

Or connect your GitHub repo in the Vercel dashboard — it will auto-deploy on push.

### 4. Set environment variables in Vercel dashboard
Go to your project → Settings → Environment Variables and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon/Supabase connection string |
| `JWT_SECRET` | A long random string |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | Your frontend Vercel URL |
| `NODE_ENV` | `production` |

### 5. Update the frontend
Set `NEXT_PUBLIC_API_URL` in your frontend's Vercel env vars to point at
your deployed API URL: `https://your-api.vercel.app/api`

---

## Local Development

```bash
npm install
cp .env.example .env  # fill in a local or dev DATABASE_URL

npx prisma migrate dev --name init
node prisma/seed.js   # optional sample data

npm run dev           # runs on http://localhost:3001
```

---

## Caveats

**Cold starts** — serverless functions spin down when idle and take ~200–500ms
to wake up on first request. For a trade journal this is totally fine.

**No WebSockets** — Vercel doesn't support persistent connections. Not needed here.

**Prisma** — `prisma generate` runs automatically as the `build` script before
each Vercel deploy, so the Prisma client is always in sync with your schema.
