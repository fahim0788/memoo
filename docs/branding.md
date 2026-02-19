# Branding & Marketing — Memoo

> Journal de réflexions sur l'image de marque et le marketing de l'application.

---

## 2026-02-18 — Branding des emails transactionnels

### Contexte

Les emails (vérification, reset password) étaient envoyés sans identité visuelle — simple texte brut sans logo, sans couleurs de marque, sans footer.

### Solution implémentée

Layout HTML brandé appliqué à tous les emails transactionnels :

```
┌─────────────────────────────────┐
│  [Logo blanc]  Memoo            │  Header #0b0f17
│─────────────────────────────────│
│                                 │
│  Titre                          │
│  Texte                          │
│                                 │
│  ┌─────────────────────────┐    │
│  │      1 2 3 4 5 6        │    │  Code #0ea5e9
│  └─────────────────────────┘    │
│                                 │
│  Texte secondaire               │
│                                 │
│─────────────────────────────────│
│  Apprends par répétition        │
│  espacée                        │
│  memoo.fr · © 2026 Memoo        │  Footer
└─────────────────────────────────┘
```

### Palette email

| Élément       | Couleur   | Usage                        |
|---------------|-----------|------------------------------|
| Header bg     | `#0b0f17` | Fond sombre (identité Memoo) |
| Logo/text     | `#ffffff` | "Memoo" à côté du logo       |
| Code          | `#0ea5e9` | Bleu primaire de l'app       |
| Code bg       | `#f1f5f9` | Fond clair pour le code      |
| Body bg       | `#ffffff` | Fond principal               |
| Texte         | `#334155` | Corps du message             |
| Footer        | `#94a3b8` | Gris muté                    |
| Séparateur    | `#e2e8f0` | Ligne fine footer            |

### Fichiers modifiés

- `apps/api/app/_lib/email.ts` — `emailLayout()`, `codeBlock()`, `sendTestEmail()`
- `apps/api/app/_lib/config.ts` — ajout `APP_URL`
- `apps/api/app/api/test-email/route.ts` — route de test

### Technique

- Logo servi en URL absolue (`https://memoo.fr/logo-memoo-white.png`) — seule méthode fiable pour les clients email
- Styles 100% inline (obligatoire pour compatibilité email)
- Structure en `<table>` (pas de `<div>` layout) pour Outlook
- Envoi via Brevo API (ex-Sendinblue)

---

## 2026-02-18 — Avatar expéditeur dans Gmail

### Problème

Gmail affiche un avatar générique (bonhomme) pour `noreply@memoo.fr` car aucun profil Google n'est associé à cette adresse.

### Options évaluées

| Méthode            | Coût         | Gmail | Autres clients | Complexité |
|--------------------|--------------|-------|----------------|------------|
| Google Workspace   | ~6€/mois     | Oui   | Oui            | Facile     |
| BIMI + VMC         | ~1 500€/an   | Oui   | Oui            | Lourde     |
| BIMI sans VMC      | Gratuit      | Non   | Partiel        | Moyenne    |
| Gravatar           | Gratuit      | Non   | Partiel        | Facile     |

### Recommandation

**Google Workspace** — créer `noreply@memoo.fr` avec le logo Memoo en photo de profil. Gmail affichera automatiquement ce logo pour tous les mails envoyés depuis cette adresse (y compris via Brevo).

### Statut : à décider

---

## Pistes futures

- [ ] Avatar expéditeur Gmail (voir section ci-dessus)
- [ ] Email de bienvenue post-inscription (onboarding)
- [ ] Email de rappel d'apprentissage (rétention)
- [ ] Page de désinscription brandée
- [ ] Signature email avec liens réseaux sociaux
- [ ] A/B testing objets d'email (taux d'ouverture)
