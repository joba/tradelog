/**
 * Compute derived trade fields when a trade is closed.
 * All inputs should be plain JS numbers.
 */
export function computePnl({
  direction,
  quantity,
  entryPrice,
  exitPrice,
  fees,
  stopLoss,
  takeProfit,
}) {
  const qty = Number(quantity);
  const entry = Number(entryPrice);
  const exit = Number(exitPrice);
  const totalFees = Number(fees) || 0;

  // Raw P&L before fees
  // const rawPnl = direction === "LONG"
  //   ? (exit - entry) * qty
  //   : (entry - exit) * qty;

  // Always calculate as LONG, as its optimized for bull/bear assets
  const rawPnl = (exit - entry) * qty;

  const pnl = rawPnl - totalFees;
  const pnlPercent = (rawPnl / (entry * qty)) * 100;

  // Outcome
  let outcome;
  if (pnl > 0) outcome = "WIN";
  else if (pnl < 0) outcome = "LOSS";
  else outcome = "BREAKEVEN";

  // Actual R:R — requires stop loss to calculate
  let riskReward = null;
  if (stopLoss) {
    const riskPerShare =
      direction === "LONG"
        ? entry - Number(stopLoss)
        : Number(stopLoss) - entry;
    const rewardPerShare = direction === "LONG" ? exit - entry : entry - exit;
    if (riskPerShare > 0) {
      riskReward = rewardPerShare / riskPerShare;
    }
  }

  return {
    pnl: pnl.toFixed(8),
    pnlPercent: pnlPercent.toFixed(4),
    riskReward: riskReward !== null ? riskReward.toFixed(4) : null,
    outcome,
  };
}
