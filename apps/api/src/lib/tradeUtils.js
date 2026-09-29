/**
 * Derive a trade's summary fields from its executions (fills).
 *
 * Executions are the source of truth. This walks them in time order using the
 * average-cost method (genomsnittsmetoden):
 *   - ENTRY fills add to the position; their fees are part of the cost basis.
 *   - EXIT fills realise P&L against the current average cost; their fees
 *     reduce the proceeds.
 * Each fill carries its own fxRate (USD→SEK), so the SEK result includes
 * currency moves between entry and exit. For SEK trades every rate is 1.
 *
 * P&L is always calculated as LONG, as it's optimized for bull/bear assets
 * (not the underlying asset direction). R:R is still direction-aware.
 *
 * Throws a TradeCalcError if the fills are inconsistent (e.g. selling more
 * than the open position).
 */
export class TradeCalcError extends Error {
  status = 400;
}

const EPSILON = 1e-9;

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export function summarizeExecutions({ currency, direction, stopLoss }, executions) {
  const fills = [...executions]
    .map((e) => ({
      type: e.type,
      price: Number(e.price),
      quantity: Number(e.quantity),
      fees: Number(e.fees) || 0,
      executedAt: new Date(e.executedAt),
      // Only USD trades convert; fall back to 1 when a USD rate is missing
      rate: currency === "USD" ? Number(e.fxRate) || 1 : 1,
    }))
    // Entries before exits at the same timestamp
    .sort((a, b) => a.executedAt - b.executedAt || (a.type === "ENTRY" ? -1 : 1));

  const entries = fills.filter((f) => f.type === "ENTRY");
  const exits = fills.filter((f) => f.type === "EXIT");
  if (entries.length === 0) throw new TradeCalcError("A trade needs at least one entry");

  // Running position at average cost, in trade currency and in SEK
  let openQty = 0;
  let costBasis = 0;
  let costBasisSek = 0;
  let pnlSek = 0;
  let fxPnl = 0;

  for (const f of fills) {
    if (f.type === "ENTRY") {
      openQty += f.quantity;
      costBasis += f.quantity * f.price + f.fees;
      costBasisSek += (f.quantity * f.price + f.fees) * f.rate;
      continue;
    }

    if (f.quantity > openQty + EPSILON) {
      throw new TradeCalcError(
        `Exit of ${f.quantity} on ${f.executedAt.toISOString()} is larger than the open position (${openQty})`,
      );
    }
    const avgCost = costBasis / openQty;
    const avgCostSek = costBasisSek / openQty;

    pnlSek += (f.quantity * f.price - f.fees) * f.rate - f.quantity * avgCostSek;
    // Currency effect: what the sold cost basis is worth at the exit rate vs. what it cost in SEK
    fxPnl += f.quantity * (avgCost * f.rate - avgCostSek);

    costBasis -= f.quantity * avgCost;
    costBasisSek -= f.quantity * avgCostSek;
    openQty -= f.quantity;
  }

  const weightedAvg = (list, pick) => {
    const qty = list.reduce((a, f) => a + f.quantity, 0);
    return list.reduce((a, f) => a + f.quantity * pick(f), 0) / qty;
  };

  const quantity = entries.reduce((a, f) => a + f.quantity, 0);
  const entryPrice = weightedAvg(entries, (f) => f.price);
  const fees = fills.reduce((a, f) => a + f.fees, 0);
  const entryAt = entries[0].executedAt;
  const closed = openQty <= EPSILON;
  const hasExits = exits.length > 0;

  const exitPrice = hasExits ? weightedAvg(exits, (f) => f.price) : null;
  const exitAt = hasExits ? exits[exits.length - 1].executedAt : null;

  // Price move, before fees
  const pnlPercent = hasExits ? ((exitPrice - entryPrice) / entryPrice) * 100 : null;

  let outcome = null;
  if (closed) {
    if (pnlSek > EPSILON) outcome = "WIN";
    else if (pnlSek < -EPSILON) outcome = "LOSS";
    else outcome = "BREAKEVEN";
  }

  // Actual R:R — requires stop loss to calculate
  let riskReward = null;
  if (hasExits && stopLoss) {
    const sl = Number(stopLoss);
    const riskPerShare = direction === "LONG" ? entryPrice - sl : sl - entryPrice;
    const rewardPerShare = direction === "LONG" ? exitPrice - entryPrice : entryPrice - exitPrice;
    if (riskPerShare > 0) riskReward = rewardPerShare / riskPerShare;
  }

  const tradeType = closed && isSameDay(entryAt, exitAt) ? "DAY" : "SWING";

  const isUsd = currency === "USD";
  return {
    quantity: quantity.toFixed(8),
    entryPrice: entryPrice.toFixed(8),
    exitPrice: exitPrice !== null ? exitPrice.toFixed(8) : null,
    entryAt,
    exitAt: closed ? exitAt : null,
    fees: fees.toFixed(8),
    fxRate: isUsd ? weightedAvg(entries, (f) => f.rate).toFixed(4) : null,
    exitFxRate: isUsd && hasExits ? weightedAvg(exits, (f) => f.rate).toFixed(4) : null,
    status: closed ? "CLOSED" : "OPEN",
    tradeType,
    // Realised P&L in SEK; set as soon as anything is sold, final once CLOSED
    pnl: hasExits ? pnlSek.toFixed(8) : null,
    fxPnl: isUsd && hasExits ? fxPnl.toFixed(8) : null,
    pnlPercent: pnlPercent !== null ? pnlPercent.toFixed(4) : null,
    riskReward: riskReward !== null ? riskReward.toFixed(4) : null,
    outcome,
  };
}

/**
 * Recompute and store a trade's derived fields from its executions.
 * Pass a Prisma client or transaction client. Returns the updated trade.
 */
export async function recalcTrade(db, tradeId, include) {
  const trade = await db.trade.findUniqueOrThrow({
    where: { id: tradeId },
    include: { executions: true },
  });
  return db.trade.update({
    where: { id: tradeId },
    data: summarizeExecutions(trade, trade.executions),
    include,
  });
}
