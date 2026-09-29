/**
 * Recompute every trade's stored derived fields (sizing, avg prices, pnl,
 * fxPnl, outcome, …) from its executions using summarizeExecutions().
 *
 * Run after changing the P&L formula or editing rows outside the API:
 *   npm run db:recompute            # apply
 *   npm run db:recompute -- --dry   # preview only
 */
import "dotenv/config";
import prisma from "../src/lib/prisma.js";
import { summarizeExecutions } from "../src/lib/tradeUtils.js";

const dryRun = process.argv.includes("--dry");

const trades = await prisma.trade.findMany({ include: { executions: true } });

// Compare stored vs. derived values regardless of Decimal/string/Date types
const norm = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string" && !/^-?\d/.test(v)) return v;
  return Number(v);
};
const show = (v) => (v instanceof Date ? v.toISOString() : norm(v));

let changed = 0;
let failed = 0;
for (const t of trades) {
  let derived;
  try {
    derived = summarizeExecutions(t, t.executions);
  } catch (err) {
    failed++;
    console.log(`${t.ticker} ${t.id}: SKIPPED — ${err.message}`);
    continue;
  }

  const diffs = Object.keys(derived)
    .filter((k) => norm(t[k]) !== norm(derived[k]))
    .map((k) => `${k} ${show(t[k])} → ${show(derived[k])}`);
  if (diffs.length === 0) continue;

  changed++;
  console.log(`${t.ticker} ${t.direction} ${t.id}: ${diffs.join(", ")}`);
  if (!dryRun) {
    await prisma.trade.update({ where: { id: t.id }, data: derived });
  }
}

console.log(
  `${changed} of ${trades.length} trades ${dryRun ? "would change" : "updated"}` +
    (failed ? `, ${failed} skipped (invalid fills).` : "."),
);
await prisma.$disconnect();
