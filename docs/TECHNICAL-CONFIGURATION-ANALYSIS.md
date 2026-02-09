# Analyse de Configuration Technique par Nombre d'Utilisateurs

## Résumé Exécutif

Ce document fournit des recommandations d'infrastructure et de configuration basées sur le nombre d'utilisateurs actifs pour MemoList MVP.

**Stack technique actuel :**
- Raspberry Pi 4 B (4GB RAM) + SSD 1TB externe
- Docker Compose (nginx, API Node.js, PostgreSQL, Redis, MinIO)
- Next.js 14 (Frontend standalone)
- PostgreSQL 15
- Redis (caching)

**Capacité maximale recommandée :** 1000-2000 utilisateurs actifs mensuels

---

## 1. Configuration par Tier d'Utilisateurs

### Tier 1 : Prototype / MVP (0-100 utilisateurs)

**Profil :**
- Développement + beta testing
- Charge très légère
- Priorité : itération rapide

**Configuration Matérielle :**
| Ressource | Allocation | Notes |
|-----------|-----------|-------|
| CPU | 2-3 cores utilisés | Sans impact |
| RAM | 1.5-2 GB utilisée | Très stable |
| Disque | 50-100 GB | Croissance lente |
| Bande passante | <1 Mbps moyen | Negligible |

**Configuration docker-compose :**
```yaml
services:
  api:
    cpus: '0.5'
    mem_limit: 512m
    mem_reservation: 256m
  postgres:
    cpus: '0.3'
    mem_limit: 256m
  redis:
    cpus: '0.1'
    mem_limit: 128m
  nginx:
    cpus: '0.1'
    mem_limit: 128m
```

**Coûts mensuels :** €0 (Pi 4 existant)

**Durabilité :** ∞ (Pas de limitation)

---

### Tier 2 : Early Growth (100-500 utilisateurs)

**Profil :**
- Premiers utilisateurs réels
- 10-20 requêtes/utilisateur/jour
- Charge supportable sur Pi 4

**Configuration Matérielle :**
| Ressource | Allocation | Notes |
|-----------|-----------|-------|
| CPU | 3-3.5 cores utilisés | Pics à 80% |
| RAM | 2.5-3 GB utilisée | Proche du seuil |
| Disque | 200-300 GB | Croissance modérée |
| Bande passante | 5-10 Mbps moyen | Acceptable |

**Configuration docker-compose :**
```yaml
services:
  api:
    cpus: '1'
    mem_limit: 1024m
    mem_reservation: 768m
  postgres:
    cpus: '0.8'
    mem_limit: 768m
    environment:
      POSTGRES_SHARED_BUFFERS: '256MB'
  redis:
    cpus: '0.3'
    mem_limit: 256m
  nginx:
    cpus: '0.2'
    mem_limit: 256m
```

**Optimisations requises :**
```bash
# PostgreSQL : augmenter work_mem et shared_buffers
# Redis : augmenter maxmemory-policy à "allkeys-lru"
# Node.js : passer à max_old_space_size=768m
```

**Coûts mensuels :** €0 (Pi 4 existant)

**Durabilité :** 6-12 mois (avant saturation RAM)

---

### Tier 3 : Consolidation (500-2000 utilisateurs)

**Profil :**
- Utilisateurs stables et réguliers
- 20-30 requêtes/utilisateur/jour
- Nécessite optimisations

**Configuration Matérielle :**
| Ressource | Allocation | Notes |
|-----------|-----------|-------|
| CPU | 3.5-4 cores (100%) | Au maximum |
| RAM | 3.5-4 GB utilisée | À saturation |
| Disque | 500-800 GB | Croissance rapide |
| Bande passante | 20-30 Mbps moyen | Limite du réseau |

**Configuration docker-compose :**
```yaml
services:
  api:
    cpus: '2'
    mem_limit: 1500m
    mem_reservation: 1200m
    environment:
      NODE_OPTIONS: '--max-old-space-size=1024'
  postgres:
    cpus: '1.5'
    mem_limit: 1200m
    environment:
      POSTGRES_SHARED_BUFFERS: '512MB'
      POSTGRES_WORK_MEM: '64MB'
      POSTGRES_EFFECTIVE_CACHE_SIZE: '1536MB'
  redis:
    cpus: '0.5'
    mem_limit: 512m
  nginx:
    cpus: '0.5'
    mem_limit: 256m
```

**Améliorations matérielles :**
- ✅ SSD 1TB (déjà préconisé) : ~65€
- ✅ Upgrade RAM impossible (Pi 4 fixe à 4GB)
- ✅ Dissipateur thermique : ~10€

