# Memoo MVP

Application PWA de revision par repetition espacee, concue pour l'apprentissage offline-first.

## Apercu du projet

**Memoo** est une plateforme d'etude utilisant la technique scientifiquement prouvee de la repetition espacee. L'application est actuellement en phase MVP avec un contenu de 100 questions sur l'education civique francaise.

### Caracteristiques principales

- **Offline-first** : Fonctionne sans connexion grace a IndexedDB + Service Worker
- **PWA installable** : S'installe sur mobile (iOS/Android) comme une app native
- **Repetition espacee** : Algorithme SM-2 adapte pour optimiser la memorisation
- **Suivi quotidien** : Compteur de cartes etudiees par jour
- **Authentification** : Login/Register avec email et mot de passe (JWT)
- **Listes dynamiques** : Les cartes sont chargees depuis la base de donnees. Chaque utilisateur choisit ses listes et ses resultats sont independants.
- **Synchronisation** : Queue offline des reviews, sync automatique

---

## Stack technique

### Frontend (`apps/web/`)
| Technologie | Version | Role |
|-------------|---------|------|
| Next.js | 14.2.5 | Framework React avec App Router |
| React | 18.3.1 | Interface utilisateur |
| TypeScript | 5.4.5 | Typage statique |
| IndexedDB | Native | Stockage local offline |
| Service Worker | Native | Cache et fonctionnement offline |

### Backend (`apps/api/`)
| Technologie | Version | Role |
|-------------|---------|------|
| Next.js | 14.1.0 | API Routes |
| Prisma | 7.3.0 | ORM avec adaptateur PostgreSQL |
| PostgreSQL | 16 | Base de donnees |
| Node.js | 20 | Runtime |
| bcryptjs | - | Hash des mots de passe |
| jsonwebtoken | - | Tokens JWT |

### Infrastructure
| Technologie | Role |
|-------------|------|
| Docker Compose | Orchestration des services |
| Nginx | Reverse proxy |

---

## Structure du projet

```
Memoo-mvp/
├── apps/
│   ├── web/                    # Frontend PWA
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx  # Layout racine avec PWA + AuthProvider
│   │   │   │   ├── page.tsx    # Menu listes + etude (menu / available / studying)
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx # Page de connexion/inscription
│   │   │   │   └── globals.css # Styles globaux (theme sombre)
│   │   │   ├── contexts/
│   │   │   │   └── AuthContext.tsx # Contexte React pour l'auth
│   │   │   └── lib/
│   │   │       ├── idb.ts      # Abstraction IndexedDB
│   │   │       ├── sr-engine.ts # Algorithme repetition espacee
│   │   │       ├── api.ts      # Client API (listes, cartes, sync)
│   │   │       ├── auth.ts     # Fonctions login/register/logout
│   │   │       ├── sync.ts     # Queue offline et synchronisation
│   │   │       ├── text.ts     # Validation des reponses
│   │   │       └── pwa-boot.tsx # Initialisation Service Worker
│   │   ├── public/
│   │   │   ├── manifest.webmanifest
│   │   │   ├── sw.js           # Service Worker
│   │   │   └── icons/          # Icones de l'app
│   │   ├── Dockerfile
│   │   └── .dockerignore
│   │
│   └── api/                    # Backend API
│       ├── app/api/
│       │   └── [...path]/
│       │       └── route.ts    # Catch-all router (auth + CRUD)
│       ├── prisma/
│       │   ├── schema.prisma   # Schema BDD (User, Deck, Card, Review, UserDeck)
│       │   ├── seed.ts         # Seed des 100 questions (Naturalisation francaise)
│       │   └── migrations/     # Migrations
│       ├── prisma.config.ts    # Config Prisma 7 (datasource + seed)
│       ├── Dockerfile
│       └── .dockerignore
│
├── infra/nginx/                # Configuration Nginx
├── scripts/dev.sh              # Script de developpement
├── docker-compose.yml          # Orchestration Docker (production)
├── docker-compose.dev.yml      # DB uniquement (dev local)
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
│              Nginx (Port 80)                            │
│         /  → Web    |    /api → API                     │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼───────┐           ┌───────▼───────┐
│   Web (3000)  │           │   API (3001)  │
│   Next.js PWA │           │   Next.js     │
│               │           │               │
│ • React UI    │◄──────────│ • JWT Auth    │
│ • IndexedDB   │  Bearer   │ • Prisma 7    │
│ • SW Cache    │  Token    │ • bcrypt      │
│ • SR Engine   │           │ • Adapter PG  │
│ • Sync Queue  │           │               │
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
3. Verification du token JWT dans localStorage
4. Si non connecte → redirect vers `/login`
5. Si connecte → `GET /api/my-lists` + `GET /api/lists` chargent les listes
6. **Menu** : l'utilisateur voit ses listes (`Mes listes`) et peut en explorer d'autres
7. **Explorer** : `GET /api/lists` montre les listes disponibles, bouton "Ajouter" → `POST /api/my-lists`
8. **Etude** : l'utilisateur ouvre une liste → `GET /api/lists/:id/cards` recupere les cartes
9. IndexedDB charge l'etat SR de la liste (`state:<deckId>`)
10. L'algorithme SR selectionne la prochaine carte due
11. L'utilisateur repond et valide
12. La reponse est normalisee et comparee
13. IndexedDB persiste l'etat local, la review est ajoutee a la queue de sync
14. Sync automatique vers l'API (non-bloquant)
15. Boucle vers l'etape 10

### Algorithme de repetition espacee

L'etat de chaque carte contient :
```typescript
{
  reps: number;           // Repetitions reussies
  intervalDays: number;   // Jours avant prochaine revision
  ease: number;           // Multiplicateur de difficulte (1.3-2.5)
  nextReviewAt: number;   // Timestamp prochaine revision
  successCount: number;   // Total reussites
  failureCount: number;   // Total echecs
}
```

**Reponse correcte** : ease +0.10, intervalle augmente
**Reponse incorrecte** : ease -0.20, retour a 1 jour

### Validation des reponses

La normalisation inclut :
- Suppression des espaces superflus
- Conversion en minuscules
- Suppression des accents (e → e, c → c)
- Suppression des caracteres speciaux

Correspondance partielle supportee : "Liberte Egalite" valide pour "Liberte, Egalite, Fraternite".

### Synchronisation offline-first

```typescript
// Queue stockee dans IndexedDB
{
  reviews: [
    { cardId, ok, userAnswer, reviewedAt }
  ]
}

