# MemoList MVP (PWA) — all-in-one VPS

MVP learning platform PWA:
- Next.js (App Router) web app (PWA, offline-first)
- Node.js API (Fastify) + Prisma + PostgreSQL
- One VPS deployment via Docker Compose + Nginx reverse proxy

## Quick start (local / VPS)
1) Copy env:
```bash
cp .env.example .env
```

2) Start:
```bash
docker compose up --build
```

3) Open:
- Web: http://localhost
- API health: http://localhost/api/health

## Notes
- Offline-first: study works without network using IndexedDB + Service Worker cache.
- Sync: minimal endpoints `/api/sync/pull` and `/api/sync/push` (single-user MVP).
- Auth: MVP static token via `X-Auth-Token` header (set in `.env`).

## Next steps (when MVP validates)
- Proper auth (email/OAuth)
- Multi-user + tenancy
- Background jobs (worker/scheduler)
- Observability (OTEL)
