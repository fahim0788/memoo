import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { resolve } from "path";

// Dev local : ../worker/storage/tts  (relatif à apps/api/)
// Docker   : /app/storage/tts        (volume monté)
const TTS_STORAGE_PATH = process.env.TTS_STORAGE_PATH || "../worker/storage/tts";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filename = path[path.length - 1];

  // Sécurité : empêcher path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  const filePath = resolve(process.cwd(), TTS_STORAGE_PATH, filename);

  // Vérifie que le fichier résolu reste dans le dossier autorisé
  const allowedDir = resolve(process.cwd(), TTS_STORAGE_PATH);
  if (!filePath.startsWith(allowedDir)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}
