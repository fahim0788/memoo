# 🔐 Checklist Sécurité – Serveur Web exposé (niveau PROD / PARANO)

Checklist pour un serveur personnel (Raspberry Pi / VPS) exposé sur Internet
Ports publics autorisés : **80 / 443 uniquement**

---

## 🧱 1. Réseau & Box (frontière Internet)

* [x] Redirection NAT **uniquement** :

  * 80 → serveur web
  * 443 → serveur web
* [ ] Aucun autre port exposé (22, 5432, 3306, 8080, etc.)
* [ ] UPnP désactivé sur la box

**Test externe :**

```bash
nmap -Pn -p- IP_PUBLIQUE
```

---

## 🔀 2. HTTPS & chiffrement

* [x] Certificat HTTPS valide (Let’s Encrypt)
* [x] Redirection HTTP → HTTPS
* [ ] HSTS activé

Exemple Nginx :

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

---

## 🖥️ 3. Système (OS)

* [ ] OS à jour
* [ ] Accès root désactivé en SSH
* [ ] Utilisateur non-root pour les services
* [ ] Authentification SSH par clé uniquement

SSH :

```conf
PermitRootLogin no
PasswordAuthentication no
```

---

## 🔑 4. SSH (CRITIQUE)

* [x] SSH **non exposé à Internet**
* [x] SSH autorisé **uniquement depuis le LAN**
* [ ] SSH via VPN (option recommandé ++)

UFW :

```bash
ufw allow from 192.168.1.0/24 to any port 22 proto tcp
```

---

## 🔥 5. Pare-feu (UFW)

* [x] UFW installé
* [x] Politique par défaut restrictive
* [x] Règles minimales définies
* [x] IPv6 pris en compte

Configuration :

```bash
ufw default deny incoming
ufw default allow outgoing

ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from 192.168.1.0/24 to any port 22 proto tcp
```

Vérification :

```bash
ufw status verbose
```

---

## 🌐 6. Serveur Web (Nginx / Apache)

* [ ] Version serveur masquée
* [ ] Headers de sécurité activés
* [ ] Aucun fichier sensible accessible (.env, .git, backups)

Headers recommandés :

```nginx
server_tokens off;
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy strict-origin;
```

---

## 🧪 7. Application (Next.js / API)

* [ ] Pas de stacktrace en prod
* [ ] Variables sensibles via ENV uniquement
* [ ] Pas de mode debug actif
* [ ] Uploads contrôlés (taille / type)

Test rapide :

```bash
curl https://site/.env
```

---

## 🗄️ 8. Base de données

* [ ] DB bindée sur localhost
* [ ] Port DB non exposé
* [ ] Utilisateur DB à privilèges minimaux
* [ ] Sauvegardes chiffrées

Vérif :

```bash
ss -tulpn | grep 5432
```

---

## 🐳 9. Docker (si utilisé)

* [ ] Pas de conteneur privilégié
* [ ] Pas de socket Docker exposé
* [ ] Conteneurs non-root
* [ ] Réseau Docker isolé
* [ ] Images maintenues

---

## 🚨 10. Logs & détection

* [ ] Logs UFW activés
* [ ] Logs Nginx activés
* [ ] fail2ban installé
* [ ] Surveillance des accès suspects

UFW logs :

```bash
ufw logging medium
```

---

## 🧠 11. Isolation réseau (option ++)

* [ ] Serveur isolé du LAN
* [ ] Accès admin uniquement via VPN
* [ ] Reverse proxy unique exposé
* [ ] VLAN ou sous-réseau dédié

---

## ☠️ 12. À NE JAMAIS exposer

❌ SSH public
❌ Portainer
❌ Admin DB
❌ Redis / Elasticsearch
❌ Docker API
❌ Interfaces d’administration

---

## ✅ Verdict

✔️ 80 / 443 uniquement
✔️ SSH LAN only
✔️ Firewall actif
✔️ HTTPS forcé

➡️ **Serveur conforme à un niveau “prod propre”**

---

## 🧪 Tests finaux

Scan externe :

```bash
nmap -p 22,80,443 IP_PUBLIQUE
```

Résultat attendu :

* 22 → filtered / closed
* 80 → open
* 443 → open
