-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "aiVerify" BOOLEAN;

-- AlterTable
ALTER TABLE "Deck" ADD COLUMN     "aiVerify" BOOLEAN NOT NULL DEFAULT true;
