# WireGuard – Guide complet (Linux → Windows)

Ce document résume **tout ce que nous avons vu ensemble**, puis propose un **tutoriel pas à pas** pour :

* installer WireGuard sur un **serveur Linux (Raspberry Pi / VPS)**
* se connecter depuis un **PC Windows**
* accéder au serveur en **SSH**
* comprendre les **erreurs fréquentes**
* explorer les **cas d’usage avancés** et la **scalabilité**

---

## 1. Qu’est-ce que WireGuard ?

WireGuard est un **protocole VPN moderne**, open‑source, conçu pour être :

* simple
* rapide
* sécurisé
* facile à auditer

Caractéristiques clés :

* fonctionne uniquement en **UDP**
* pas de négociation complexe
* pas de messages d’erreur explicites
* un seul indicateur de succès : **le handshake**

---

## 2. Principe de fonctionnement (très important)

WireGuard fonctionne comme un **tunnel IP chiffré**.

* chaque pair possède :

  * une clé privée
  * une clé publique
* le routage se fait via `AllowedIPs`
* l’acheminement réseau externe se fait via `Endpoint`

### Indicateur de succès

```bash
sudo wg
```

Si tu vois :

```
latest handshake: il y a X secondes
```

👉 le tunnel fonctionne.

S’il n’apparaît pas :
👉 **aucun paquet n’est reçu**.

---

## 3. Architecture cible (cas simple)

```
PC Windows (client)
   |
   |  Internet (UDP)
   |
IP publique + Box + NAT
   |
Raspberry Pi / Serveur Linux
```

---

## 4. Installation côté serveur Linux (Raspberry Pi)

### 4.1 Installer WireGuard

```bash
sudo apt update
sudo apt install -y wireguard
```

### 4.2 Générer les clés

```bash
wg genkey | tee server.key | wg pubkey > server.pub
```

---

## 5. Configuration du serveur (`/etc/wireguard/wg0.conf`)

```ini
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <CONTENU DE server.key>

# NAT pour accéder au LAN
PostUp   = iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
PostDown = iptables -t nat -D POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

[Peer]
PublicKey = <CLE PUBLIQUE WINDOWS>
AllowedIPs = 10.8.0.2/32
```

### Activer le service

```bash
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

Vérifier :

```bash
sudo ss -lunp | grep 51820
```

---

## 6. Ouverture du port sur la box

* Port : `51820`
* Protocole : **UDP**
* Redirection vers : IP locale du Raspberry Pi

⚠️ `ping` ne teste PAS un port.

---

## 7. Configuration côté Windows

### 7.1 Installer WireGuard

* [https://www.wireguard.com/install/](https://www.wireguard.com/install/)

### 7.2 Générer les clés

Depuis l’interface WireGuard Windows.

### 7.3 Configuration client

```ini
[Interface]
PrivateKey = <CLE PRIVEE WINDOWS>
Address = 10.8.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = <CLE PUBLIQUE SERVEUR>
Endpoint = IP_PUBLIQUE:51820
AllowedIPs = 10.8.0.1/32
PersistentKeepalive = 25
```

---

## 8. Test de connexion

### 8.1 Côté serveur

```bash
sudo wg
```

Attendu :

```
latest handshake: il y a X secondes
```

### 8.2 Ping tunnel

```powershell
ping 10.8.0.1
```

---

## 9. Accès SSH via WireGuard

Sur Windows :

```powershell
ssh utilisateur@10.8.0.1
```

👉 Le SSH passe **dans le tunnel VPN**, pas sur Internet.

---

## 10. Problèmes fréquents et diagnostic

### 10.1 Pas de handshake

Cause la plus fréquente :

* **UDP sortant bloqué (réseau d’entreprise)**

### Test irréfutable

```bash
sudo tcpdump -i eth0 udp port 51820
```

Aucun paquet = blocage réseau.

---

## 11. Cas d’usage courants

### Accès personnel sécurisé

* SSH
* NAS
* Home Lab

### Accès pro

* bastion d’administration
* accès cloud privé
* réseau multi‑sites

### Zero‑Trust

* aucun port exposé hors VPN

---

## 12. Scalabilité WireGuard

### Limites

* pas de gestion d’utilisateurs native
* pas de portail
* pas de MFA intégré

### Patterns de montée en charge

* hub & spoke
* mesh partiel
* gateway WireGuard

### Solutions basées sur WireGuard

* Tailscale
* Zerotier
* Netmaker

---

## 13. Bonnes pratiques sécurité

* clés uniques par client
* `AllowedIPs` minimal
* firewall strict
* rotation des clés
* logs système surveillés

---

## 14. À retenir

* WireGuard est **fiable, audité et sûr**
* silence ≠ erreur
* handshake = vérité
* réseau > configuration

---

