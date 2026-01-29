# 📦 Résumé complet – Debug Docker, Postgres & Prisma Studio

Ce document récapitule **tout ce qui a été vu et résolu** dans la conversation autour du projet **MemoList MVP** : Docker Compose, Postgres, réseaux Docker, rebuild d’images, et Prisma 7 + Prisma Studio.

---

## 1️⃣ Problème initial : le conteneur `db` ne démarre pas

### Symptôme

* `docker compose ps` ne montrait **aucun service `db`**
* Seuls `api`, `web` et `nginx` étaient démarrés

### Diagnostic

* Le conteneur Postgres **n’était pas créé du tout**
* Ce n’était **pas** un crash Postgres

### Causes possibles identifiées

* `docker compose up` lancé sans inclure `db`
* Service ignoré suite à une erreur silencieuse
* Problème réseau Docker (finalement confirmé)

---

## 2️⃣ Erreur critique rencontrée

```text
failed to set up container networking:
network <id> not found
```

### Explication

* Docker essayait d’attacher `db` à un **réseau inexistant**
* Réseau Docker « zombie » (fréquent sous Docker Desktop / Windows)

### Solution appliquée (correcte)

```bash
docker compose down
docker network prune
docker compose up -d
```

➡️ Après ça, le service `db` pouvait enfin être créé.

---

## 3️⃣ Rebuild après modification du Dockerfile `db`

### Règle d’or Docker

> **Modifier un Dockerfile = rebuild obligatoire**

### Commandes utiles

* Rebuild simple :

```bash
docker compose build db
docker compose up -d db
```

* Rebuild + relance (recommandé) :

```bash
docker compose up -d --build db
```

* Rebuild sans cache :

```bash
docker compose build --no-cache db
docker compose up -d db
```

### Cas particulier Postgres

* Les scripts d’init (`init.sql`) **ne sont rejoués que si le volume est neuf**

```bash
docker compose down -v
docker compose up -d --build db
```

⚠️ Supprime les données

---

## 4️⃣ Accéder à la base avec Prisma Studio

### Objectif

* Visualiser les tables Postgres
* Lire / modifier les données
* Vérifier migrations et relations

### Commandes de base

```bash
npx prisma db pull
npx prisma studio
```

Studio est accessible sur :
👉 [http://localhost:5555](http://localhost:5555)

---

## 5️⃣ Problème majeur : Prisma 7 (erreur P1012)

### Erreur rencontrée

```text
The datasource property `url` is no longer supported in schema files
Prisma CLI Version: 7.3.0
```

### Cause

* **Breaking change Prisma 7**
* `url = env("DATABASE_URL")` est désormais **interdit dans `schema.prisma`**

---

## 6️⃣ Configuration correcte avec Prisma 7

⚠️ **Important** : certaines commandes Prisma (dont `prisma db pull`) nécessitent **obligatoirement** `datasource.url` dans `prisma.config.ts`.

La configuration initiale avec `migrations.url` n’est **pas suffisante** pour `db pull`.

### `schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
}
```

### Nouveau fichier obligatoire : `prisma.config.ts`

```ts
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    provider: "postgresql",
    url: process.env.DATABASE_URL!,
  },
});
```

### `.env`

```env
DATABASE_URL=postgresql://memolist:memolist@db:5432/memolist
```

---

## 7️⃣ Prisma Studio avec Docker

### Option recommandée (depuis le conteneur API)

```bash
docker compose exec api npx prisma db pull
docker compose exec api npx prisma studio --hostname 0.0.0.0 --port 5555
```

Et exposer le port :

```yaml
api:
  ports:
    - "5555:5555"
```

➡️ Accès navigateur : [http://localhost:5555](http://localhost:5555)

---

## 8️⃣ Bonnes pratiques retenues

* `depends_on` **ne garantit pas** que la DB est prête
* Toujours regarder `docker compose ps` et `logs`
* Nettoyer les réseaux Docker en cas d’erreurs étranges
* Prisma Studio = **dev only**
* Prisma 7 sépare clairement :

  * schéma
  * infrastructure

---

## 9️⃣ TL;DR ultra court

* ❌ DB absente ≠ DB cassée
* ❌ Réseau Docker zombie → `docker network prune`
* 🔁 Dockerfile modifié → `--build`
* 🚨 Prisma 7 = `url` interdit dans `schema.prisma`
* ✅ `prisma.config.ts` obligatoire
* 👀 Prisma Studio = outil de debug parfait

---

📌 Stack finale : **Docker Compose + Postgres 16 + Prisma 7 + Prisma Studio**
