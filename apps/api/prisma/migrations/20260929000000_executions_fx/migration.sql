-- AlterTable
ALTER TABLE "executions" ADD COLUMN "fxRate" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "trades" ADD COLUMN "exitFxRate" DECIMAL(10,4),
ADD COLUMN "fxPnl" DECIMAL(18,8);

-- Backfill: one ENTRY fill per existing trade. Open trades keep their fees on the entry;
-- closed trades put all fees on the exit, so the recomputed P&L is unchanged.
-- Existing trades only have one fx rate, so it is used for both entry and exit.
INSERT INTO "executions" ("id", "tradeId", "type", "price", "quantity", "fees", "fxRate", "executedAt")
SELECT gen_random_uuid()::text, t."id", 'ENTRY', t."entryPrice", t."quantity",
       CASE WHEN t."exitPrice" IS NULL THEN t."fees" ELSE 0 END,
       CASE WHEN t."currency" = 'USD' THEN t."fxRate" END,
       t."entryAt"
FROM "trades" t
WHERE NOT EXISTS (SELECT 1 FROM "executions" e WHERE e."tradeId" = t."id");

-- Backfill: one EXIT fill per closed trade
INSERT INTO "executions" ("id", "tradeId", "type", "price", "quantity", "fees", "fxRate", "executedAt")
SELECT gen_random_uuid()::text, t."id", 'EXIT', t."exitPrice", t."quantity", t."fees",
       CASE WHEN t."currency" = 'USD' THEN t."fxRate" END,
       GREATEST(COALESCE(t."exitAt", t."updatedAt"), t."entryAt")
FROM "trades" t
WHERE t."exitPrice" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "executions" e WHERE e."tradeId" = t."id" AND e."type" = 'EXIT');

-- Same rate on entry and exit → no currency effect on existing USD trades
UPDATE "trades"
SET "exitFxRate" = "fxRate", "fxPnl" = 0
WHERE "currency" = 'USD' AND "exitPrice" IS NOT NULL;
