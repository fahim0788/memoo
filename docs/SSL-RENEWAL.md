# 🔐 Configuration SSL/HTTPS et Renouvellement Automatique

## 📋 Vue d'ensemble

Ce document explique comment les certificats SSL sont configurés et renouvelés automatiquement pour nginx dockerisé.

## 🏗️ Architecture

```
Raspberry Pi (host)
├── /etc/letsencrypt/          ← Certificats SSL générés par certbot
│   ├── live/memoo.fr/
│   │   ├── fullchain.pem
│   │   └── privkey.pem
│   └── renewal-hooks/deploy/
│       └── reload-nginx.sh    ← Hook de renouvellement
│
└── Docker
    └── nginx conteneur
        └── /etc/letsencrypt/  ← Monté depuis le host (lecture seule)
```

## 🔗 Montage des certificats

Les certificats sont **partagés** du host vers le conteneur via volume mount :

```yaml
# docker-compose.yml
nginx:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro  # Lecture seule
```

## 📜 Configuration nginx

### HTTPS activé (port 443)

```nginx
# nginx.conf
server {
  listen 443 ssl http2;
  server_name memoo.fr www.memoo.fr;

  ssl_certificate /etc/letsencrypt/live/memoo.fr/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/memoo.fr/privkey.pem;

  # ... reste de la config
}
```

### Redirection HTTP → HTTPS

```nginx
server {
  listen 80;
  server_name memoo.fr www.memoo.fr;
  return 301 https://$server_name$request_uri;
}
```

## 🔄 Renouvellement automatique

### Fonctionnement

1. **Certbot** (sur le host) vérifie **2x/jour** si renouvellement nécessaire
2. Si certificat expire dans **< 30 jours** → renouvellement automatique
3. Après renouvellement → **hook** exécuté → nginx docker rechargé

### Hook de renouvellement

**Emplacement** : `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`

```bash
#!/bin/bash
# Hook exécuté après renouvellement réussi des certificats

echo "$(date): Renouvellement des certificats détecté, rechargement de nginx..."

cd /var/www/memoo
docker-compose restart nginx

if [ $? -eq 0 ]; then
    echo "$(date): Nginx rechargé avec succès"
else
    echo "$(date): ERREUR lors du rechargement de nginx"
    exit 1
fi
```

## 🛠️ Installation du hook

```bash
# 1. Créer le dossier
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy

# 2. Créer le script
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null << 'EOF'
#!/bin/bash
echo "$(date): Renouvellement des certificats détecté, rechargement de nginx..."
cd /var/www/memoo
docker-compose restart nginx
if [ $? -eq 0 ]; then
    echo "$(date): Nginx rechargé avec succès"
else
    echo "$(date): ERREUR lors du rechargement de nginx"
    exit 1
fi
EOF

# 3. Rendre exécutable
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

## ✅ Tests et vérifications

### Tester le hook manuellement

```bash
sudo /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

### Test de renouvellement (dry-run)

```bash
# Ne renouvelle pas vraiment, juste simule
sudo certbot renew --dry-run
```

### Vérifier les certificats

```bash
# Voir l'expiration
sudo certbot certificates

# Voir les détails
openssl x509 -in /etc/letsencrypt/live/memoo.fr/cert.pem -text -noout
```

### Vérifier le timer systemd

```bash
# Statut du timer
sudo systemctl status certbot.timer

# Prochaines exécutions
sudo systemctl list-timers certbot.timer

# Logs de renouvellement
sudo journalctl -u certbot.service
```

## 🚀 Déploiement après modification

Si vous modifiez la config nginx :

```bash
cd /var/www/memoo

# Pull les changements
sudo git pull

# Redémarrer nginx
docker-compose restart nginx

# Vérifier les logs
docker-compose logs nginx
```

## 🆘 Dépannage

### Le certificat n'est pas chargé

```bash
# Vérifier que les certificats sont montés dans le conteneur
docker exec memoo-nginx-1 ls -la /etc/letsencrypt/live/memoo.fr/

# Tester la config nginx
docker exec memoo-nginx-1 nginx -t

# Recharger nginx
docker-compose restart nginx
```

### HTTPS ne fonctionne pas

```bash
# Vérifier que le port 443 est ouvert
sudo ufw status | grep 443
sudo ufw allow 443/tcp

# Vérifier que nginx écoute sur 443
docker exec memoo-nginx-1 netstat -tlnp | grep 443

# Tester depuis le serveur
curl -v https://memoo.fr
```

### Le renouvellement échoue

```bash
# Logs de certbot
sudo journalctl -u certbot.service -n 50

# Forcer le renouvellement
sudo certbot renew --force-renewal

# Vérifier le timer
sudo systemctl restart certbot.timer
```

## 📊 Monitoring

### Créer une alerte d'expiration

Ajouter dans crontab :

```bash
# Vérifier tous les lundis si certificat expire dans < 7 jours
0 9 * * 1 /usr/bin/certbot certificates | grep -A2 "Expiry Date" | mail -s "SSL Certificate Status" votre@email.com
```

## 🔒 Sécurité

### Headers de sécurité (déjà configurés)

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Protocoles SSL

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

## 📝 Logs

### Logs de renouvellement

```bash
# Logs certbot
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Logs du hook
sudo journalctl -f | grep "reload-nginx"
```

### Logs nginx

```bash
# Logs nginx docker
docker-compose logs -f nginx
```

## 🔄 Workflow complet

1. **Certbot timer** (systemd) → exécution 2x/jour
2. **Certbot** vérifie expiration
3. Si < 30 jours → **Renouvelle** les certificats
4. **Hook** `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` exécuté
5. **Nginx docker** redémarré
6. **Nouveaux certificats** chargés automatiquement

## ✨ Points clés

- ✅ Certificats sur le **host** (Pi), pas dans Docker
- ✅ **Volume mount** pour partager vers nginx
- ✅ **Hook** pour recharger nginx après renouvellement
- ✅ **Timer systemd** pour vérification automatique
- ✅ **Pas d'intervention manuelle** nécessaire

---

**Dernière mise à jour** : 2026-02-08
