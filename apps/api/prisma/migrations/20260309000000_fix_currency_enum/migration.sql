-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('SEK', 'USD');

-- AlterTable: convert currency column from TEXT to enum
ALTER TABLE "trades" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::"Currency";
ALTER TABLE "trades" ALTER COLUMN "currency" SET DEFAULT 'SEK'::"Currency";
