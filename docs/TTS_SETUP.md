# TTS (Text-to-Speech) Background Worker

Ce document explique comment configurer et utiliser le système de génération audio TTS avec OpenAI.

## Architecture

Le système est composé de 3 parties :

1. **API Routes** (`apps/api`) - Routes pour créer des jobs et vérifier leur statut
2. **Background Worker** (`apps/worker`) - Service qui traite les jobs de manière asynchrone
3. **Stockage** - Volume Docker partagé pour les fichiers MP3 générés

## Configuration

### 1. Variables d'environnement

Ajoutez ces variables à votre fichier `.env` ou `config.json` :

```bash
# OpenAI API Key (REQUIS)
OPENAI_API_KEY=sk-proj-...

# Base URL publique pour les fichiers audio (optionnel)
PUBLIC_BASE_URL=http://localhost/storage/tts

# Intervalle de polling du worker en millisecondes (optionnel, défaut: 5000)
POLL_INTERVAL_MS=5000
```

### 2. Migration de la base de données

Appliquez les nouvelles tables (TtsJob, champs audio sur Card) :

```bash
cd apps/api
npx prisma migrate dev --name add-tts-support
```

### 3. Lancer les services

```bash
# Développement local
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Utilisation

### Créer un job de génération TTS

**Endpoint:** `POST /api/tts/generate`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Body:**
```json
{
  "deckId": "deck-id-123",
  "phrases": [
    {
      "textEn": "Hello, how are you?",
      "textFr": "Bonjour, comment allez-vous ?",
      "cardId": "card-id-456"
    },
    {
      "textEn": "Good morning",
      "textFr": "Bonjour",
      "cardId": "card-id-789"
    }
  ]
}
```

**Limites:**
- Maximum 200 phrases par job
- Seul le propriétaire du deck peut générer du TTS pour ses decks

**Réponse (202 Accepted):**
```json
{
  "ok": true,
  "jobId": "job-id-xyz"
}
```

### Vérifier le statut d'un job

**Endpoint:** `GET /api/tts/status/:jobId`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Réponse:**
```json
{
  "job": {
    "id": "job-id-xyz",
    "status": "completed",
    "totalPhrases": 2,
    "processedCount": 2,
    "errorMessage": null,
    "resultUrls": [
      {
        "cardId": "card-id-456",
        "audioUrlEn": "http://localhost/storage/tts/card-id-456_en.mp3",
        "audioUrlFr": "http://localhost/storage/tts/card-id-456_fr.mp3"
      },
      {
        "cardId": "card-id-789",
        "audioUrlEn": "http://localhost/storage/tts/card-id-789_en.mp3",
        "audioUrlFr": "http://localhost/storage/tts/card-id-789_fr.mp3"
      }
    ],
    "createdAt": "2026-02-02T10:00:00.000Z",
    "completedAt": "2026-02-02T10:05:00.000Z"
  }
}
```

**Statuts possibles:**
- `pending` - En attente de traitement
- `processing` - En cours de génération
- `completed` - Terminé avec succès
- `failed` - Échoué (voir `errorMessage`)

## Exemple d'intégration frontend

```typescript
// 1. Créer un job
const createTtsJob = async (deckId: string, phrases: Phrase[]) => {
  const response = await fetch('/api/tts/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ deckId, phrases })
  });

  const { jobId } = await response.json();
  return jobId;
};

// 2. Poller le statut
const pollJobStatus = async (jobId: string) => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/tts/status/${jobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const { job } = await response.json();

    if (job.status === 'completed') {
      clearInterval(interval);
      console.log('TTS généré!', job.resultUrls);
      // Mettre à jour l'UI avec les URLs audio
    } else if (job.status === 'failed') {
      clearInterval(interval);
      console.error('Échec:', job.errorMessage);
    } else {
      console.log(`Progression: ${job.processedCount}/${job.totalPhrases}`);
    }
  }, 2000); // Vérifier toutes les 2 secondes
};

// Utilisation
const jobId = await createTtsJob(deckId, phrases);
await pollJobStatus(jobId);
```

## Coûts OpenAI

- **Modèle:** `gpt-4o-mini-tts`
- **Prix:** ~$15 / 1M caractères
- **Exemple:** 100 phrases de 20 caractères (EN + FR) = 4000 caractères = $0.06

Pour limiter les coûts :
- La limite est fixée à 200 phrases par job
- Seuls les propriétaires de decks peuvent générer du TTS
- Les fichiers sont mis en cache (pas de régénération)

## Troubleshooting

### Le worker ne démarre pas

Vérifiez les logs :
```bash
docker-compose logs worker
```

Vérifiez que `OPENAI_API_KEY` est définie :
```bash
docker-compose exec worker env | grep OPENAI
```

### Job bloqué en "pending"

1. Vérifier que le worker tourne :
   ```bash
   docker-compose ps worker
   ```

2. Vérifier les logs du worker :
   ```bash
   docker-compose logs -f worker
   ```

### Rate limiting (429 errors)

Le worker gère automatiquement les rate limits avec :
- Exponential backoff
- Retry logic (3 tentatives)
- Délai de 500ms entre chaque requête

Si vous avez beaucoup de jobs, augmentez `POLL_INTERVAL_MS`.

### Fichiers audio non accessibles

Vérifiez que nginx monte le volume :
```bash
docker-compose exec nginx ls /app/storage/tts
```

Vérifiez que le volume existe :
```bash
docker volume ls | grep tts-storage
```

## Migration vers S3 (production)

Pour éviter de stocker les MP3 localement, configurez S3 :

1. Modifiez `apps/worker/src/tts-processor.ts` pour implémenter `saveAudioFile()` avec AWS SDK
2. Ajoutez les variables d'environnement :
   ```bash
   STORAGE_TYPE=s3
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=memolist-tts
   ```

3. Les URLs retournées pointeront vers S3 au lieu de `/storage/tts/`

## Schéma de base de données

### Table TtsJob

```sql
CREATE TABLE "TtsJob" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "deckId" TEXT,
  "status" TEXT DEFAULT 'pending',
  "totalPhrases" INTEGER NOT NULL,
  "processedCount" INTEGER DEFAULT 0,
  "errorMessage" TEXT,
  "phrases" JSONB NOT NULL,
  "resultUrls" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "startedAt" TIMESTAMP,
  "completedAt" TIMESTAMP
);
```

### Modification table Card

```sql
ALTER TABLE "Card"
ADD COLUMN "audioUrlEn" TEXT,
ADD COLUMN "audioUrlFr" TEXT;
```
