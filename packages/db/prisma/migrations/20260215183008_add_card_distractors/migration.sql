-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "distractors" JSONB NOT NULL DEFAULT '[]';
