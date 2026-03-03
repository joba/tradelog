import { Router } from "express";
import { query, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
router.use(authenticate);

// ─── Shared filter builder ────────────────────────────────────

function buildBaseWhere(userId, q) {
  const { from, to, tradeType, assetClass } = q;
  return {
    userId,
    status: "CLOSED", // stats only count closed trades
    ...(tradeType && { tradeType }),
    ...(assetClass && { assetClass }),
    ...((from || to) && {
      entryAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };
}

const commonFilters = [
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("tradeType").optional().isIn(["DAY", "SWING"]),
  query("assetClass").optional().isIn(["STOCK", "OPTION", "CRYPTO", "FOREX", "FUTURES", "ETF"]),
];

// ─── GET /api/stats/summary ───────────────────────────────────
// Overall performance metrics

router.get("/summary", commonFilters, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const where = buildBaseWhere(req.userId, req.query);

    const trades = await prisma.trade.findMany({
      where,
      select: { pnl: true, pnlPercent: true, riskReward: true, outcome: true, fees: true },
    });

    if (trades.length === 0) {
      return res.json({ totalTrades: 0, message: "No closed trades found" });
    }

    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.outcome === "WIN").length;
    const losses = trades.filter((t) => t.outcome === "LOSS").length;
    const breakevens = trades.filter((t) => t.outcome === "BREAKEVEN").length;

    const winRate = (wins / totalTrades) * 100;

    const pnlValues = trades.map((t) => Number(t.pnl));
    const totalPnl = pnlValues.reduce((a, b) => a + b, 0);
    const avgPnl = totalPnl / totalTrades;

    const winPnls = trades.filter((t) => t.outcome === "WIN").map((t) => Number(t.pnl));
    const lossPnls = trades.filter((t) => t.outcome === "LOSS").map((t) => Number(t.pnl));

    const avgWin = winPnls.length ? winPnls.reduce((a, b) => a + b, 0) / winPnls.length : 0;
    const avgLoss = lossPnls.length ? lossPnls.reduce((a, b) => a + b, 0) / lossPnls.length : 0;
    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null;

    const totalFees = trades.reduce((a, t) => a + Number(t.fees), 0);

    const rrValues = trades.filter((t) => t.riskReward !== null).map((t) => Number(t.riskReward));
    const avgRR = rrValues.length ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : null;

    // Largest win and loss
    const largestWin = winPnls.length ? Math.max(...winPnls) : 0;
    const largestLoss = lossPnls.length ? Math.min(...lossPnls) : 0;

    // Consecutive win/loss streaks
    const { maxWinStreak, maxLossStreak } = computeStreaks(trades);

    res.json({
      totalTrades,
      wins,
      losses,
      breakevens,
      winRate: +winRate.toFixed(2),
      totalPnl: +totalPnl.toFixed(2),
      avgPnl: +avgPnl.toFixed(2),
      avgWin: +avgWin.toFixed(2),
      avgLoss: +avgLoss.toFixed(2),
      largestWin: +largestWin.toFixed(2),
      largestLoss: +largestLoss.toFixed(2),
      profitFactor: profitFactor !== null ? +profitFactor.toFixed(2) : null,
      avgRR: avgRR !== null ? +avgRR.toFixed(2) : null,
      totalFees: +totalFees.toFixed(2),
      maxWinStreak,
      maxLossStreak,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/stats/equity-curve ─────────────────────────────
// Cumulative P&L over time (for chart)

router.get("/equity-curve", commonFilters, async (req, res, next) => {
  try {
    const where = buildBaseWhere(req.userId, req.query);

    const trades = await prisma.trade.findMany({
      where,
      select: { exitAt: true, pnl: true, ticker: true, outcome: true },
      orderBy: { exitAt: "asc" },
    });

    let cumulative = 0;
    const curve = trades.map((t) => {
      cumulative += Number(t.pnl);
      return {
        date: t.exitAt,
        pnl: +Number(t.pnl).toFixed(2),
        cumulative: +cumulative.toFixed(2),
        ticker: t.ticker,
        outcome: t.outcome,
      };
    });

    res.json(curve);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/stats/by-ticker ─────────────────────────────────
// Performance breakdown per symbol

router.get("/by-ticker", commonFilters, async (req, res, next) => {
  try {
    const where = buildBaseWhere(req.userId, req.query);

    // Group by ticker in Prisma using groupBy
    const groups = await prisma.trade.groupBy({
      by: ["ticker"],
      where,
      _count: { id: true },
      _sum: { pnl: true, fees: true },
      _avg: { pnl: true, riskReward: true },
      orderBy: { _sum: { pnl: "desc" } },
    });

    // Get win counts per ticker (requires separate query)
    const winCounts = await prisma.trade.groupBy({
      by: ["ticker"],
      where: { ...where, outcome: "WIN" },
      _count: { id: true },
    });

    const winMap = Object.fromEntries(winCounts.map((w) => [w.ticker, w._count.id]));

    const data = groups.map((g) => {
      const total = g._count.id;
      const wins = winMap[g.ticker] || 0;
      return {
        ticker: g.ticker,
        totalTrades: total,
        wins,
        losses: total - wins,
        winRate: +((wins / total) * 100).toFixed(2),
        totalPnl: +Number(g._sum.pnl).toFixed(2),
        avgPnl: +Number(g._avg.pnl).toFixed(2),
        avgRR: g._avg.riskReward !== null ? +Number(g._avg.riskReward).toFixed(2) : null,
        totalFees: +Number(g._sum.fees).toFixed(2),
      };
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/stats/by-tag ────────────────────────────────────
// Performance breakdown per tag/strategy/sector

router.get("/by-tag", commonFilters, async (req, res, next) => {
  try {
    const where = buildBaseWhere(req.userId, req.query);

    // Pull raw data and aggregate in JS (Prisma groupBy doesn't support relation pivots)
    const trades = await prisma.trade.findMany({
      where,
      select: {
        pnl: true,
        outcome: true,
        riskReward: true,
        fees: true,
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });

    const tagMap = {};
    for (const trade of trades) {
      for (const { tag } of trade.tags) {
        if (!tagMap[tag.id]) {
          tagMap[tag.id] = { ...tag, trades: [] };
        }
        tagMap[tag.id].trades.push(trade);
      }
    }

    const data = Object.values(tagMap).map(({ id, name, color, trades }) => {
      const total = trades.length;
      const wins = trades.filter((t) => t.outcome === "WIN").length;
      const totalPnl = trades.reduce((a, t) => a + Number(t.pnl), 0);
      const rrValues = trades.filter((t) => t.riskReward).map((t) => Number(t.riskReward));
      return {
        tagId: id,
        tagName: name,
        color,
        totalTrades: total,
        wins,
        losses: total - wins,
        winRate: +((wins / total) * 100).toFixed(2),
        totalPnl: +totalPnl.toFixed(2),
        avgPnl: +(totalPnl / total).toFixed(2),
        avgRR: rrValues.length ? +(rrValues.reduce((a, b) => a + b, 0) / rrValues.length).toFixed(2) : null,
      };
    });

    // Sort by total P&L desc
    data.sort((a, b) => b.totalPnl - a.totalPnl);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/stats/by-time ───────────────────────────────────
// Heatmap data: win rate & avg P&L by day-of-week and hour-of-day

router.get("/by-time", commonFilters, async (req, res, next) => {
  try {
    const where = buildBaseWhere(req.userId, req.query);

    const trades = await prisma.trade.findMany({
      where,
      select: { entryAt: true, pnl: true, outcome: true },
    });

    // Day of week: 0=Sun, 1=Mon, ... 6=Sat
    const byDow = buildTimeBuckets(trades, (t) => new Date(t.entryAt).getDay(), 0, 6);
    // Hour of day: 0–23
    const byHour = buildTimeBuckets(trades, (t) => new Date(t.entryAt).getHours(), 0, 23);

    res.json({
      byDayOfWeek: byDow,
      byHourOfDay: byHour,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Helpers ──────────────────────────────────────────────────

function buildTimeBuckets(trades, keyFn, min, max) {
  const buckets = {};
  for (let i = min; i <= max; i++) {
    buckets[i] = { trades: [], wins: 0, totalPnl: 0 };
  }
  for (const trade of trades) {
    const key = keyFn(trade);
    buckets[key].trades.push(trade);
    if (trade.outcome === "WIN") buckets[key].wins++;
    buckets[key].totalPnl += Number(trade.pnl);
  }
  return Object.entries(buckets).map(([key, b]) => ({
    key: Number(key),
    totalTrades: b.trades.length,
    wins: b.wins,
    winRate: b.trades.length ? +((b.wins / b.trades.length) * 100).toFixed(2) : 0,
    totalPnl: +b.totalPnl.toFixed(2),
    avgPnl: b.trades.length ? +(b.totalPnl / b.trades.length).toFixed(2) : 0,
  }));
}

function computeStreaks(trades) {
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let curWin = 0;
  let curLoss = 0;

  for (const t of trades) {
    if (t.outcome === "WIN") {
      curWin++;
      curLoss = 0;
      maxWinStreak = Math.max(maxWinStreak, curWin);
    } else if (t.outcome === "LOSS") {
      curLoss++;
      curWin = 0;
      maxLossStreak = Math.max(maxLossStreak, curLoss);
    } else {
      curWin = 0;
      curLoss = 0;
    }
  }
  return { maxWinStreak, maxLossStreak };
}

export default router;