// Flux de sync
1. Utilisateur repond → queueReview()
2. Review ajoutee a la queue locale
3. flushQueue() tente l'envoi immediat
4. Si offline → reste en queue
5. Si online → POST /api/sync/push
6. Succes → queue videe
```

---

## Endpoints API

### Authentification

| Methode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/auth/register` | Creer un compte | Non |
| POST | `/api/auth/login` | Connexion | Non |
| GET | `/api/auth/me` | Infos utilisateur | Bearer |

### Listes et cartes

| Methode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/lists` | Toutes les listes disponibles (avec nombre de cartes) | Bearer |
| GET | `/api/my-lists` | Listes associees a l'utilisateur connecte | Bearer |
| POST | `/api/my-lists` | Associer une liste (`{ deckId }`) | Bearer |
| DELETE | `/api/my-lists/:deckId` | Dissocier une liste | Bearer |
| GET | `/api/lists/:deckId/cards` | Cartes d'une liste donnee | Bearer |

### Sync et divers

| Methode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/health` | Status du serveur | Non |
| GET | `/api/sync/pull` | Recuperer l'etat serveur | Bearer |
| POST | `/api/sync/push` | Envoyer les reviews | Bearer |

**Authentification** : Header `Authorization: Bearer <JWT_TOKEN>`

---

## Schema de base de donnees

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  firstName String
  lastName  String
  password  String     // Hash bcrypt
  isActive  Boolean    @default(true)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  reviews   Review[]
  userDecks UserDeck[] // Listes choisies par l'utilisateur
}

