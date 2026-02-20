# Gestion des mises à jour forcées (Forced Updates)

## Vue d'ensemble

Système de contrôle de version permettant de forcer les utilisateurs à mettre à jour l'app quand une version critique est déployée (ex: breaking changes, fin de support d'une version).

**Cas d'usage:**
- Refonte majeure (ex: Android rewrite)
- Changements API incompatibles
- Fin de support d'une version mobile
- Corrections de sécurité critiques

---

## Architecture

### Flux global

```
[Client App] --check version--> [GET /api/version]
                                     ↓
                          [Retourne minimumVersion + forceUpdate]
                                     ↓
                          [Client compare: appVersion vs minimumVersion]
                                     ↓
                    forceUpdate=true ? --> [Affiche modal bloquante]
                              ↓
                              NO --> [Accès normal]
                              ↓
                              YES --> [Bouton "Mettre à jour" -> Store]
```

### Endpoints

#### **GET /api/version** (ou inclus dans `/api/health`)

```json
{
  "minimumVersion": "2.0.0",
  "currentVersion": "2.0.0",
  "forceUpdate": false,
  "updateUrl": "https://play.google.com/store/apps/details?id=com.memoo",
  "message": "Version 2.0 avec refonte Android",
  "releaseDate": "2026-03-01T00:00:00Z"
}
```

**Réponse détaillée:**
- `minimumVersion`: version min requise (ex: "1.2.0")
- `currentVersion`: version actuelle du serveur
- `forceUpdate`: booléen = bloquer accès si version < minimumVersion
- `updateUrl`: lien Play Store / App Store
- `message`: message optionnel (afficher dans modal)
- `releaseDate`: date du déploiement forcé

---

## Implémentation

### Backend (Node.js/Express)

**1. Ajouter version à `.env`**
```bash
# .env
APP_VERSION=1.0.0
MINIMUM_APP_VERSION=1.0.0
FORCE_UPDATE=false
STORE_URL=https://play.google.com/store/apps/details?id=com.memoo
```

**2. Route endpoint**

```typescript
// apps/api/src/routes/version.ts
import express from 'express';

const router = express.Router();

router.get('/api/version', (req, res) => {
  res.json({
    minimumVersion: process.env.MINIMUM_APP_VERSION,
    currentVersion: process.env.APP_VERSION,
    forceUpdate: process.env.FORCE_UPDATE === 'true',
    updateUrl: process.env.STORE_URL,
    message: process.env.FORCE_MESSAGE || 'Mise à jour requise',
    releaseDate: process.env.FORCE_DATE || null
  });
});

export default router;
```

**3. Inclure dans health check (optional)**

```typescript
// Ajouter à GET /api/health
router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    version: {
      minimumVersion: process.env.MINIMUM_APP_VERSION,
      currentVersion: process.env.APP_VERSION,
      forceUpdate: process.env.FORCE_UPDATE === 'true'
    }
  });
});
```

---

### Frontend (Next.js/React)

**1. Créer hook `useVersionCheck`**

```typescript
// apps/web/src/hooks/useVersionCheck.ts
import { useEffect, useState } from 'react';

interface VersionInfo {
  minimumVersion: string;
  currentVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
  message?: string;
  releaseDate?: string;
}

export function useVersionCheck() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version');
        const data: VersionInfo = await res.json();
        setVersionInfo(data);

        // Comparer versions (ex: "1.2.0" vs "2.0.0")
        const isOutdated = compareVersions(
          getAppVersion(),
          data.minimumVersion
        ) < 0;

        if (isOutdated && data.forceUpdate) {
          setNeedsUpdate(true);
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    checkVersion();
    // Recheck toutes les heures
    const interval = setInterval(checkVersion, 3600000);
    return () => clearInterval(interval);
  }, []);

  return { versionInfo, needsUpdate };
}

// Utilitaire: comparer versions
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

// Lire version depuis package.json ou localStorage
function getAppVersion(): string {
  // Option 1: depuis package.json (build-time)
  return process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

  // Option 2: depuis localStorage (si updateable at runtime)
  // return localStorage.getItem('appVersion') || '1.0.0';
}
```

**2. Créer modal de forçage**

