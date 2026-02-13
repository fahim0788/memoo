import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Sert les fichiers audio TTS depuis /storage/tts/
 * En production: nginx sert directement depuis le volume partagé
 * En dev sans Docker: cette route sert les fichiers depuis le workspace
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const filepath = params.path?.join("/") || "";

    if (filepath.includes("..")) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    if (!filepath.endsWith(".mp3") && !filepath.endsWith(".wav")) {
      return new NextResponse("Only audio files are allowed", { status: 400 });
    }

    // Try TTS_STORAGE_PATH env first (Docker), then local workspace path
    const storageDir = process.env.TTS_STORAGE_PATH
      || path.join(process.cwd(), "..", "..", "apps", "worker", "storage", "tts");
    const fullPath = path.join(storageDir, filepath);

    const fileBuffer = await readFile(fullPath);

    const ext = path.extname(filepath).toLowerCase();
    const contentType = ext === ".wav" ? "audio/wav" : "audio/mpeg";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return new NextResponse("Audio file not found", { status: 404 });
    }
    console.error("Error serving TTS file:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
