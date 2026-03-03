// prisma/seed.js
// Run: node prisma/seed.js

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const password = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@tradejournal.com" },
    update: {},
    create: { email: "demo@tradejournal.com", password, name: "Demo Trader" },
  });

  // Create some tags
  const [techTag, cryptoTag, breakoutTag, earningsTag] = await Promise.all([
    prisma.tag.upsert({ where: { userId_name: { userId: user.id, name: "Tech" } }, update: {}, create: { userId: user.id, name: "Tech", color: "#6366f1" } }),
    prisma.tag.upsert({ where: { userId_name: { userId: user.id, name: "Crypto" } }, update: {}, create: { userId: user.id, name: "Crypto", color: "#f59e0b" } }),
    prisma.tag.upsert({ where: { userId_name: { userId: user.id, name: "Breakout" } }, update: {}, create: { userId: user.id, name: "Breakout", color: "#10b981" } }),
    prisma.tag.upsert({ where: { userId_name: { userId: user.id, name: "Earnings" } }, update: {}, create: { userId: user.id, name: "Earnings", color: "#ef4444" } }),
  ]);

  // Create sample trades
  const trades = [
    { ticker: "AAPL", direction: "LONG", tradeType: "DAY", quantity: 100, entryPrice: 175.5, exitPrice: 178.2, entryAt: new Date("2024-01-08T09:35:00Z"), exitAt: new Date("2024-01-08T14:20:00Z"), stopLoss: 174.0, fees: 2.0, tagIds: [techTag.id, breakoutTag.id] },
    { ticker: "TSLA", direction: "SHORT", tradeType: "DAY", quantity: 50, entryPrice: 248.0, exitPrice: 241.5, entryAt: new Date("2024-01-09T10:00:00Z"), exitAt: new Date("2024-01-09T15:30:00Z"), stopLoss: 252.0, fees: 1.5, tagIds: [techTag.id] },
    { ticker: "BTC/USD", direction: "LONG", tradeType: "SWING", assetClass: "CRYPTO", quantity: 0.5, entryPrice: 42000, exitPrice: 45200, entryAt: new Date("2024-01-10T08:00:00Z"), exitAt: new Date("2024-01-15T16:00:00Z"), stopLoss: 40000, fees: 15, tagIds: [cryptoTag.id] },
    { ticker: "NVDA", direction: "LONG", tradeType: "DAY", quantity: 30, entryPrice: 495.0, exitPrice: 488.0, entryAt: new Date("2024-01-11T09:45:00Z"), exitAt: new Date("2024-01-11T11:30:00Z"), stopLoss: 490.0, fees: 1.0, tagIds: [techTag.id, earningsTag.id] },
    { ticker: "AAPL", direction: "LONG", tradeType: "SWING", quantity: 75, entryPrice: 182.0, exitPrice: 191.5, entryAt: new Date("2024-01-16T09:30:00Z"), exitAt: new Date("2024-01-22T14:00:00Z"), stopLoss: 178.0, takeProfit: 195.0, fees: 2.5, tagIds: [techTag.id, breakoutTag.id] },
    { ticker: "SPY", direction: "SHORT", tradeType: "DAY", quantity: 20, entryPrice: 470.0, exitPrice: 471.5, entryAt: new Date("2024-01-17T09:35:00Z"), exitAt: new Date("2024-01-17T12:00:00Z"), stopLoss: 472.0, fees: 0.8, tagIds: [] },
  ];

  for (const t of trades) {
    const { tagIds, ...tradeData } = t;
    const rawPnl = t.direction === "LONG"
      ? (t.exitPrice - t.entryPrice) * t.quantity
      : (t.entryPrice - t.exitPrice) * t.quantity;
    const pnl = rawPnl - t.fees;
    const outcome = pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BREAKEVEN";

    await prisma.trade.create({
      data: {
        userId: user.id,
        assetClass: "STOCK",
        ...tradeData,
        status: "CLOSED",
        pnl: pnl.toFixed(8),
        pnlPercent: ((rawPnl / (t.entryPrice * t.quantity)) * 100).toFixed(4),
        outcome,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
  }

  console.log(`✅ Seeded user: demo@tradejournal.com / password123`);
  console.log(`✅ Created ${trades.length} sample trades`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
