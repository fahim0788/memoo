-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "audioUrlEn" TEXT,
ADD COLUMN     "audioUrlFr" TEXT;

-- CreateTable
CREATE TABLE "TtsJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deckId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalPhrases" INTEGER NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "phrases" JSONB NOT NULL,
    "resultUrls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TtsJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TtsJob_status_createdAt_idx" ON "TtsJob"("status", "createdAt");
