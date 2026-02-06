/**
 * Script pour lister toutes les tables de la base de données
 *
 * Usage:
 *   npx tsx packages/db/list-tables.ts
 */

import "dotenv/config";
import { prisma } from "./index.js";

async function main() {
  console.log("[DB] Connexion à la base de données...\n");

  try {
    // Query pour lister toutes les tables dans le schema public
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log(`📊 Tables trouvées: ${tables.length}\n`);

    for (const table of tables) {
      // Compter le nombre de lignes dans chaque table
      const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM "${table.tablename}"`
      );

      const rowCount = Number(count[0].count);
      console.log(`  ✓ ${table.tablename.padEnd(25)} (${rowCount} lignes)`);
    }

    console.log("\n[DB] Terminé !");
  } catch (error) {
    console.error("[DB] Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
