# TTS Background Worker

Service de traitement asynchrone pour la génération de synthèse vocale via OpenAI TTS.

## Description

Ce worker tourne en arrière-plan et traite les jobs de génération TTS créés via l'API. Il :
- Poll la base de données toutes les 5 secondes
- Génère des fichiers MP3 via OpenAI TTS API
- Stocke les résultats dans un volume Docker partagé
- Met à jour les Cards avec les URLs audio

## Architecture

```
┌─────────┐     ┌─────────┐     ┌──────────┐
│   API   │────▶│ TtsJob  │◀────│  Worker  │
│ (POST)  │     │  (DB)   │     │ (Polling)│
└─────────┘     └─────────┘     └──────────┘
                                      │
                                      ▼
                                ┌──────────┐
                                │ OpenAI   │
                                │   TTS    │
                                └──────────┘
                                      │
                                      ▼
                                ┌──────────┐
                                │ Storage  │
                                │ (Volume) │
                                └──────────┘
```

## Développement local

### Prérequis
- Node.js 20+
- PostgreSQL avec le schéma Prisma appliqué
- Clé API OpenAI

### Installation

```bash
npm install
```

### Variables d'environnement

Créer un fichier `.env` :

```bash
DATABASE_URL=postgresql://memolist:memolist@localhost:5432/memolist
OPENAI_API_KEY=sk-proj-...
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./storage/tts
PUBLIC_BASE_URL=http://localhost:3001/storage/tts
POLL_INTERVAL_MS=5000
```

### Lancer en mode dev

```bash
npm run dev
```

Vous devriez voir :
```
[Worker] Starting TTS worker...
[Worker] Poll interval: 5000ms
[Worker] OpenAI API Key: ✓ Set
[Worker] Database connected
```

## Utilisation avec Docker

### Build

```bash
docker build -t memolist-worker .
```

### Run

```bash
docker run -d \
  --name memolist-worker \
  -e DATABASE_URL=postgresql://... \
  -e OPENAI_API_KEY=sk-proj-... \
  -v tts-storage:/app/storage/tts \
  memolist-worker
```

### Logs

```bash
docker logs -f memolist-worker
```

## Configuration

### Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DATABASE_URL` | *requis* | URL de connexion PostgreSQL |
| `OPENAI_API_KEY` | *requis* | Clé API OpenAI |
| `STORAGE_TYPE` | `local` | Type de stockage (`local` ou `s3`) |
| `LOCAL_STORAGE_PATH` | `/app/storage/tts` | Chemin du stockage local |
| `PUBLIC_BASE_URL` | - | URL publique pour accéder aux MP3 |
| `POLL_INTERVAL_MS` | `5000` | Intervalle de polling (ms) |

### Stockage S3 (à implémenter)

Pour migrer vers S3, ajouter :

```bash
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=memolist-tts
```

## Monitoring

### Healthcheck

Le worker n'expose pas de port HTTP. Pour vérifier qu'il fonctionne :

```bash
# Vérifier les logs
docker logs memolist-worker --tail 50

# Vérifier les jobs en cours
docker exec memolist-worker npx prisma db execute \
  --stdin <<< "SELECT * FROM \"TtsJob\" WHERE status='processing';"
```

### Métriques

Ajouter ces queries SQL pour le monitoring :

```sql
-- Jobs en attente
SELECT COUNT(*) FROM "TtsJob" WHERE status = 'pending';

-- Jobs en cours
SELECT COUNT(*) FROM "TtsJob" WHERE status = 'processing';

-- Jobs complétés (dernières 24h)
SELECT COUNT(*) FROM "TtsJob"
WHERE status = 'completed'
  AND "completedAt" > NOW() - INTERVAL '24 hours';

-- Taux d'échec
SELECT
  COUNT(CASE WHEN status = 'failed' THEN 1 END)::float / COUNT(*) * 100 as failure_rate
FROM "TtsJob"
WHERE "createdAt" > NOW() - INTERVAL '24 hours';
```

## Dépannage

### Worker ne démarre pas

1. Vérifier DATABASE_URL :
   ```bash
   docker exec memolist-worker env | grep DATABASE_URL
   ```

2. Vérifier la connexion DB :
   ```bash
   docker exec memolist-worker npx prisma db pull
   ```

### Jobs bloqués en "pending"

1. Vérifier les logs :
   ```bash
   docker logs memolist-worker --tail 100
   ```

2. Relancer le worker :
   ```bash
   docker restart memolist-worker
   ```

### Rate limiting (429 errors)

Le worker gère automatiquement les rate limits avec exponential backoff. Si le problème persiste :

1. Augmenter `POLL_INTERVAL_MS` à 10000 (10 secondes)
2. Vérifier votre quota OpenAI
3. Réduire le nombre de jobs simultanés

### Fichiers MP3 non créés

1. Vérifier les permissions du volume :
   ```bash
   docker exec memolist-worker ls -la /app/storage/tts
   ```

2. Vérifier l'espace disque :
   ```bash
   docker exec memolist-worker df -h
   ```

## Tests

```bash
# Unit tests
npm test

# Test avec un job réel
npm run test:integration
```

## Performance

### Temps de traitement estimé

- 1 phrase (EN + FR) : ~3-5 secondes
- 50 phrases : ~3-5 minutes
- 200 phrases (max) : ~10-20 minutes

### Optimisations possibles

1. **Parallélisation** : Traiter plusieurs phrases en parallèle (attention aux rate limits)
2. **Batch processing** : Grouper les requêtes OpenAI
3. **Déduplication** : Ne pas régénérer les phrases identiques

## Documentation

Voir la documentation complète :
- [Setup Guide](../../docs/TTS_SETUP.md)
- [Quick Start](../../docs/TTS_QUICKSTART.md)
- [Summary](../../docs/TTS_SUMMARY.md)
