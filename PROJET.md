# MemoList MVP

Application PWA de révision par répétition espacée, conçue pour l'apprentissage offline-first.

## Aperçu du projet

**MemoList** est une plateforme d'étude utilisant la technique scientifiquement prouvée de la répétition espacée. L'application est actuellement en phase MVP avec un contenu de 100 questions sur l'éducation civique française.

### Caractéristiques principales

- **Offline-first** : Fonctionne sans connexion grâce à IndexedDB + Service Worker
- **PWA installable** : S'installe sur mobile (iOS/Android) comme une app native
- **Répétition espacée** : Algorithme SM-2 adapté pour optimiser la mémorisation
- **Suivi quotidien** : Compteur de cartes étudiées par jour

---

## Stack technique

### Frontend (`apps/web/`)
| Technologie | Version | Rôle |
|-------------|---------|------|
| Next.js | 14.2.5 | Framework React avec App Router |
| React | 18.3.1 | Interface utilisateur |
| TypeScript | 5.4.5 | Typage statique |
| IndexedDB | Native | Stockage local offline |
| Service Worker | Native | Cache et fonctionnement offline |

### Backend (`apps/api/`)
| Technologie | Version | Rôle |
|-------------|---------|------|
| Next.js | 14.1.0 | API Routes |
| Prisma | 7.3.0 | ORM avec PostgreSQL |
| PostgreSQL | 16 | Base de données |
| Node.js | 20 | Runtime |

### Infrastructure
| Technologie | Rôle |
|-------------|------|
| Docker Compose | Orchestration des services |
| Nginx | Reverse proxy (optionnel) |

---

## Structure du projet

```
memolist-mvp/
├── apps/
│   ├── web/                    # Frontend PWA
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx  # Layout racine avec PWA
│   │   │   │   ├── page.tsx    # Interface d'étude principale
│   │   │   │   └── globals.css # Styles globaux (thème sombre)
│   │   │   └── lib/
│   │   │       ├── idb.ts      # Abstraction IndexedDB
│   │   │       ├── sr-engine.ts # Algorithme répétition espacée
│   │   │       ├── deck.ts     # Dataset des 100 questions
│   │   │       ├── api.ts      # Client API
│   │   │       ├── text.ts     # Validation des réponses
│   │   │       └── pwa-boot.tsx # Initialisation Service Worker
│   │   ├── public/
│   │   │   ├── manifest.webmanifest
│   │   │   ├── sw.js           # Service Worker
│   │   │   └── icons/          # Icônes de l'app
│   │   └── Dockerfile
│   │
│   └── api/                    # Backend API
│       ├── app/api/
│       │   ├── route.ts        # Router principal
│       │   └── health/route.ts # Health check
│       ├── prisma/
│       │   ├── schema.prisma   # Schéma BDD
│       │   └── migrations/     # Migrations
│       └── Dockerfile
│
├── infra/nginx/                # Configuration Nginx
├── scripts/dev.sh              # Script de développement
├── docker-compose.yml          # Orchestration Docker
└── .env                        # Variables d'environnement
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Utilisateur                          │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Nginx (Port 80) - Optionnel                │
│         /  → Web    |    /api → API                     │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼───────┐           ┌───────▼───────┐
│   Web (3000)  │           │   API (3001)  │
│   Next.js PWA │           │   Next.js     │
│               │           │               │
│ • React UI    │           │ • Route.ts    │
│ • IndexedDB   │           │ • Prisma ORM  │
│ • SW Cache    │           │ • Auth Token  │
│ • SR Engine   │           │               │
└───────────────┘           └───────┬───────┘
                                    │
                            ┌───────▼───────┐
                            │  PostgreSQL   │
                            │    (5432)     │
                            └───────────────┘
```

---

## Fonctionnement

### Flux utilisateur

1. L'utilisateur ouvre l'application
2. Le Service Worker s'enregistre et met en cache les assets
3. IndexedDB charge la progression sauvegardée
4. L'algorithme SR sélectionne la prochaine carte due
5. La question s'affiche
6. L'utilisateur tape sa réponse et valide
7. La réponse est normalisée et comparée
8. La carte est notée (facteur de difficulté ajusté)
9. Le résultat s'affiche (Correct ✅ ou Incorrect ❌)
10. IndexedDB persiste l'état
11. Boucle vers l'étape 4

### Algorithme de répétition espacée

L'état de chaque carte contient :
```typescript
{
  reps: number;           // Répétitions réussies
  intervalDays: number;   // Jours avant prochaine révision
  ease: number;           // Multiplicateur de difficulté (1.3–2.5)
  nextReviewAt: number;   // Timestamp prochaine révision
  successCount: number;   // Total réussites
  failureCount: number;   // Total échecs
}
```