model Deck {
  id        String     @id @default(cuid())
  name      String
  cards     Card[]
  userDecks UserDeck[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model Card {
  id        String   @id @default(cuid())
  deckId    String
  question  String
  answers   Json     @default("[]") // Tableau de reponses acceptees
  deck      Deck     @relation(...)
  reviews   Review[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Review {
  id         String   @id @default(cuid())
  cardId     String
  ok         Boolean
  userAnswer String
  reviewedAt DateTime @default(now())
  userId    String?
  user       User?    @relation(...)
  card       Card?    @relation(...)
}

// Table de jonction : association utilisateur ↔ liste
model UserDeck {
  id        String   @id @default(cuid())
  userId   String
  deckId    String
  createdAt DateTime @default(now())
  user      User     @relation(...)
  deck      Deck     @relation(...)
  @@unique([userId, deckId])
}
```

**Seed** : Le script `prisma/seed.ts` peuple automatiquement une liste "Naturalisation francaise" avec 100 cartes. Il se lance via `npx prisma db seed`.

---

## Installation et demarrage

### Prerequis
- Docker & Docker Compose
- Node.js 20+ (pour le developpement local)

### Configuration initiale

```bash
# Copier le template des variables d'environnement
cp .env.example .env

# Pour le dev local (API en npm run dev)
cp apps/api/.env.example apps/api/.env
```

### Workflow de developpement

#### Option 1 : Dev local (recommande)

```bash
# Demarre PostgreSQL + apps en mode watch
./scripts/dev.sh dev

# Acces :
# - Web : http://localhost:3000
# - API : http://localhost:3001
```

#### Option 2 : Tout en Docker

```bash
# Demarre tous les services (nginx, web, api, db)
./scripts/dev.sh docker

# Acces : http://localhost (via Nginx)
```

#### Commandes du script dev.sh

| Commande | Description |
|----------|-------------|
| `./scripts/dev.sh dev` | DB Docker + apps en local (npm run dev) |
| `./scripts/dev.sh db` | PostgreSQL uniquement |
| `./scripts/dev.sh docker` | Tout en Docker (production-like) |
| `./scripts/dev.sh setup` | Installe deps + genere Prisma |
| `./scripts/dev.sh stop` | Arrete les conteneurs |
| `./scripts/dev.sh logs` | Affiche les logs |
| `./scripts/dev.sh clean` | Supprime volumes et conteneurs |

### Deploiement VPS / Production

```bash
# 1. Cloner le repo sur le VPS
git clone <repo-url> && cd Memoo-mvp

# 2. Configurer les variables de production
cp .env.example .env
# IMPORTANT: Modifier JWT_SECRET et POSTGRES_PASSWORD
# Generer avec: openssl rand -hex 32

# 3. Lancer en production
docker compose up --build -d

# 4. Appliquer les migrations
docker compose exec api npx prisma migrate deploy

# 5. Verifier le status
docker compose ps
```

### Structure des fichiers d'environnement

| Fichier | Usage | Committe |
|---------|-------|----------|
| `.env.example` | Template documente | Oui |
| `.env` | Docker Compose (db@db:5432) | Non |
| `apps/api/.env` | Dev local API (db@localhost:5432) | Non |
| `apps/api/.env.example` | Template API | Oui |

### Variables d'environnement

```env
# Frontend (injectees au BUILD, pas au runtime)
NEXT_PUBLIC_API_BASE=/api
NEXT_PUBLIC_APP_NAME=Memoo

# Backend
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<generer: openssl rand -hex 32>

# PostgreSQL
POSTGRES_DB=Memoo
POSTGRES_USER=Memoo
POSTGRES_PASSWORD=<mot-de-passe-securise>
```

---

## Notes techniques

### Prisma 7 avec adaptateur PostgreSQL

Prisma 7 utilise un pattern d'adaptateur pour les connexions :

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

### Catch-all route Next.js

L'API utilise une route catch-all `[...path]/route.ts` pour gerer tous les endpoints dans un seul fichier :

```typescript
// apps/api/app/api/[...path]/route.ts
export async function GET(req: NextRequest) {
  const { pathname } = new URL(req.url);

  if (pathname === "/api/health") { ... }
  if (pathname === "/api/auth/me") { ... }
  // etc.
}
```

### Authentification JWT

```typescript
// Backend: Signer un token
const token = jwt.sign(
  { userId: user.id, email: user.email },
  JWT_SECRET,
  { expiresIn: "7d" }
);

// Backend: Verifier un token
const payload = jwt.verify(token, JWT_SECRET);

// Frontend: Stocker/Recuperer
localStorage.setItem("auth_token", token);
headers["Authorization"] = `Bearer ${token}`;
```

---

## Limitations MVP

| Limitation | Description |
|------------|-------------|
| Pas de notifications | Pas de worker pour les rappels |
| Pas d'observabilite | Pas de logging/tracing |
| Pas de reset password | Fonctionnalite a ajouter |

---

## Evolutions prevues

- [x] Authentification complete (email/password JWT)
- [x] Synchronisation offline-first des reviews
- [x] Support multi-decks dynamiques
- [ ] Systeme de jobs en background
- [ ] Observabilite (OpenTelemetry)
- [ ] Interface d'administration des decks
- [ ] Reset password par email
- [ ] OAuth (Google, GitHub)

---

## Contenu actuel

**100 questions** couvrant l'education civique francaise :
- Structure constitutionnelle
- Droits et libertes
- Systeme electoral
- Principes democratiques
- Relations internationales
