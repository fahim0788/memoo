import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { Client as MinioClient } from "minio";

// Storage config
const STORAGE_TYPE = process.env.STORAGE_TYPE || "local"; // local | minio

// Local config
const TTS_STORAGE_PATH = process.env.TTS_STORAGE_PATH || "../worker/storage/tts";

// MinIO config
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "localhost";
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "9000", 10);
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === "true";
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "minioadmin";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "minioadmin";
const MINIO_BUCKET = process.env.MINIO_BUCKET || "memolist-tts";

// MinIO client (lazy init)
let minioClient: MinioClient | null = null;

function getMinioClient(): MinioClient {
  if (!minioClient) {
    minioClient = new MinioClient({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
  }
  return minioClient;
}

async function getFileFromMinio(filename: string): Promise<Buffer> {
  const client = getMinioClient();
  const stream = await client.getObject(MINIO_BUCKET, filename);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

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

  try {
    let buffer: Buffer;

    if (STORAGE_TYPE === "minio") {
      buffer = await getFileFromMinio(filename);
    } else {
      // Local filesystem
      const filePath = resolve(process.cwd(), TTS_STORAGE_PATH, filename);

      // Vérifie que le fichier résolu reste dans le dossier autorisé
      const allowedDir = resolve(process.cwd(), TTS_STORAGE_PATH);
      if (!filePath.startsWith(allowedDir)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }

      buffer = await readFile(filePath);
    }

    return new NextResponse(new Uint8Array(buffer), {
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
