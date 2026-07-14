### SarvaSociety

SarvaSociety is a society-management platform for gated communities with:

- one shared FastAPI backend
- one shared Supabase Postgres database
- Supabase Auth for web/mobile sign-in
- role-based experiences for admin, resident, and guard
- resident and guard flows designed to feel like a mobile app even when opened as a PWA

This repo started as a single-tenant OpenSociety codebase and is being migrated into a multi-tenant SaaS architecture.

## Current Architecture

### Backend

- Runtime: `apps/api-fastapi`
- Framework: FastAPI
- Auth: Supabase Auth JWT verification
- Database: Supabase Postgres
- Tenancy model: shared database with tenant-aware rows
- Notifications: Firebase Cloud Messaging for PWA/web push

### Frontend

- Deployable web app: `apps/web`
- Mobile/native app work: `apps/mobile`
- Single HTTPS web entry point:
  - sign in once
  - route by role
  - admin opens the console-style dashboard
  - resident opens the MyGate-style resident app
  - guard opens the MyGate-style guard app

### Roles

- `ADMIN`
  - society setup
  - apartments
  - residents
  - guards
  - notices
  - visitors
  - billing
  - reports
  - notification testing
- `RESIDENT`
  - notice board
  - daily help visibility
  - homes and vehicles
  - payments
  - maintenance tickets
  - visitor-related alerts
- `GUARD`
  - gate queue
  - walk-in registration
  - attendance / duty support
  - house-help movement visibility

## Apps In This Repo

```text
apps/
  api                legacy Hono/Workers backend kept during migration
  api-fastapi        current FastAPI + Supabase migration backend
  web                deployable single-URL role-based app
  mobile             Expo-based native/mobile app work
packages/
  db                 older schema/migration package from the legacy stack
  shared             shared contracts/types
scripts/             ordered SQL + seed/bootstrap helpers
```

## SQL And Bootstrap

Important scripts:

- `scripts/998_bootstrap_supabase_schema.sql`
  - creates the current shared Supabase schema from scratch
- `scripts/999_all_in_one_supabase_migration.sql`
  - combined migration path
- `scripts/050_seed_demo_supabase.py`
  - seeds demo tenant, users, auth-linked records, and sample operational data

For a blank Supabase project, start with:

1. Run `scripts/998_bootstrap_supabase_schema.sql`
2. Run the demo seed flow if you want local testing data

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure local-only env files

This repo intentionally does not commit any `.env` or `.env.example` files.
Create/fill these locally or in your hosting dashboards only:

- `apps/api-fastapi/.env`
- `apps/web/.env`
- optionally `apps/mobile/.env`

Key backend env values:

```bash
API_HOST=0.0.0.0
API_PORT=8788
DEFAULT_TENANT_SLUG=demo-society

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
DATABASE_URL=...

FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
PUBLIC_APP_URL=...
```

Key web env values:

```bash
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:8788
VITE_ALLOWED_HOSTS=localhost,127.0.0.1,...

VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

### 3. Start backend

```bash
cd apps/api-fastapi
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8788
```

### 4. Start web app

```bash
cd apps/web
node node_modules/vite/bin/vite.js dev --port 3000 --host 0.0.0.0
```

### 5. Optional HTTPS phone testing

Expose the web app through ngrok:

```bash
ngrok http 3000
```

The web app uses same-origin `/api` calls and proxies them to FastAPI in local dev, so the single HTTPS URL can be used for admin, resident, and guard testing.

## Deployment

### Netlify

This repo now includes `netlify.toml` at the repo root and the Netlify TanStack Start Vite plugin in `apps/web/vite.config.ts`.

Use these Netlify settings:

- Build command: `pnpm --filter @opensociety/web build`
- Build command: `pnpm --filter @opensociety/shared build && pnpm --filter @opensociety/web build`
- Publish directory: `apps/web/dist/client`
- Node version: `20`

Required Netlify environment variables:

```bash
VITE_API_URL=https://your-render-api.onrender.com
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-sender-id
VITE_FIREBASE_APP_ID=your-firebase-web-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-firebase-measurement-id
VITE_FIREBASE_VAPID_KEY=your-firebase-web-push-vapid-key
```

Notes:

- In production, point `VITE_API_URL` at the deployed Render API or your custom API domain.
- For a single public app URL, keep the user-facing URL on Netlify and use the API domain only as an internal frontend config value.

### Render

This repo now includes `render.yaml` at the repo root for the FastAPI backend.

Render service settings:

- Root directory: `apps/api-fastapi`
- Runtime: `python`
- Build command: `pip install .`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}`
- Health check path: `/health`

Required Render environment variables:

```bash
APP_ENV=production
API_HOST=0.0.0.0
API_PORT=10000
DEFAULT_TENANT_SLUG=demo-society
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
PUBLIC_APP_URL=https://your-netlify-site.netlify.app
UPLOADS_DIR=.uploads
API_CORS_ORIGINS=https://your-netlify-site.netlify.app,https://app.yourdomain.com
```

Notes:

- Use `FIREBASE_SERVICE_ACCOUNT_JSON` on Render so the backend can send push notifications without any committed admin-key file.
- `PUBLIC_APP_URL` should point to the Netlify app URL.

### Firebase file policy

The mobile Firebase client files stay committed because native Expo builds need them:

- `apps/mobile/google-services.json`
- `apps/mobile/GoogleService-Info.plist`

Do not commit:

- any `.env` file
- any `.env.example` file with live values
- backend service-account secrets

## Test Accounts

Seeded demo accounts:

- Admin: `admin@demo.local` / `DemoAdmin123!`
- Resident: `resident@demo.local` / `Resident123!`
- Guard: `guard@demo.local` / `Guard123!`

## Notification Testing

Resident-side:

1. Open the single HTTPS URL on Android Chrome
2. Install the PWA
3. Sign in as a resident
4. Allow notifications

Admin-side:

1. Sign in as admin on the same web app
2. Use the notification tool in admin overview
3. Choose either:
   - one searched resident
   - all residents
4. Send a test notification

Notes:

- the system stores in-app notifications and also attempts push delivery
- `partial_failure` means some saved tokens succeeded and some stale tokens failed
- stale failed device tokens are now deactivated automatically by the backend

## Validation

Useful checks:

```bash
cd apps/api-fastapi
.venv/bin/pytest -q tests/test_app_contracts.py

cd apps/web
node node_modules/typescript/bin/tsc --noEmit
```

## Current Direction

The goal of this repo is no longer “one deployment per society”.

The target product direction is:

- one backend
- one database
- tenant-aware tables
- shared infrastructure
- one deployment serving many societies

That is the architecture currently being implemented in `apps/api-fastapi` and the role-based single-URL web experience.
