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
  fxRate = 1,
}) {
  const qty = Number(quantity);
  const entry = Number(entryPrice);
  const exit = Number(exitPrice);
  const totalFees = Number(fees) || 0;
  const rate = Number(fxRate) || 1;

  // Raw P&L before fees (in original currency)
  // Always calculate as LONG, as its optimized for bull/bear assets (not the underlying asset direction)
  const rawPnl = (exit - entry) * qty;

  // Convert to SEK using fxRate (1 for SEK trades)
  const pnl = (rawPnl - totalFees) * rate;
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
