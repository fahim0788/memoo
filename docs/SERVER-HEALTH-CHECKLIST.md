# Checklist Santé Serveur - MemoList MVP

## 📊 Monitoring en Temps Réel

### Commandes de Diagnostic Rapide

```bash
# CPU, RAM, Disque
docker stats --no-stream

# Température (Pi 4)
vcgencmd measure_temp

# Espace disque détaillé
df -h

# Connexions réseau actives
netstat -an | grep ESTABLISHED | wc -l

# Logs d'erreurs
docker-compose logs -f api | grep -i error
```

---

## ✅ Checklist Quotidienne (5 minutes)

### 1. Disponibilité Services

```bash
# Health check API
curl -v http://localhost:5000/api/health

# Frontend accessible
curl -v http://localhost:3000

# Nginx reverse proxy
docker-compose ps | grep -E "nginx|Up"

# Résultat attendu : tous les services "Up"
```

**Action si problème :**
```bash
docker-compose restart api
docker-compose restart web
docker-compose restart nginx
```

### 2. Ressources Système

| Métrique | Seuil Normal | Seuil Alerte | Seuil Critique |
|----------|-------------|-------------|---|
| CPU | <50% | >70% | >85% |
| RAM | <60% | >75% | >90% |
| Disque | <70% | >80% | >95% |
| Température (°C) | <50 | >60 | >70 |

**Commande à lancer :**
```bash
watch -n 5 'docker stats --no-stream && echo "---" && vcgencmd measure_temp'
```

**Si CPU > 85% :**
```bash
# Identifier processus
docker top memoo-api-1
docker top memoo-postgres-1

# Vérifier logs
docker-compose logs -f api | tail -50
docker-compose logs -f postgres | tail -50
```

**Si RAM > 90% :**
```bash
# Redémarrer Redis (libère cache)
docker-compose restart redis

# Vérifier mémoire PostgreSQL
docker exec memoo-postgres-1 \
  ps aux | grep postgres | grep -v grep
```

**Si Disque > 85% :**
```bash
# Voir fichiers volumineux
du -sh /var/www/memoo/* | sort -h | tail -10
du -sh /var/lib/docker/volumes/*/_data | sort -h | tail -10

# Nettoyer logs
docker-compose exec api rm /app/logs/*.log
find /var/lib/docker/volumes -name "*.log" -delete
```

### 3. Processus Critiques

```bash
# Vérifier tous les conteneurs tournent
docker-compose ps

# Vérifier status PostgreSQL
docker-compose exec postgres pg_isready

# Vérifier Redis
docker-compose exec redis redis-cli ping
# Résultat attendu : PONG

# Vérifier MinIO
curl -s http://localhost:9000/minio/health/live
# Résultat attendu : HTTP 200
```

---

## 📈 Checklist Hebdomadaire (15 minutes)

### 1. Performance Base de Données

```bash
# Analyser requêtes lentes
docker-compose exec postgres psql -U postgres memolist -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# Résultat attendu : mean_time < 100ms pour 95% requêtes
# Si > 500ms : examiner si index manquant
```

**Ajouter index si nécessaire :**
```bash
docker-compose exec postgres psql -U postgres memolist -c "
CREATE INDEX idx_review_userid_deckid ON reviews(userId, deckId);
ANALYZE;
"
```

### 2. Santé PostgreSQL

```bash
# Taille base de données
docker-compose exec postgres psql -U postgres memolist -c "
SELECT pg_size_pretty(pg_database_size('memolist'));
"

# Connexions actives
docker-compose exec postgres psql -U postgres memolist -c "
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
"
# Résultat attendu : <50 connexions simultanées

# Erreurs de transaction
docker-compose exec postgres psql -U postgres memolist -c "
SELECT name, value FROM pg_stat_database WHERE datname='memolist';
" | grep -E "deadlocks|conflict"
# Résultat attendu : 0 deadlocks
```

### 3. Redis Utilisation

```bash
docker-compose exec redis redis-cli INFO memory

# Résultat attendu :
# used_memory_human: <512MB
# evicted_keys: ~0 (pas d'expulsion)
```

**Si evicted_keys augmente :**
```bash
# Réduire TTL ou augmenter maxmemory
docker-compose exec redis redis-cli CONFIG SET maxmemory 1gb
docker-compose exec redis redis-cli CONFIG REWRITE
```

### 4. Logs d'Erreurs

```bash
# Erreurs Node.js (dernières 24h)
docker-compose logs -f --since 24h api | grep -iE "error|warn|exception" | tail -20

# Erreurs PostgreSQL
docker-compose logs -f --since 24h postgres | grep -iE "error|fatal" | tail -20

# Erreurs Nginx
docker-compose logs -f --since 24h nginx | grep -iE "error|5[0-9]{2}" | tail -20
```

**Actions selon type d'erreur :**
| Erreur | Cause Probable | Action |
|--------|---|---|
| ECONNREFUSED | Service down | `docker-compose restart [service]` |
| Out of memory | RAM insuffisante | Augmenter allocation ou réduire cache |
| Timeout | Requête trop lente | Analyser query PostgreSQL |
| 502 Bad Gateway | API crash | Vérifier logs API |

