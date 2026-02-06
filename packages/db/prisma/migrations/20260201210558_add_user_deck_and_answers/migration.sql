/*
  Warnings:

  - You are about to drop the column `answer` on the `Card` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Card" DROP COLUMN "answer",
ADD COLUMN     "answers" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "UserDeck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDeck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDeck_userId_deckId_key" ON "UserDeck"("userId", "deckId");

-- AddForeignKey
ALTER TABLE "UserDeck" ADD CONSTRAINT "UserDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeck" ADD CONSTRAINT "UserDeck_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
