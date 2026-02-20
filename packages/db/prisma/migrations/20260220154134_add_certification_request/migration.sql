-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "Deck" ADD COLUMN "certificationRequestId" TEXT;

-- CreateTable
CREATE TABLE "CertificationRequest" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "certCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deckId" TEXT,
    "errorLog" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificationRequest_status_createdAt_idx" ON "CertificationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CertificationRequest_adminId_createdAt_idx" ON "CertificationRequest"("adminId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationRequest_certCode_key" ON "CertificationRequest"("certCode");

-- AddForeignKey
ALTER TABLE "CertificationRequest" ADD CONSTRAINT "CertificationRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_certificationRequestId_fkey" FOREIGN KEY ("certificationRequestId") REFERENCES "CertificationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
