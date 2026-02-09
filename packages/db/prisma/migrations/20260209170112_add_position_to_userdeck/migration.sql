-- AlterTable
ALTER TABLE "UserDeck" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "UserDeck_userId_position_idx" ON "UserDeck"("userId", "position");
