-- AlterTable
ALTER TABLE "Deck" ADD COLUMN "allowedModes" JSONB;

-- AlterTable
ALTER TABLE "Card" ADD COLUMN "fillBlanks" JSONB;
ALTER TABLE "Card" ADD COLUMN "allowedModes" JSONB;
