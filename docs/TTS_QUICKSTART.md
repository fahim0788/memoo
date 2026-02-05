# TTS Quick Start Guide

Guide rapide pour mettre en place le système de génération TTS.

## Étapes d'installation

### 1. Ajouter la clé API OpenAI

Ajoutez `OPENAI_API_KEY` à votre fichier de configuration :

```bash
# Créer/modifier config.json à la racine du projet
{
  "DATABASE_URL": "postgresql://...",
  "JWT_SECRET": "...",
  "OPENAI_API_KEY": "sk-proj-YOUR-KEY-HERE"
}
```

### 2. Appliquer la migration Prisma

```bash
cd apps/api
npx prisma migrate dev --name add-tts-support
```

Ou en production :
```bash
docker-compose exec api npx prisma migrate deploy
```

### 3. Installer les dépendances du worker

```bash
cd apps/worker
npm install
```

### 4. Lancer les services

**Développement (sans Docker) :**
```bash
# Terminal 1 - API
cd apps/api
npm run dev

# Terminal 2 - Worker
cd apps/worker
npm run dev
```

**Production (avec Docker) :**
```bash
docker-compose up -d --build
```

### 5. Vérifier que tout fonctionne

```bash
# Vérifier les logs du worker
docker-compose logs -f worker

# Vous devriez voir :
# [Worker] Starting TTS worker...
# [Worker] OpenAI API Key: ✓ Set
# [Worker] Database connected
```

## Test rapide avec curl

### 1. Créer un utilisateur (si pas déjà fait)

```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Récupérez le `token` de la réponse.

### 2. Créer un deck

```bash
export TOKEN="<votre-token-jwt>"

curl -X POST http://localhost/api/my-decks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test TTS Deck",
    "cards": [
      {
        "question": "What is your name?",
        "answers": ["Comment vous appelez-vous ?"]
      }
    ]
  }'
```

Récupérez le `deck.id` de la réponse.

### 3. Créer un job TTS

```bash
export DECK_ID="<votre-deck-id>"

curl -X POST http://localhost/api/tts/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"deckId\": \"$DECK_ID\",
    \"phrases\": [
      {
        \"textEn\": \"Hello, how are you?\",
        \"textFr\": \"Bonjour, comment allez-vous ?\"
      },
      {
        \"textEn\": \"Good morning\",
        \"textFr\": \"Bonjour\"
      }
    ]
  }"
```

Récupérez le `jobId` de la réponse.

### 4. Vérifier le statut du job

```bash
export JOB_ID="<votre-job-id>"

# Vérifier plusieurs fois jusqu'à ce que status soit "completed"
curl -X GET "http://localhost/api/tts/status/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Accéder aux fichiers audio

Une fois le job complété, les URLs seront dans `job.resultUrls` :

```bash
# Exemple :
curl http://localhost/storage/tts/<job-id>_0_en.mp3 --output test_en.mp3
curl http://localhost/storage/tts/<job-id>_0_fr.mp3 --output test_fr.mp3
```

## Script de test automatisé

Créez un fichier `test-tts.sh` :

```bash
#!/bin/bash

API_URL="http://localhost/api"

# 1. Login
echo "🔐 Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# 2. Créer un deck
echo ""
echo "📦 Création d'un deck..."
DECK_RESPONSE=$(curl -s -X POST "$API_URL/my-decks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"TTS Test Deck","cards":[{"question":"test","answers":["test"]}]}')

DECK_ID=$(echo $DECK_RESPONSE | jq -r '.deck.id')
echo "Deck ID: $DECK_ID"

# 3. Créer un job TTS
echo ""
echo "🎤 Création d'un job TTS..."
JOB_RESPONSE=$(curl -s -X POST "$API_URL/tts/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"deckId\":\"$DECK_ID\",\"phrases\":[{\"textEn\":\"Hello world\",\"textFr\":\"Bonjour le monde\"}]}")

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.jobId')
echo "Job ID: $JOB_ID"

# 4. Poller le statut
echo ""
echo "⏳ Attente de la génération..."
while true; do
  STATUS_RESPONSE=$(curl -s -X GET "$API_URL/tts/status/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN")

  STATUS=$(echo $STATUS_RESPONSE | jq -r '.job.status')
  PROCESSED=$(echo $STATUS_RESPONSE | jq -r '.job.processedCount')
  TOTAL=$(echo $STATUS_RESPONSE | jq -r '.job.totalPhrases')

  echo "Statut: $STATUS ($PROCESSED/$TOTAL)"

  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "✅ Job terminé !"
    echo $STATUS_RESPONSE | jq '.job.resultUrls'
    break
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ Job échoué !"
    echo $STATUS_RESPONSE | jq '.job.errorMessage'
    break
  fi

  sleep 2
done
```

Rendre exécutable et lancer :
```bash
chmod +x test-tts.sh
./test-tts.sh
```

## Problèmes fréquents

### "OpenAI API Key: ✗ Missing"

Vérifiez que `OPENAI_API_KEY` est dans `config.json` et relancez :
```bash
docker-compose down
docker-compose up -d --build
```

### "Database not found"

Appliquez la migration :
```bash
docker-compose exec api npx prisma migrate deploy
```

### Worker ne traite pas les jobs

Vérifiez les logs :
```bash
docker-compose logs -f worker
```

Vérifiez la connexion DB :
```bash
docker-compose exec worker npx prisma db pull
```

### Fichiers MP3 inaccessibles (404)

Vérifiez le volume :
```bash
docker volume inspect memolist-mvp_tts-storage
docker-compose exec nginx ls -la /app/storage/tts
```

## Monitoring

Pour voir l'activité en temps réel :

```bash
# Worker logs
docker-compose logs -f worker

# Nginx access logs
docker-compose logs -f nginx

# Database jobs
docker-compose exec db psql -U memolist -c "SELECT id, status, processedCount, totalPhrases FROM \"TtsJob\" ORDER BY createdAt DESC LIMIT 10;"
```