### 5. Croissance Données

```bash
# Taille par table
docker-compose exec postgres psql -U postgres memolist -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Croissance jour à jour
# (comparer avec mesure de la semaine précédente)
```

---

## 🔄 Checklist Mensuelle (30 minutes)

### 1. Backup & Disaster Recovery

```bash
# Vérifier dernier backup réussi
ls -lh /var/www/memoo/backups/ | head -5

# Tester restore (sur machine de test)
docker-compose down
# Copier backup
docker-compose up -d postgres
docker-compose exec postgres psql -U postgres < /tmp/backup.sql
```

**Backup automatisé à ajouter (cron) :**
```bash
# /etc/cron.d/memolist-backup
0 2 * * * root cd /var/www/memoo && \
  docker-compose exec -T postgres pg_dump -U postgres memolist | \
  gzip > /var/www/memoo/backups/backup-$(date +\%Y\%m\%d-\%H\%M).sql.gz && \
  find /var/www/memoo/backups -mtime +30 -delete
```

### 2. Sécurité

```bash
# Vérifier permissions fichiers sensibles
ls -la /var/www/memoo/.env
# Résultat attendu : -rw------- (600)

ls -la /var/www/memoo/packages/db/
# Résultat attendu : drwxr-xr-x (755)

# Vérifier secrets n'exposés nulle part
grep -r "POSTGRES_PASSWORD\|API_KEY" /var/www/memoo --exclude-dir=node_modules
# Résultat attendu : aucun résultat en dehors .env

# Vérifier certificats SSL valides
sudo certbot certificates | grep -A2 memolist
# Résultat attendu : non expiré, >10 jours avant expiration
```

### 3. Updates & Patches

```bash
# Vérifier updates disponibles
docker images

# Mettre à jour Node.js image (si nouveau LTS)
docker-compose build --pull api

# Vérifier vulnerabilités NPM
cd apps/api && npm audit
cd apps/web && npm audit
# Résultat attendu : 0 high/critical

# Updates PostgreSQL (patch versions seulement)
docker-compose exec postgres pg_dump -U postgres memolist | \
  gzip > /tmp/backup-before-upgrade.sql.gz
docker-compose build postgres
docker-compose up -d postgres
```

### 4. Capacité Restante

```bash
# Projection : combien de temps avant plein disque ?
USED=$(df /var/www/memoo | tail -1 | awk '{print $3}')
FREE=$(df /var/www/memoo | tail -1 | awk '{print $4}')
GROWTH_PER_DAY=$(du -s /var/www/memoo/data --dereference | awk '{print $1}')
DAYS_LEFT=$((FREE / GROWTH_PER_DAY))

echo "Jours avant disque plein : $DAYS_LEFT"
# Résultat attendu : >90 jours

# Si <30 jours : augmenter disque ou archiver
```

### 5. Revue de Performance

```bash
# Comparer CPU/RAM/Disque avec semaine précédente
# (sauvegarder mesures dans fichier)

# Identifier tendances
tail -30 /var/log/memolist-monitoring.log | grep CPU

# Tendance d'augmentation de charge ?
# → Envisager optimisations ou upgrade
```

---

## 🚨 Alertes Critiques & Réactions Immédiates

### Alerte CPU : >90% pendant >5 min

```bash
# 1. Identifier processus
docker stats --no-stream | head -10

# 2. Vérifier requêtes lentes
docker-compose logs -f api | grep "duration:"

# 3. Graceful restart si possible
docker-compose restart api

# 4. Si persistent, analyser
docker-compose exec postgres psql -U postgres memolist -c "
SELECT query, calls, total_time
FROM pg_stat_statements
ORDER BY total_time DESC LIMIT 5;
"

# 5. Escalade : notifier administrateur
```

### Alerte RAM : >95%

```bash
# 1. CRITIQUE : risque OOM (Out Of Memory)

# 2. Actions d'urgence
docker-compose restart redis  # Libère cache

# 3. Réduire allocations
# Éditer docker-compose.yml, réduire mem_limit

# 4. Si pas d'amélioration : redémarrer tout
docker-compose down
docker-compose up -d

# 5. Panne imminente : passer en mode dégradé
# ou basculer vers serveur de secours
```

### Alerte Disque : >95%

```bash
# 1. CRITIQUE : système peut s'arrêter

# 2. Libérer espace immédiatement
find /var/lib/docker/volumes -name "*.log" -delete
docker system prune -f
docker volume prune -f

# 3. Archiver logs anciens
tar -czf /tmp/logs-$(date +%Y%m%d).tar.gz /var/log
rm /var/log/*.log

# 4. Si toujours critique : downtime pour nettoyage
docker-compose down
# Nettoyer fichiers de données
find /var/www/memoo/data -mtime +180 -delete

# 5. Augmenter disque ou ajouter stockage externe
```

### Alerte Service Down : Health check échoue

