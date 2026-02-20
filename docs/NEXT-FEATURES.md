# Next Features - Roadmap

## Event Tracking & Cleanup System

### ✅ Completed (2026-02-20)
- [x] Table `Event` créée pour tracer les événements anonymes (GDPR compliant - pas d'IP)
- [x] Endpoint `POST /api/events` pour créer les événements
- [x] Client-side event tracker utility (`event-tracker.ts`)
- [x] Intégration sur page login : `PAGE_VISITED`, `EMAIL_VERIFICATION_SENT`
- [x] Message "spam hint" discret quand code de vérification envoyé

### 🔄 In Progress
- [ ] **Worker - Nettoyage des comptes non validés**
  - [ ] Jour 3 : Envoyer rappel 1 + tracer REMINDER_1_SENT
  - [ ] Jour 7 : Envoyer rappel 2 + tracer REMINDER_2_SENT
  - [ ] Jour 14 : Envoyer rappel 3 + tracer REMINDER_3_SENT
  - [ ] Jour 21 : Supprimer le compte + tracer ACCOUNT_DELETED
  - [ ] Logger tous les événements dans table `Event`
  - [ ] Intégrer au worker existant (polling ou cron)

### 📋 TODO - Future
- [ ] **Dashboard Analytics**
  - [ ] Afficher le funnel de registration (PAGE_VISITED → REGISTRATION_COMPLETED → EMAIL_VERIFIED)
  - [ ] Taux de conversion par étape
  - [ ] Temps moyen entre événements
  - [ ] Nombre de visiteurs uniques (par sessionId)
  - [ ] Endpoint `GET /api/analytics/funnel` pour l'admin

- [ ] **Tracer plus d'événements**
  - [ ] EMAIL_VERIFIED (quand email est validé)
  - [ ] FORGOT_PASSWORD_REQUESTED
  - [ ] PASSWORD_RESET
  - [ ] LOGIN_SUCCESSFUL
  - [ ] ACCOUNT_VERIFIED

- [ ] **Honeypot/Anti-spam**
  - [ ] Champ invisible dans formulaire registration
  - [ ] Bloquer si rempli (bot detection)
  - [ ] Tracer SPAM_DETECTED dans Event

- [ ] **Rate limiting avancé**
  - [ ] Rate limit par IP sur `/api/events` (prevent spam)
  - [ ] Rate limit par sessionId sur registration/login

- [ ] **Campagne marketing tracking**
  - [ ] Paramètre `utm_source`, `utm_campaign` dans metadata
  - [ ] Tracker la source de conversion (paid ads, organic, etc.)

---

## Architecture Notes

### Event Types
```typescript
// AUTH
PAGE_VISITED
REGISTRATION_STARTED
REGISTRATION_COMPLETED
EMAIL_VERIFICATION_SENT
REMINDER_1_SENT
REMINDER_2_SENT
REMINDER_3_SENT
ACCOUNT_DELETED
EMAIL_VERIFIED
LOGIN_SUCCESSFUL
FORGOT_PASSWORD_REQUESTED
PASSWORD_RESET

// EMAIL
EMAIL_VERIFICATION_SENT
REMINDER_1_SENT
REMINDER_2_SENT
REMINDER_3_SENT

// CLEANUP
ACCOUNT_DELETED

// SYSTEM
SPAM_DETECTED
```

### Database
- Table `Event` : sessionId, type, category, action, metadata, status, createdAt
- Index sur : userId+category, type+createdAt, status+createdAt, sessionId+createdAt

### Worker Pattern
- Polling loop dans `apps/worker/src/index.ts`
- Tâches périodiques (hourly check for cleanup)
- Event logging pour chaque action

### GDPR Compliance
- ✅ No IP stored
- ✅ sessionId only (fully anonymous)
- ✅ No cookies tracking consent needed
- ✅ No user data in metadata (unless explicitly opted-in later)

---

## Links
- Event tracker: `apps/web/src/lib/event-tracker.ts`
- API endpoint: `apps/api/app/api/events/route.ts`
- Schema: `packages/db/prisma/schema.prisma`
- Migration: `packages/db/prisma/migrations/1740058800_add_event_journal/`