**Réponse correcte** : ease +0.10, intervalle augmenté
**Réponse incorrecte** : ease -0.20, retour à 1 jour

### Validation des réponses

La normalisation inclut :
- Suppression des espaces superflus
- Conversion en minuscules
- Suppression des accents (é → e, ç → c)
- Suppression des caractères spéciaux

Correspondance partielle supportée : "Liberté Égalité" valide pour "Liberté, Égalité, Fraternité".

---

## Endpoints API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/health` | Status du serveur |
| GET | `/api/sync/pull` | Récupérer l'état serveur |
| POST | `/api/sync/push` | Envoyer l'historique |
| GET | `/api/decks` | Lister les decks |
| POST | `/api/decks` | Créer un deck |
| POST | `/api/decks/:id/cards` | Créer une carte |

**Authentification** : Header `X-Auth-Token: <AUTH_TOKEN>`

---

## Schéma de base de données

```
User (placeholder MVP)
├── id, email, firstName, lastName
├── password, isActive
└── timestamps

Deck
├── id, name
├── cards[]
└── timestamps

Card
├── id, deckId (FK)
├── question, answer
├── reviews[]
└── timestamps

Review
├── id, cardId (FK)
├── ok (Boolean)
├── userAnswer
└── reviewedAt
```

---

## Installation et démarrage

### Prérequis
- Docker & Docker Compose
- Node.js 20+ (pour le développement local)

### Configuration initiale

```bash
# Copier le template des variables d'environnement
cp .env.example .env

# Pour le dev local (sans Docker complet), créer aussi :
cp .env.example .env.local
# Puis modifier DATABASE_URL : @db:5432 → @localhost:5432
```

### Workflow de développement

#### Option 1 : Dev local (recommandé)

```bash
# Démarre PostgreSQL + apps en mode watch
./scripts/dev.sh local

# Accès :
# - Web : http://localhost:3000
# - API : http://localhost:3001
```

#### Option 2 : Tout en Docker

```bash
# Démarre tous les services (nginx, web, api, db)
./scripts/dev.sh docker

# Accès : http://localhost (via Nginx)
```

#### Commandes utiles

```bash
./scripts/dev.sh db      # PostgreSQL uniquement
./scripts/dev.sh stop    # Arrêter les conteneurs
./scripts/dev.sh logs    # Voir les logs
./scripts/dev.sh clean   # Supprimer volumes et conteneurs
```

### Déploiement VPS / Production

```bash
# 1. Cloner le repo sur le VPS
git clone <repo-url> && cd memolist-mvp

# 2. Configurer les variables de production
cp .env.example .env
# IMPORTANT: Modifier AUTH_TOKEN et POSTGRES_PASSWORD

# 3. Lancer en production
docker compose up --build -d

# 4. Vérifier le status
docker compose ps
```

### Structure des fichiers d'environnement

| Fichier | Usage | Committé |
|---------|-------|----------|
| `.env.example` | Template documenté | Oui |
| `.env` | Docker Compose (db@db:5432) | Non |
| `.env.local` | Dev local (db@localhost:5432) | Non |

### Variables d'environnement

```env
# Frontend (injectées au BUILD, pas au runtime)
NEXT_PUBLIC_API_BASE=/api
NEXT_PUBLIC_APP_NAME=MemoList

# Backend
DATABASE_URL=postgresql://user:pass@host:5432/db
AUTH_TOKEN=<générer: openssl rand -hex 32>

# PostgreSQL
POSTGRES_DB=memolist
POSTGRES_USER=memolist
POSTGRES_PASSWORD=<mot-de-passe-sécurisé>
```

---

## Limitations MVP

| Limitation | Description |
|------------|-------------|
| Mono-utilisateur | Token d'auth statique, pas de multi-tenancy |
| Deck hardcodé | 100 questions dans `deck.ts` côté frontend |
| Sync minimal | Endpoints présents mais non utilisés |
| Pas de notifications | Pas de worker pour les rappels |
| Pas d'observabilité | Pas de logging/tracing |
| Auth basique | OAuth/email commenté |

---

## Évolutions prévues

- [ ] Authentification complète (email/OAuth)
- [ ] Support multi-utilisateurs
- [ ] Système de jobs en background
- [ ] Observabilité (OpenTelemetry)
- [ ] Interface d'administration des decks
- [ ] Optimisation mobile

---

## Contenu actuel

**100 questions** couvrant l'éducation civique française :
- Structure constitutionnelle
- Droits et libertés
- Système électoral
- Principes démocratiques
- Relations internationales