```bash
# 1. Vérifier si conteneur tourne
docker-compose ps | grep api

# 2. Voir logs erreur
docker-compose logs api | tail -50

# 3. Restart simple
docker-compose restart api

# 4. Rebuild si erreur applicative
docker-compose build api
docker-compose up -d api

# 5. Si toujours down
docker-compose down
docker-compose up -d
# Vérifier .env, variables d'environnement

# 6. Basculer vers backup ou notifier utilisateurs
```

### Alerte API Lente : P95 latency >3s

```bash
# 1. Vérifier logs
docker-compose logs -f api | grep "duration:"

# 2. Identifier requête lente
# (chercher entrée avec duration > 3000ms)

# 3. Analyser query PostgreSQL
SLOW_QUERY="SELECT * FROM cards WHERE..."
docker-compose exec postgres EXPLAIN ANALYZE $SLOW_QUERY

# 4. Créer index si missing
docker-compose exec postgres psql -U postgres memolist -c "
CREATE INDEX idx_optimized ON cards(...)
"

# 5. Retest et vérifier latence revient <1s
```

---

## 📋 Monitoring Dashboard (À Implémenter)

### Prometheus + Grafana Setup

```yaml
# docker-compose.yml ajout
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
  ports:
    - "3001:3000"
  volumes:
    - grafana-data:/var/lib/grafana
```

**Métriques à monitorer :**
- CPU usage
- RAM usage
- Disque usage
- Température
- Requêtes API/sec
- Latence P50/P95/P99
- Erreurs 5xx
- Connexions DB actives
- Taille base de données

---

## 🔐 Checklist Sécurité

### Mensuelle

- [ ] Logs d'accès du web : pas d'accès suspect
- [ ] Certificats SSL : valides et non expirés
- [ ] Permissions fichiers : sensibles en 600
- [ ] Variables `.env` : non exposées
- [ ] NPM audit : 0 vulnerabilités critiques

### Trimestrielle

- [ ] Rotation des secrets/tokens
- [ ] Audit des utilisateurs administrateur
- [ ] Vérification antivirus (si applicable)
- [ ] Update des dépendances système

---

## 📝 Logs à Archiver Régulièrement

```bash
# Logs applicatifs
find /var/www/memoo -name "*.log" -mtime +30 -exec gzip {} \;
find /var/www/memoo -name "*.log.gz" -mtime +90 -delete

# Logs docker
docker-compose logs > /tmp/docker-logs-$(date +%Y%m%d).log
# Ou depuis syslog
journalctl -u docker > /tmp/journalctl-$(date +%Y%m%d).log
```

---

## 📞 Contacts & Escalade

| Problème | Escalade | Action |
|----------|----------|--------|
| Service down <30 min | Automatisé restart | Monitorer logs |
| Service down >30 min | Slack/Email alert | Intervention humaine |
| Disque >90% | Alerte automatique | Libérer espace |
| CPU >90% >10 min | Alerte automatique | Optimiser ou upgrade |
| Sécurité compromise | CRITIQUE | Isoler serveur |

---

## 🎯 Métriques de Santé Globales

**Serveur sain si :**

✅ Uptime > 99.5% (mensuel)
✅ API Latency P95 < 1s
✅ Erreur rate < 0.5%
✅ CPU avg < 60%
✅ RAM avg < 70%
✅ Disque utilisé < 75%
✅ 0 logs CRITICAL
✅ Certificats SSL > 10 jours avant expiration
✅ Backups complétés dernières 24h
✅ Réplica DB en sync

**Intervention requise si :**

⚠️ Uptime < 99% (mensuel)
⚠️ API Latency P95 > 2s
⚠️ Erreur rate > 1%
⚠️ CPU avg > 75%
⚠️ RAM avg > 85%
⚠️ Disque utilisé > 85%
⚠️ Logs WARNING/CRITICAL réguliers
⚠️ Certificats SSL < 14 jours avant expiration
⚠️ Backups manquants 48h+

---

## 🔧 Commandes Utiles Rapides

```bash
# Redémarrer tout
docker-compose down && docker-compose up -d

# Voir logs en live
docker-compose logs -f --since 10m api

# Database query rapide
docker-compose exec postgres psql -U postgres memolist -c "..."

# Redis info
docker-compose exec redis redis-cli INFO

# Accès MinIO
# http://localhost:9001 (credentials dans .env)

# Backup rapide
docker-compose exec postgres pg_dump -U postgres memolist | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore rapide
zcat backup-*.sql.gz | docker-compose exec -T postgres psql -U postgres memolist
```

---

## 📅 Calendario Maintenance

**Chaque jour :**
- ✓ 10:00 : Health check manuel
- ✓ 18:00 : Review des logs erreurs

**Chaque semaine :**
- ✓ Lundi 10:00 : Performance review
- ✓ Jeudi 14:00 : Backup intégrité check

**Chaque mois :**
- ✓ 1er : Analyse complète
- ✓ 15 : Mise à jour dépendances

**Chaque trimestre :**
- ✓ Audit sécurité complet
- ✓ Disaster recovery test

---

## Notes pour Administrateur

_Utiliser cette checklist comme template et adapter selon votre infrastructure_

Dernière mise à jour : 2026-02-09
Prochaine révision : 2026-03-09