```typescript
// apps/web/src/components/ForceUpdateModal.tsx
'use client';

import { useVersionCheck } from '@/hooks/useVersionCheck';

export function ForceUpdateModal() {
  const { versionInfo, needsUpdate } = useVersionCheck();

  if (!needsUpdate || !versionInfo) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-2">
          Mise à jour requise
        </h2>

        <p className="text-gray-600 mb-4">
          {versionInfo.message || 'Une nouvelle version est requise pour continuer.'}
        </p>

        {versionInfo.releaseDate && (
          <p className="text-sm text-gray-500 mb-4">
            Disponible depuis: {new Date(versionInfo.releaseDate).toLocaleDateString('fr-FR')}
          </p>
        )}

        <button
          onClick={() => {
            window.location.href = versionInfo.updateUrl;
          }}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
        >
          Mettre à jour maintenant
        </button>
      </div>
    </div>
  );
}
```

**3. Intégrer au layout root**

```typescript
// apps/web/src/app/layout.tsx
import { ForceUpdateModal } from '@/components/ForceUpdateModal';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <ForceUpdateModal />
        {children}
      </body>
    </html>
  );
}
```

**4. Ajouter APP_VERSION à `.env.local`**

```bash
# apps/web/.env.local
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

## Stratégies de déploiement

### **Stratégie 1: Forçage immédiat (Breaking changes)**

```bash
FORCE_UPDATE=true
MINIMUM_APP_VERSION=2.0.0
FORCE_MESSAGE="Nouvelle version avec refonte majeure"
```
✅ Cas: API incompatibles, sécurité critique
❌ UX: Utilisateurs bloqués immédiatement

### **Stratégie 2: Soft update → Force (Grace period)**

**Jour 1-7:** `forceUpdate=false` (reminder optionnel)
```bash
FORCE_UPDATE=false
MINIMUM_APP_VERSION=2.0.0
```

**Jour 8+:** `forceUpdate=true`
```bash
FORCE_UPDATE=true
MINIMUM_APP_VERSION=2.0.0
```

✅ Cas: Refonte majeure (Android rewrite)
✅ UX: 1 semaine pour mettre à jour

### **Stratégie 3: Soft update (Banner info)**

Toujours `forceUpdate=false` mais afficher banner:

```typescript
// Dans modal ou banner
{!needsUpdate && versionInfo?.updateAvailable && (
  <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4">
    Nouvelle version disponible → <a href={...}>Mettre à jour</a>
  </div>
)}
```

### **Stratégie 4: Slow rollout (Canary)**

Augmenter `MINIMUM_APP_VERSION` progressivement:
- Jour 1: `MINIMUM_APP_VERSION=1.9.0` (10% des users)
- Jour 2: `MINIMUM_APP_VERSION=1.8.0` (50%)
- Jour 3: `MINIMUM_APP_VERSION=1.0.0` (100%)

---

## Bonnes pratiques

### ✅ À FAIRE

- **Communiquer à l'avance** (email, banner 7 jours avant)
- **Raison claire** dans le message modal
- **Lien direct** vers store (Play Store / App Store)
- **Grace period** minimum 3-7 jours
- **Recheck version** au démarrage + toutes les heures
- **Tester** force update avant prod
- **Versioning sémantique** (MAJOR.MINOR.PATCH)

### ❌ À ÉVITER

- Forcer immédiatement sans warning
- Message vague ("Update required")
- Pas de grace period (sauf sécurité)
- Oublier de `document.cookie` / localStorage pour version
- Recheck trop fréquent (batterie + réseau)

---

## Checklist de déploiement

Avant de déployer une mise à jour forcée:

- [ ] Version dans `docker-compose.yml` ou `.env`
- [ ] Backend endpoint `/api/version` testé
- [ ] Frontend hook + modal implémentés
- [ ] Message clair et traduit
- [ ] Lien Play Store / App Store correct
- [ ] Grace period défini (ex: 7 jours)
- [ ] Date de forçage documentée
- [ ] Tests: version < minimumVersion bloque accès
- [ ] Tests: version >= minimumVersion permet accès
- [ ] Communication user envoyée (email, in-app)

---

## Variables d'environnement

```bash
# Backend (.env)
APP_VERSION=1.0.0
MINIMUM_APP_VERSION=1.0.0
FORCE_UPDATE=false
FORCE_MESSAGE="Mise à jour requise"
FORCE_DATE=2026-03-01T00:00:00Z
STORE_URL=https://play.google.com/store/apps/details?id=com.memoo

# Frontend (apps/web/.env.local)
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

## Références

- [Semantic Versioning](https://semver.org/)
- [Google Play: In-app updates](https://developer.android.com/guide/playcore/in-app-updates)
- [Apple App Store: Version management](https://developer.apple.com/app-store/)
