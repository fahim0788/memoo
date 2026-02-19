-- AlterTable: make password optional (null for OAuth accounts)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: add auth provider field (EMAIL or GOOGLE)
ALTER TABLE "User" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'EMAIL';