**Optimisations logicielles :**
```sql
-- PostgreSQL : connection pooling (pgBouncer)
-- Indexes supplémentaires sur deckId, userId, createdAt
-- VACUUM ANALYZE quotidien
-- Archivage des anciennes revisions
```

**Configuration Redis avancée :**
```bash
# Réduire TTL des sessions : 7 jours → 3 jours
# Limiter cache à 256MB max
# Implémenter Least Recently Used policy
```

**Coûts mensuels :** €5-10 (électricité, internet)

**Durabilité :** 12-24 mois (avant limitation CPU critique)

**⚠️ Limite critique du Pi 4 B atteinte à 2000+ utilisateurs**

---

### Tier 4 : Scaling Vertical (2000-10000 utilisateurs)

**Profil :**
- Croissance rapide
- Nécessite machine plus puissante
- Pi 4 **INSUFFISANT**

**Recommandation : Migration vers mini PC Linux**

**Configuration matérielle recommandée :**
| Ressource | Spécification | Coût |
|-----------|--------------|------|
| CPU | Intel i5-12400F ou équivalent | €150-200 |
| RAM | 16 GB DDR4 | €50-70 |
| Disque | SSD 2TB | €100-150 |
| Châssis | Fanless industrial PC | €200-300 |
| **Total** | | **€500-720** |

