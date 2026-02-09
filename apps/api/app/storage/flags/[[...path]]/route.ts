import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * Sert les fichiers SVG des drapeaux depuis /storage/flags/
 * En production: nginx proxy vers MinIO
 * En dev: cette route sert les fichiers directement
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const filepath = params.path?.join("/") || "";

    // Sécurité: empêcher la traversée de répertoires
    if (filepath.includes("..") || filepath.includes("/")) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    // Vérifier que c'est un fichier SVG
    if (!filepath.endsWith(".svg")) {
      return new NextResponse("Only SVG files are allowed", { status: 400 });
    }

    // Chemin vers le dossier des drapeaux
    const flagsDir = path.join(process.cwd(), "..", "..", "apps", "worker", "storage", "drapeaux");
    const fullPath = path.join(flagsDir, filepath);

    // Lire le fichier
    const fileBuffer = await readFile(fullPath);

    // Retourner le fichier avec les bons headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error: any) {
    if (error.code === "ENOENT") {
      return new NextResponse("Flag not found", { status: 404 });
    }
    console.error("Error serving flag:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
