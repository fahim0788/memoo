# TTS Implementation - Summary

## ✅ Ce qui a été implémenté

### 1. Architecture Backend

#### Base de données (Prisma)
- **Nouvelle table `TtsJob`** pour gérer les jobs de génération asynchrone
  - Statuts : `pending`, `processing`, `completed`, `failed`
  - Tracking de progression (`processedCount` / `totalPhrases`)
  - Stockage des résultats (URLs des MP3 générés)

- **Modification de la table `Card`**
  - Ajout de `audioUrlEn` et `audioUrlFr` pour stocker les URLs des MP3

#### API Routes ([apps/api/app/api/[...path]/route.ts](apps/api/app/api/[...path]/route.ts))
- **POST /api/tts/generate**
  - Validation des entrées (max 200 phrases)
  - Vérification des permissions (seul le propriétaire du deck)
  - Création d'un job en DB
  - Réponse immédiate avec `jobId` (202 Accepted)

- **GET /api/tts/status/:jobId**
  - Récupération du statut du job
  - Progression en temps réel
  - URLs des fichiers générés

#### Background Worker ([apps/worker](apps/worker/))
- **Service autonome** qui tourne en parallèle de l'API
- **Polling de la DB** toutes les 5 secondes pour trouver des jobs `pending`
- **Traitement asynchrone** avec :
  - Appels à l'API OpenAI TTS (`gpt-4o-mini-tts`)
  - Retry logic avec exponential backoff
  - Rate limiting (500ms entre chaque requête)
  - Gestion d'erreurs robuste
- **Stockage des MP3** en local dans un volume Docker partagé
- **Mise à jour automatique** des Cards avec les URLs audio

### 2. Infrastructure

#### Docker Compose
- **Nouveau service `worker`** avec :
  - Build dédié (Node.js + TypeScript + Prisma)
  - Variables d'environnement (`OPENAI_API_KEY`, etc.)
  - Volume partagé `tts-storage`
  - Healthcheck sur la DB

#### Nginx
- **Serving statique** des fichiers MP3 via `/storage/tts/`
- **Cache headers** (1 an, immutable)
- **Content-Type** automatique (`audio/mpeg`)

#### Volumes Docker
- **`tts-storage`** : Volume persistant partagé entre API, Worker et Nginx
  - API : peut potentiellement servir via Next.js
  - Worker : écrit les MP3
  - Nginx : sert les fichiers statiques (plus performant)

### 3. Fonctionnalités

