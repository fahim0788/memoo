# Email Deliverability - Memoo

## Stack

| Composant | Valeur |
|-----------|--------|
| Provider | **Brevo** (ex-Sendinblue) |
| Sender | `noreply@memoo.fr` |
| Domaine | `memoo.fr` |
| Type | Emails transactionnels (code de verification, reset password) |

---

## DNS - Enregistrements requis

Les 3 enregistrements suivants sont **obligatoires** pour que Gmail accepte les emails en inbox.

### SPF (Sender Policy Framework)

Autorise Brevo a envoyer des emails pour `memoo.fr`.

| Champ | Valeur |
|-------|--------|
| Type | `TXT` |
| Nom | `@` (ou `memoo.fr`) |
| Valeur | `v=spf1 include:sendinblue.com ~all` |

Verification :
```bash
nslookup -type=TXT memoo.fr
```

### DKIM (DomainKeys Identified Mail)

Signature cryptographique ajoutee par Brevo a chaque email.

| Champ | Valeur |
|-------|--------|
| Type | `TXT` |
| Nom | `mail._domainkey` |
| Valeur | Cle fournie par Brevo |

La cle DKIM se trouve dans : **Brevo > Settings > Senders, Domains & Dedicated IPs > Domains > memoo.fr**

Verification :
```bash
nslookup -type=TXT mail._domainkey.memoo.fr
```

### DMARC (Domain-based Message Authentication)

Indique aux serveurs mail comment traiter les emails non authentifies.

| Champ | Valeur |
|-------|--------|
| Type | `TXT` |
| Nom | `_dmarc` |
| Valeur | `v=DMARC1; p=none; rua=mailto:admin@memoo.fr` |

> `p=none` = mode monitoring (pas de rejet). Passer a `p=quarantine` une fois que tout fonctionne.

Verification :
```bash
nslookup -type=TXT _dmarc.memoo.fr
```

---

## Configuration Brevo

1. Aller dans **Settings > Senders, Domains & Dedicated IPs**
2. Ajouter le domaine `memoo.fr` s'il n'existe pas
3. Verifier que le domaine affiche une **coche verte** (domaine verifie)
4. Activer l'**authentification DKIM** et copier la cle dans le DNS
5. Verifier le statut SPF

---

## Bonnes pratiques

### Sujet
- Ne pas commencer par un code numerique (`847291 - Verification...`)
- Preferer : `Memoo - Votre code de verification`

### Expediteur
- `noreply@` peut etre penalise par certains filtres
- Alternative : `verification@memoo.fr` ou `bonjour@memoo.fr`

### Contenu HTML
- Ratio texte/image equilibre
- Eviter les mots spam : "gratuit", "urgent", "cliquez ici"

### Reputation du domaine neuf
- Gmail est mefiant envers les nouveaux expediteurs
- Envoyer en petits volumes au debut
- Demander aux premiers utilisateurs de marquer "non spam"

---

## Diagnostic

### Test complet avec mail-tester.com

1. Aller sur [mail-tester.com](https://www.mail-tester.com)
2. Copier l'adresse email temporaire affichee
3. Envoyer un email test via l'API :
   ```bash
   curl -X POST https://memoo.fr/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"to": "adresse@srv1.mail-tester.com"}'
   ```
4. Consulter le score — objectif : **>= 8/10**

### Verifier les DNS

```bash
nslookup -type=TXT memoo.fr                    # SPF
nslookup -type=TXT mail._domainkey.memoo.fr     # DKIM
nslookup -type=TXT _dmarc.memoo.fr              # DMARC
```

### Verifier les headers d'un email recu

Dans Gmail : ouvrir l'email > 3 points > **Afficher l'original** :
- `SPF: PASS`
- `DKIM: PASS`
- `DMARC: PASS`

Si l'un affiche `FAIL`, c'est la cause du spam.

---

## Checklist

- [ ] SPF configure (`include:sendinblue.com`)
- [ ] DKIM active dans Brevo + cle ajoutee au DNS
- [ ] DMARC configure
- [ ] Domaine verifie dans Brevo (coche verte)
- [ ] Score mail-tester.com >= 8/10
- [ ] Email de verification arrive en inbox Gmail
