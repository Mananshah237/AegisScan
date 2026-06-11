# AegisScan — Status

_Last updated: 2026-06-10_

## State: working & verified

- **Stack:** `docker compose up -d --build` → db, redis, backend, worker, frontend all healthy.
- **Ports:** web **3001**, API **8001** (db/redis internal-only) — runs alongside VEXIS (3000/8000) and PhishNet (3002/8002).
- **Frontend:** builds clean (`tsc -b && vite build`, 2490 modules); fully redesigned dark "security console" UI.
- **Backend/API:** signup → login → targets → stats verified via REST.
- **Scanning:** a real ZAP quick scan of `https://example.com` completed in ~66s and produced **11 parsed findings** in PostgreSQL.

## Recent fixes

1. Restored missing `frontend/src/lib/{api.ts,utils.ts}` (excluded by an over-broad `lib/` gitignore rule) — frontend now compiles.
2. Scoped the `lib/` ignore rule to `/backend/` and added a `!frontend/src/lib/` guard.
3. Migrated CSS to Tailwind v4 (`@import "tailwindcss"`) + design tokens.
4. New app shell (`components/AppLayout.tsx`), UI kit (`components/ui.tsx`), and redesigned all pages.
5. Fixed `HOST_ARTIFACTS_PATH` in `docker-compose.yml` (`…/Downloads/AegisScan/…` → `…/Downloads/projects/AegisScan/…`) so ZAP sibling-container reports are readable by the worker.

## Sample login

`analyst@aegisscan.io` / `Aegis@Scan2026` — stored in PostgreSQL `autoappsec.users` (bcrypt), persisted in the `postgres_data` volume. JWTs live in browser `localStorage`.

## Next (see README → Optimization roadmap)

Code-split the ~740 KB bundle · enforce SSRF allow-list · live scan progress · findings filtering/pagination · seed script · pin ZAP image by digest.
