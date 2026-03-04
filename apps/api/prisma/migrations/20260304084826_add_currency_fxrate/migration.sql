-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'SEK',
ADD COLUMN     "fxRate" DECIMAL(10,4);
