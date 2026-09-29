/**
 * Recompute stored derived fields (pnl, pnlPercent, riskReward, outcome)
 * for all closed trades using the current computePnl().
 *
 * Run after changing the P&L formula or editing trades outside the API:
 *   npm run db:recompute            # apply
 *   npm run db:recompute -- --dry   # preview only
 */
import "dotenv/config";
import prisma from "../src/lib/prisma.js";
import { computePnl } from "../src/lib/tradeUtils.js";

const dryRun = process.argv.includes("--dry");

const trades = await prisma.trade.findMany({
  where: { status: "CLOSED", exitPrice: { not: null } },
});

let changed = 0;
for (const t of trades) {
  const derived = computePnl({
    direction: t.direction,
    quantity: Number(t.quantity),
    entryPrice: Number(t.entryPrice),
    exitPrice: Number(t.exitPrice),
    fees: Number(t.fees),
    stopLoss: t.stopLoss ? Number(t.stopLoss) : null,
    takeProfit: t.takeProfit ? Number(t.takeProfit) : null,
    fxRate: t.currency === "USD" ? Number(t.fxRate) || 1 : 1,
  });

  const num = (v) => (v === null ? null : Number(v));
  const diffs = ["pnl", "pnlPercent", "riskReward", "outcome"]
    .filter((k) =>
      k === "outcome" ? t[k] !== derived[k] : num(t[k]) !== num(derived[k]),
    )
    .map((k) =>
      k === "outcome"
        ? `${k} ${t[k]} → ${derived[k]}`
        : `${k} ${num(t[k])} → ${num(derived[k])}`,
    );
  if (diffs.length === 0) continue;

  changed++;
  console.log(`${t.ticker} ${t.direction} ${t.id}: ${diffs.join(", ")}`);
  if (!dryRun) {
    await prisma.trade.update({ where: { id: t.id }, data: derived });
  }
}

console.log(
  `${changed} of ${trades.length} closed trades ${dryRun ? "would change" : "updated"}.`,
);
await prisma.$disconnect();
