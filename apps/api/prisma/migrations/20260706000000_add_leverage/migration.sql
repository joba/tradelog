-- AlterTable
ALTER TABLE "trades" ADD COLUMN "leverage" DECIMAL(8,2);

-- Backfill: extract leverage from tickers like "GOLD X10" → leverage=10, ticker="GOLD"
UPDATE "trades"
SET
  leverage = CAST(regexp_replace(ticker, '^.*X(\d+).*$', '\1') AS DECIMAL(8,2)),
  ticker   = trim(regexp_replace(ticker, '\s*X\d+', '', 'g'))
WHERE ticker ~ 'X\d+';
