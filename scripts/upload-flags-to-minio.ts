import { Client as MinioClient } from 'minio';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
const MINIO_BUCKET = 'memolist-flags';  // Nouveau bucket pour les drapeaux
const FLAGS_DIR = './apps/worker/storage/drapeaux';

async function uploadFlags() {
  console.log('🚀 Démarrage de l\'upload des drapeaux vers MinIO...\n');

  // 1. Initialiser le client MinIO
  const client = new MinioClient({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: false,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  });

  console.log(`📡 Connexion à MinIO: ${MINIO_ENDPOINT}:${MINIO_PORT}`);

  // 2. Créer le bucket s'il n'existe pas
  const bucketExists = await client.bucketExists(MINIO_BUCKET);
  if (!bucketExists) {
    await client.makeBucket(MINIO_BUCKET);
    console.log(`✓ Bucket créé: ${MINIO_BUCKET}`);
  } else {
    console.log(`✓ Bucket existant: ${MINIO_BUCKET}`);
  }

  // 3. Rendre le bucket public (lecture seule)
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`]
      }
    ]
  };

  await client.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
  console.log(`✓ Bucket configuré en lecture publique\n`);

  // 4. Lire tous les fichiers SVG
  const files = await readdir(FLAGS_DIR);
  const svgFiles = files.filter(f => f.endsWith('.svg'));

  console.log(`📁 ${svgFiles.length} drapeaux trouvés dans ${FLAGS_DIR}\n`);

  // 5. Uploader chaque fichier
  let uploaded = 0;
  let skipped = 0;

  for (const filename of svgFiles) {
    const filePath = path.join(FLAGS_DIR, filename);

    try {
      // Vérifier si le fichier existe déjà
      try {
        await client.statObject(MINIO_BUCKET, filename);
        console.log(`⏭️  ${filename} (déjà existant)`);
        skipped++;
        continue;
      } catch (err: any) {
        // Fichier n'existe pas, on continue l'upload
        if (err.code !== 'NotFound') throw err;
      }

      const fileBuffer = await readFile(filePath);

      await client.putObject(
        MINIO_BUCKET,
        filename,
        fileBuffer,
        fileBuffer.length,
        { 'Content-Type': 'image/svg+xml' }
      );

      console.log(`✓ ${filename}`);
      uploaded++;
    } catch (error: any) {
      console.error(`❌ Erreur pour ${filename}:`, error.message);
    }
  }

  console.log(`\n✅ Upload terminé !`);
  console.log(`   - Uploadés: ${uploaded}`);
  console.log(`   - Ignorés (déjà présents): ${skipped}`);
  console.log(`   - Total: ${svgFiles.length}`);
  console.log(`\n📍 URL de base: http://${MINIO_ENDPOINT}:${MINIO_PORT}/${MINIO_BUCKET}/`);
  console.log(`📍 Via Nginx: https://memoo.fr/storage/flags/`);
}

uploadFlags().catch((error) => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