#### Génération TTS
- Voix différentes pour EN (`alloy`) et FR (`verse`)
- Support de textes de toute longueur
- Génération par batch (jusqu'à 200 phrases/job)
- Nommage des fichiers basé sur `cardId` ou auto-généré

#### Sécurité
- Authentification JWT requise
- Vérification des permissions (ownership du deck)
- Clé OpenAI stockée côté serveur uniquement
- Limite de 200 phrases par job

#### Monitoring
- Logs structurés dans le worker
- Tracking de progression en DB
- Messages d'erreur détaillés

## 🚧 Ce qui reste à faire (optionnel)

### 1. Migration vers S3 (recommandé pour production)

**Pourquoi ?**
- Les volumes Docker peuvent être perdus lors de redéploiements
- S3 offre une meilleure scalabilité et durabilité
- Permet d'utiliser CloudFront pour le CDN

**Implémentation :**

```typescript
// apps/worker/src/tts-processor.ts

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function saveAudioFile(
  audioBuffer: ArrayBuffer,
  filename: string
): Promise<string> {
  if (STORAGE_TYPE === "s3") {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: filename,
        Body: Buffer.from(audioBuffer),
        ContentType: "audio/mpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
  }

  // ... existing local storage code
}
```

**Variables d'environnement à ajouter :**
```bash
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=memolist-tts
```

### 2. Déduplication des fichiers

**Problème :** Si 10 utilisateurs créent le même deck, les mêmes MP3 sont générés 10 fois.

**Solution :** Hash les textes et vérifier si le fichier existe déjà avant de générer.

```typescript
import crypto from "crypto";

function getAudioHash(text: string, voice: string): string {
  return crypto.createHash("sha256").update(`${text}-${voice}`).digest("hex");
}

async function generateAudio(text: string, voice: string): Promise<string> {
  const hash = getAudioHash(text, voice);
  const filename = `${hash}.mp3`;

  // Vérifier si le fichier existe déjà
  const existingUrl = await checkIfFileExists(filename);
  if (existingUrl) {
    console.log(`[TTS] Cache hit: ${filename}`);
    return existingUrl;
  }

  // Sinon, générer
  const audioBuffer = await openai.audio.speech.create(...);
  return await saveAudioFile(audioBuffer, filename);
}
```

### 3. Interface utilisateur

Créer une UI dans [apps/web](apps/web/) pour :
- Lancer la génération TTS pour un deck
- Afficher la progression en temps réel
- Prévisualiser les MP3 générés

```typescript
// apps/web/src/components/TtsGenerator.tsx

export function TtsGenerator({ deckId }: { deckId: string }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<TtsJobStatus | null>(null);

  const startGeneration = async () => {
    const res = await fetch("/api/tts/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ deckId, phrases }),
    });
    const { jobId } = await res.json();
    setJobId(jobId);
  };

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/tts/status/${jobId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const { job } = await res.json();
      setStatus(job);

      if (job.status === "completed" || job.status === "failed") {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div>
      <button onClick={startGeneration}>Générer TTS</button>
      {status && (
        <div>
          <p>Statut: {status.status}</p>
          <p>Progression: {status.processedCount}/{status.totalPhrases}</p>
        </div>
      )}
    </div>
  );
}
```

### 4. Gestion avancée des jobs

- **Annulation de job** : Endpoint DELETE /api/tts/jobs/:jobId
- **Reprise après erreur** : Auto-retry des jobs failed
- **Queue priority** : Priorité pour les decks publics vs privés
- **Job cleanup** : Suppression automatique des vieux jobs (>30 jours)

### 5. Webhook / Server-Sent Events

Au lieu de polling, utiliser SSE pour notifier le client en temps réel :

```typescript
// apps/api
export async function GET(req: NextRequest) {
  if (pathname.startsWith("/api/tts/stream/")) {
    const jobId = pathname.split("/").pop();

    const stream = new ReadableStream({
      async start(controller) {
        const interval = setInterval(async () => {
          const job = await prisma.ttsJob.findUnique({ where: { id: jobId } });
          controller.enqueue(`data: ${JSON.stringify(job)}\n\n`);

          if (job?.status === "completed" || job?.status === "failed") {
            clearInterval(interval);
            controller.close();
          }
        }, 1000);
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}
```

### 6. Tests

```typescript
// apps/worker/src/__tests__/tts-processor.test.ts

describe("TTS Processor", () => {
  it("should generate audio for a phrase", async () => {
    const job = { id: "test-job", phrases: [...], totalPhrases: 1 };
    const results = await processTtsJob(job, prisma);

    expect(results).toHaveLength(1);
    expect(results[0].audioUrlEn).toMatch(/\.mp3$/);
    expect(results[0].audioUrlFr).toMatch(/\.mp3$/);
  });

  it("should handle rate limiting gracefully", async () => {
    // Mock OpenAI to return 429
    // Verify exponential backoff works
  });
});
```

## 📊 Estimation des coûts

### OpenAI TTS Pricing
- **Modèle :** `gpt-4o-mini-tts`
- **Prix :** $15 / 1M caractères

### Exemples
| Scénario | Caractères | Coût |
|----------|-----------|------|
| 1 deck de 50 phrases (20 car/phrase, EN+FR) | 2000 | $0.03 |
| 100 decks publics (50 phrases chacun) | 200,000 | $3.00 |
| 1000 utilisateurs créant leur deck | 2,000,000 | $30.00 |

### Recommandations
1. **Limiter la génération** aux decks publics uniquement (one-shot lors de la création)
2. **Cacher les résultats** avec déduplication par hash
3. **Monitorer les coûts** via OpenAI dashboard

## 🔐 Sécurité

### Implémenté
✅ Clé API côté serveur uniquement
✅ Authentification JWT requise
✅ Vérification du ownership du deck
✅ Limite de 200 phrases par job

### À ajouter (optionnel)
- Rate limiting par utilisateur (max 5 jobs/jour)
- Validation du contenu (pas de textes malveillants)
- Audit log des générations

## 📖 Documentation

- **[TTS_SETUP.md](TTS_SETUP.md)** : Guide complet de configuration
- **[TTS_QUICKSTART.md](TTS_QUICKSTART.md)** : Guide de démarrage rapide

## 🎯 Prochaines étapes recommandées

1. **Tester localement** avec le script `test-tts.sh`
2. **Appliquer la migration** Prisma en production
3. **Déployer le worker** avec `OPENAI_API_KEY`
4. **Migrer vers S3** pour la production
5. **Implémenter la déduplication** pour économiser les coûts
6. **Créer l'UI** pour la génération TTS

## ❓ Questions / Support

Pour toute question sur l'implémentation :
1. Vérifier les logs : `docker-compose logs -f worker`
2. Consulter la documentation : [TTS_SETUP.md](TTS_SETUP.md)
3. Tester avec curl : voir [TTS_QUICKSTART.md](TTS_QUICKSTART.md)
