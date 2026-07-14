# OpenSociety FastAPI Migration Backend

This service is the in-repo migration target for moving OpenSociety from:

- Hono + Cloudflare Workers
- Neon + Drizzle
- Clerk auth
- single-tenant deployment per society

to:

- FastAPI
- Postgres with multi-tenant data isolation
- Supabase Auth
- one shared deployment for many societies

## Current Status

This app is now a real compatibility-first migration backend, not just a stub:

- root and health endpoints preserve the current response contract
- tenant resolution is defined centrally
- auth resolution is shaped for Supabase JWTs plus local dev fallbacks
- route groups mirror the current API structure so the web app can stay unchanged
- tenant-aware implementations now exist for:
  - `society`
  - `users`
  - `apartments`
  - `visitors`
  - `visitors/pre-approvals`
  - `notices`
  - `guards`
  - `guards/duty`
  - `tickets`
  - `vehicles`
  - `parking`
  - `bills`
  - `payments`
  - `bill-config`
  - `reports`
  - `house-help`
- `uploads`
- `webhooks/auth` plus a legacy-compatible `webhooks/clerk` alias
- visitor parking occupancy is now wired into visitor check-in/check-out so guard flows remain behaviorally aligned
- ordered SQL migration scripts for the current multi-tenant rollout live in the repo-root `scripts/` folder through `035`
- contract tests currently pass locally against the FastAPI app

## Local Development

1. Create a virtual environment.
2. Install dependencies from `pyproject.toml`.
3. Copy `.env.example` to `.env`.
4. Run:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8788
```

## Frontend Compatibility Goal

The web app must remain unchanged while the backend is ported. During local validation, point the web app to this service by setting:

```bash
VITE_API_URL=http://localhost:8788
```

Only after contract parity is reached should this service replace the current worker backend.

## Database Mode

This FastAPI backend is intended to run against Supabase Postgres only.

- No local SQLite fallback is used at runtime.
- Set either `DATABASE_URL` to your Supabase Postgres connection string, or set
  `SUPABASE_DB_PASSWORD` plus the related Supabase DB host settings.
- The bootstrap/migration SQL in the repo is the source of truth for schema setup.

## Current Validation

Run the local contract suite with:

```bash
. .venv/bin/activate && pytest tests/test_app_contracts.py
```

Latest local result:

```text
29 passed
```
