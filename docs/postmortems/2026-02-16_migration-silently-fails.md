# Post-mortem : Migration Prisma echoue silencieusement

**Date** : 2026-02-16
**Severite** : Haute (deploiement bloque)
**Duree d'impact** : ~30 min de diagnostic

---

## Resume

Le deploiement en production a ete bloque par deux problemes combines :
1. Le script `deploy.sh` masquait les erreurs de migration (exit silencieux)
2. Une migration Prisma echouee precedemment bloquait toutes les migrations suivantes

## Chronologie

| Heure | Evenement |
|-------|-----------|
| T+0 | Lancement `deploy.sh --only=migrate` |
| T+0 | Le script affiche le spinner puis retourne au prompt sans message d'erreur |
| T+10m | Diagnostic : bug dans la fonction `spin()` de deploy.sh |
| T+15m | Fix applique, relance : erreur Prisma P3009 visible (failed migration) |
| T+18m | Suppression de l'entree echouee dans `_prisma_migrations` |
| T+20m | Relance : erreur Prisma P3018 visible (colonne `emailVerified` existe deja) |
| T+22m | Migration marquee comme appliquee via `prisma migrate resolve --applied` |
| T+25m | Migration reussie |

## Cause racine

### Bug 1 : Erreurs silencieuses dans deploy.sh

La fonction `spin()` dans [deploy.sh](../../scripts/deploy.sh) contenait :

```bash
# AVANT (bug)
wait "$pid" 2>/dev/null
local rc=$?
```

Avec `set -e` actif, si `wait` retourne un code non-zero, le script est **tue immediatement** avant d'executer `local rc=$?`. Le message d'erreur n'est jamais affiche.

### Bug 2 : Migration Prisma partiellement appliquee

La migration `20260216005253_add_email_verification` avait ete tentee precedemment et avait partiellement reussi (colonne `emailVerified` creee) avant d'echouer. Prisma enregistre cette migration comme "failed" dans la table `_prisma_migrations`, ce qui bloque toutes les migrations suivantes.

## Resolution

### Fix deploy.sh

```bash
# APRES (fix)
local rc=0
wait "$pid" 2>/dev/null || rc=$?
```

Le `|| rc=$?` empeche `set -e` de tuer le script et capture proprement le code d'erreur.

### Fix migration Prisma

```bash
# 1. Supprimer l'entree de migration echouee
docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U webapp -d memolist \
  -c "DELETE FROM _prisma_migrations WHERE migration_name = '20260216005253_add_email_verification';"

# 2. Marquer comme appliquee (la colonne existait deja)
docker-compose -f docker-compose.prod.yml --profile tools run --rm migrate \
  npx prisma migrate resolve --applied 20260216005253_add_email_verification
```

## Actions preventives

| Action | Statut |
|--------|--------|
| Fix `spin()` dans deploy.sh pour ne plus masquer les erreurs | Fait |
| Documenter la procedure de recovery migration Prisma (ci-dessous) | Fait |

## Procedure de recovery : migration Prisma echouee en production

### Diagnostic

```bash
# Voir l'etat des migrations
docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U webapp -d memolist \
  -c "SELECT migration_name, finished_at, rolled_back_at, logs FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;"
```

### Cas 1 : Migration partiellement appliquee (colonnes/tables deja creees)

```bash
# Marquer comme appliquee
docker-compose -f docker-compose.prod.yml --profile tools run --rm migrate \
  npx prisma migrate resolve --applied <migration_name>
```

### Cas 2 : Migration non appliquee (rien en base)

```bash
# Supprimer l'entree et re-tenter
docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U webapp -d memolist \
  -c "DELETE FROM _prisma_migrations WHERE migration_name = '<migration_name>';"

# Relancer
./scripts/deploy.sh --only=migrate
```

### Cas 3 : Migration partiellement appliquee et on veut rollback manuellement

```bash
# 1. Identifier ce qui a ete cree
docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U webapp -d memolist -c "\d+ <table_name>"

# 2. Rollback manuel (adapter selon la migration)
docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U webapp -d memolist \
  -c "ALTER TABLE \"<Table>\" DROP COLUMN IF EXISTS \"<column>\";"

# 3. Supprimer l'entree et re-tenter
docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U webapp -d memolist \
  -c "DELETE FROM _prisma_migrations WHERE migration_name = '<migration_name>';"
```

## Lecons apprises

1. **Toujours tester `set -e` avec les fonctions qui capturent des codes de retour** - `set -e` interagit mal avec `wait`, `grep`, et d'autres commandes qui retournent non-zero legitimement
2. **Une migration Prisma echouee bloque tout** - contrairement a un rollback automatique, Prisma garde l'etat "failed" et refuse d'avancer
3. **Rebuilder l'image migrate apres un `git pull`** - `--only=migrate` suppose une image a jour ; si de nouvelles migrations sont dans le code mais pas dans l'image, le comportement est imprevisible
