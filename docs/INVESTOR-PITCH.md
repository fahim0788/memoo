# MemoList — Speech Investisseurs

> **Durée estimée : 7-8 minutes**

---

## 1. ACCROCHE (30 sec)

Imaginez : vous êtes dans le métro, sans réseau, et vous voulez réviser. Duolingo ? Impossible, il lui faut internet. Anki ? Interface des années 2000. Quizlet ? Cher et peu adapté au mobile.

**MemoList résout ce problème.** Une app d'apprentissage par répétition espacée, offline-first, qui s'adapte intelligemment à chaque carte et chaque apprenant.

---

## 2. LE PROBLÈME (1 min)

Le marché de l'e-learning pèse **250 milliards d'euros** et croît de 20% par an. Pourtant :

- **50% de la population mondiale** a une connectivité instable
- Les apps existantes demandent toutes une connexion permanente
- Anki, le leader de la répétition espacée, a une courbe d'apprentissage rédhibitoire
- Duolingo gamifie au détriment de la rétention réelle

Il y a un vide pour un outil **simple, scientifique et qui fonctionne partout**.

---

## 3. LA SOLUTION (2 min)

MemoList est une **Progressive Web App** construite sur trois piliers :

### Pilier 1 — Offline-first

L'app fonctionne intégralement sans internet. IndexedDB stocke les données localement, un Service Worker cache les assets. Quand le réseau revient, tout se synchronise automatiquement. Zéro perte de progression.

### Pilier 2 — Algorithme SM-2

La science de la répétition espacée, prouvée par 30 ans de recherche cognitive. Les intervalles s'adaptent : 1 jour, 3 jours, 7 jours, 30 jours... chaque carte a son propre rythme basé sur la performance de l'apprenant.

### Pilier 3 — Inputs intelligents

Pas de simple champ texte. L'app détecte le type de carte et propose **5 modes de réponse** :

| Mode | Description | Usage |
|------|-------------|-------|
| Oui/Non | Boutons larges | Questions binaires |
| Choix numérique | 3 options avec distracteurs | Réponses chiffrées |
| Réarrangement | Drag-and-drop de mots | Phrases, expressions |
| QCM | Choix multiples depuis le deck | Reconnaissance |
| Saisie libre | Champ texte classique | Fallback universel |

Résultat : moins de friction, plus d'engagement, plus de variété.

**Bonus** : une **évaluation IA optionnelle** via OpenAI qui comprend les reformulations et synonymes — idéal pour les langues.

---

## 4. LA TRACTION (1 min)

Le MVP est **live et fonctionnel** :

- **20+ routes API** en production
- **146 tests unitaires** validés
- Architecture **Docker complète** : déploiement en une commande
- Premier contenu : 100 questions de culture civique française
- Support bilingue FR/EN dès le jour 1
- **TTS intégré** : génération audio automatique pour les langues
- Infrastructure sur **Raspberry Pi 4 à moins de 5€/mois**

### Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | Next.js 14, React 18, TypeScript, TailwindCSS |
| Backend | Next.js API Routes, Prisma 7, PostgreSQL 16 |
| Offline | IndexedDB, Service Worker, Sync Queue |
| IA | OpenAI API (évaluation + TTS) |
| Infra | Docker Compose, Nginx, Let's Encrypt |

---

## 5. LE MARCHÉ (1 min)

### Cible initiale : les francophones

300 millions de locuteurs — France, Canada, Afrique francophone.

### Segments prioritaires

1. **Apprenants de langues** — vocabulaire, conversation
2. **Étudiants** — préparation d'examens, naturalisation
3. **Professionnels** — certifications, formation continue
4. **Enseignants** — outil de classe et d'évaluation

### Taille du marché

- **E-learning global** : 250 Mds€ (+20%/an)
- **Répétition espacée (niche)** : 10 Mds€
- **Expansion** : langues EU (espagnol, allemand, italien)

---

## 6. LE BUSINESS MODEL (1 min)

### Freemium — conversion cible 25%

| | Gratuit | Premium (4,99€/mois) | Teams (19,99€/mois) |
|---|---|---|---|
| Listes | 3 max | Illimitées | Illimitées + admin |
| Cartes | 50/liste | 200/liste | Illimitées |
| Audio TTS | Non | Oui | Oui |
| Analytics | Basiques | Avancés | Dashboard groupe |
| Publicité | Oui | Non | Non |

**Pourquoi 4,99€ ?** Prix plancher qui maximise la conversion. Duolingo = 13€, Quizlet = 12€. On capte les utilisateurs sensibles au prix.

### Projections de revenus

