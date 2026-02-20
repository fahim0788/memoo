import { PrismaClient } from "@prisma/client";

// Singleton pattern pour éviter les connexions multiples
const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Export tous les types Prisma
export * from "@prisma/client";

// Export par défaut
export default prisma;