**Exemple :** [Beelink SER5 PRO](https://www.amazon.de/Beelink-Computer-R7-6700H-Fanless-Gigabit/dp/B0BLP4GD4V) (€400-500)

**Configuration docker-compose :**
```yaml
services:
  api:
    cpus: '4'
    mem_limit: 4096m
    replicas: 2  # Déployer 2 instances
  postgres:
    cpus: '2'
    mem_limit: 4096m
  redis:
    cpus: '1'
    mem_limit: 1024m
  nginx:
    cpus: '1'
    mem_limit: 512m
```

**Coûts mensuels :** €20-30 (électricité, internet)

**Durabilité :** 24-36 mois

---

### Tier 5 : Scaling Horizontal (10000+ utilisateurs)

**Profil :**
- Croissance massive
- Nécessite architecture distribuée
- Pi 4 **COMPLÈTEMENT OBSOLÈTE**

**Recommandation : Infrastructure cloud + Kubernetes**

**Architecture :**
```
Load Balancer
    ├─ API Node.js #1 (containerisé)
    ├─ API Node.js #2
    ├─ API Node.js #3
    └─ API Node.js #4

PostgreSQL Replicated
    ├─ Primary (write)
    ├─ Replica #1 (read)
    └─ Replica #2 (read)

Redis Cluster
    ├─ Node #1
    ├─ Node #2
    └─ Node #3
```

**Coûts mensuels :** €500-2000 (cloud provider)

**Durabilité :** ∞ (scalable infiniment)

---

## 2. Tableau de Décision : Quand Upgrader ?

| Métrique | Seuil d'Alerte | Action |
|----------|---------------|--------|
| CPU Utilisation | >70% moyen | Optimiser requêtes DB |
| CPU Utilisation | >85% moyen | **URGENT** : Upgrade matériel |
| RAM Utilisée | >80% | Augmenter Redis TTL, archiver données |
| RAM Utilisée | >95% | **CRITIQUE** : OOM risk |
| Disque Utilisé | >80% | Nettoyer logs, archiver |
| Disque Utilisé | >95% | **CRITIQUE** : Arrêt automatique |
| Latence P95 | >1s | Analyser requêtes lentes |
| Latence P95 | >3s | **URGENT** : Scaling décision |
| Erreurs 5xx | >1% requêtes | Déboguer crash d'API |

---

## 3. Plan de Migration : Pi 4 → Mini PC

### Phase 1 : Préparation (1-2 semaines)

**Tâches :**
1. Procurer le mini PC (Beelink SER5 PRO ou équivalent)
2. Installer Linux (Ubuntu 22.04 LTS)
3. Installer Docker + docker-compose
4. Tester sur mini PC avec données snapshot
5. Préparer plan de rollback

**Checklist :**
- [ ] Mini PC commandé et livré
- [ ] Linux installé et configuré
- [ ] Docker fonctionnel
- [ ] Snapshot BD créé
- [ ] Test de migration planifié

### Phase 2 : Migration (2-4 heures downtime)

**Étapes :**

```bash
# Sur Pi 4 (source)
1. Arrêter tous les services
   docker-compose down

2. Backup complet
   tar -czf backup-$(date +%Y%m%d).tar.gz \
     /var/www/memoo/packages/db/prisma \
     /var/lib/postgresql

3. Exporter BD
   docker exec memoo-postgres-1 pg_dump \
     -U postgres memolist > backup.sql

4. Copier vers mini PC
   scp backup.sql user@mini-pc:/tmp/
   scp backup-*.tar.gz user@mini-pc:/tmp/
```

```bash
# Sur mini PC (destination)
1. Importer BD
   psql -U postgres < /tmp/backup.sql

2. Lancer conteneurs
   docker-compose up -d

3. Vérifier santé
   curl http://localhost:3000
   curl http://localhost:5000/api/health

4. Rediriger DNS
   # Changer memoo.fr vers IP du mini PC
```

**Rollback d'urgence :**
```bash
# Si problème critique :
docker-compose down
# Redémarrer Pi 4 depuis backup
```

### Phase 3 : Consolidation (1 semaine)

**Tâches :**
1. Monitorer performance mini PC
2. Archiver ancien Pi 4 en backup froid
3. Mettre à jour documentation
4. Former équipe sur nouveau serveur

---

## 4. Profil de Charge Estimée par Tier

### Utilisateurs : 100

```
Requêtes/jour :     2,000 (20/utilisateur)
Requêtes/seconde :  0.02
Poids BD :          500 MB
Cache actif :       50 MB
Disque total :      2 GB
```

### Utilisateurs : 500

```
Requêtes/jour :     10,000 (20/utilisateur)
Requêtes/seconde :  0.1
Poids BD :          2.5 GB
Cache actif :       150 MB
Disque total :      5 GB
```

### Utilisateurs : 2000

```
Requêtes/jour :     60,000 (30/utilisateur)
Requêtes/seconde :  0.7
Poids BD :          10 GB
Cache actif :       400 MB
Disque total :      20 GB
```

### Utilisateurs : 10000

```
Requêtes/jour :     300,000 (30/utilisateur)
Requêtes/seconde :  3.5
Poids BD :          50 GB
Cache actif :       1.2 GB
Disque total :      100 GB
```

---

## 5. Checklist de Migration vers Docker

**Pour chaque changement de configuration :**

```bash
# 1. Backup avant changement
docker-compose down
tar -czf backup-pre-change.tar.gz docker-compose.yml .env

# 2. Modifier docker-compose.yml
# (appliquer les changements ci-dessus par tier)

# 3. Redémarrer services
docker-compose up -d

# 4. Vérifier logs
docker-compose logs -f api
docker-compose logs -f postgres

# 5. Test fonctionnel
curl -v http://localhost:3000
curl -v http://localhost:5000/api/health

# 6. Monitor ressources pendant 30 min
watch -n 1 'docker stats --no-stream'
```

---

## 6. Considérations Spéciales

### Gestion Thermique

**Pi 4 B : problèmes thermiques à usage intensif**

```bash
# Installer dissipateur thermique passif (~10€)
# Envisager ventilateur à partir de 70°C

# Monitorer température
vcgencmd measure_temp

# Limiter CPU si trop chaud
echo "powersave" | tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

### Réseau

**Bottleneck possible à partir de 500+ utilisateurs**

```bash
# Vérifier débit internet
# Minimum recommandé : 10 Mbps upload
# Pi 4 peut saturer Gigabit Ethernet à ~125 MB/s

# Test débit :
iperf3 -s  # Sur Pi
iperf3 -c <pi-ip> -t 30  # Depuis autre machine
```

### Bruit

**Mini PC fanless recommandé pour déploiement permanent**

---

## 7. Roadmap Recommandée

| Étape | Utilisateurs | Timeline | Action |
|-------|-------------|----------|--------|
| 1 | 0-100 | 0-3 mois | MVP sur Pi 4 |
| 2 | 100-500 | 3-9 mois | Optimisation Pi 4 |
| 3 | 500-2000 | 9-18 mois | SSD upgrade (65€) |
| 4 | 2000-10000 | 18-24 mois | Mini PC (500€) |
| 5 | 10000+ | 24+ mois | Cloud + Kubernetes |

---

## 8. Conclusion

**Recommandation :**

1. **Phase actuelle (0-500 users)** : Reste sur Pi 4
2. **À 500-1000 users** : Ajouter SSD 1TB (~65€) pour éviter saturation I/O
3. **À 1500-2000 users** : Envisager mini PC Linux (~500€) pour headroom CPU
4. **À 2000+ users** : Cloud mandatory

**Le Pi 4 peut supporter 1000-2000 utilisateurs actifs mensuels avec SSD, c'est un excellent rapport coût/performance pour une startup.**

Passez au-delà, et investissez dans infrastructure cloud scalable.