| Horizon | Utilisateurs | Premium (27%) | MRR |
|---------|-------------|---------------|-----|
| M6 | 2 000 | 540 | ~2 400€ |
| M12 | 10 000 | 2 700 | ~12 000€ |
| M18 | 30 000 | 8 100 | ~36 000€ |
| Y2 | 50 000+ | 15 000+ | ~75 000€ |

**Seuil de rentabilité** : ~5 000 utilisateurs (25% premium)

### Hypothèses

- Croissance organique 25%/mois (sans paid marketing)
- Conversion premium 27% (standard EdTech freemium)
- Churn mensuel 4,5%
- Mix abonnements : 60% mensuel, 35% annuel

---

## 7. L'AVANTAGE COMPÉTITIF (1 min)

| Critère | MemoList | Duolingo | Anki | Quizlet |
|---------|----------|----------|------|---------|
| Offline | **Natif** | Non | Partiel | Non |
| Répétition espacée | **SM-2 adaptatif** | Basique | SM-2 | Basique |
| UX mobile | **PWA moderne** | App native | Archaïque | Correct |
| IA intégrée | **Oui (optionnel)** | Oui | Non | Non |
| Prix | **4,99€** | 12,99€ | 25€ one-shot | 11,99€ |
| Coût infra | **~50€/mois** | Millions | Open source | Millions |

### Notre moat

**Offline-first + IA + coût d'infra minimal** = unit economics imbattables.

- **LTV estimé** : 120€ (durée vie moyenne 24 mois)
- **CAC cible** : 10€ (ratio LTV:CAC = 12:1)
- **Marge brute** : >85% (infra négligeable vs. revenus)

---

## 8. COÛTS D'INFRASTRUCTURE

| Composant | Coût mensuel | Notes |
|-----------|-------------|-------|
| VPS (2 cores, 4GB) | 20–50€ | Remplace Pi 4 à ~5K users |
| PostgreSQL | Inclus | Part du VPS |
| Stockage (S3/MinIO) | 10–100€ | Scale avec TTS |
| OpenAI API (TTS) | ~200€ | Pour 10K utilisateurs |
| **Total** | **~50–350€** | Scale linéairement |

**Burn rate actuel** : ~200€/mois

---

## 9. ROADMAP

### Phase 1 — MVP (actuel)

- [x] Moteur de répétition espacée SM-2
- [x] Architecture offline-first complète
- [x] Authentification (email, JWT, vérification)
- [x] Gestion multi-listes avec réorganisation
- [x] 5 modes d'input intelligents
- [x] Évaluation IA optionnelle
- [x] TTS (text-to-speech) via worker background
- [x] Chapitres et organisation hiérarchique
- [x] Leaderboards publics
- [x] Déploiement Docker + SSL

### Phase 2 — Monétisation (M6–M18)

- [ ] Intégration Stripe (paiement)
- [ ] Tiers freemium (limites + premium)
- [ ] Analytics avancés et dashboard
- [ ] Import/export CSV, JSON
- [ ] Marketplace de decks communautaires
- [ ] Notifications push (rappels d'étude)

### Phase 3 — Scale (M18+)

- [ ] Offre Teams / B2B
- [ ] API commerciale
- [ ] CDN + Redis pour >100K users
- [ ] Partenariats écoles et centres de langues
- [ ] Expansion multilingue (ES, DE, IT)

---

## 10. LA DEMANDE

Nous cherchons **100K à 500K€** en seed :

| Poste | Budget | Détail |
|-------|--------|--------|
| Marketing & acquisition | 30K€ | SEO, content, communautés éducatives |
| Recrutement | 50K€ | 1 dev full-stack, 1 growth |
| Infrastructure | 20K€ | Scaling, CDN, monitoring |
| Runway | Reste | 12–18 mois jusqu'au prochain palier |

### Objectifs

- **M6** : 10K€ MRR
- **M18** : 100K€ MRR
- **Sortie potentielle** : acquisition EdTech (Duolingo, Quizlet, Pearson) ou Series A

### KPIs à suivre

| Métrique | Cible |
|----------|-------|
| Croissance utilisateurs | 20% MoM |
| Rétention W1 | >50% |
| Rétention M1 | >30% |
| Conversion premium | >25% |
| Churn mensuel | <5% |
| LTV:CAC | >3:1 |

---

## 11. CLOSING

MemoList, c'est la science de la mémoire dans la poche de chacun — avec ou sans internet.

Le MVP est live, l'architecture scale, et le marché est immense.

**Qui veut apprendre sans limites ?**

---

*Document préparé en février 2026 — MemoList MVP*
