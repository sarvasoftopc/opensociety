# TASK-001: FastAPI + Supabase backend port and multi-tenant redesign

## Task ID

`TASK-001`

## Task Title

FastAPI + Supabase backend port and multi-tenant redesign

## Objective

Port the current Hono + Cloudflare Workers backend to Python FastAPI with Supabase-based authentication while preserving all existing API contracts and frontend behavior, then evolve the data model from single-tenant-per-society to one shared multi-tenant platform.

## Scope

- Inspect the current backend, auth, and schema contract surface.
- Define the safe migration path from single-tenant to multi-tenant.
- Preserve existing HTTP routes, request/response shapes, and frontend integration points so the web app can remain unchanged.
- Validate the migrated backend locally through the existing web app before any deployment.

## Branch Name

`backend/TASK-001-fastapi-supabase-multitenant-port`

## Sub-tasks

1. Confirm repo/backend/auth architecture and tenancy assumptions.
2. Create a safe working fork and dedicated task branch.
3. Document the recommended target architecture and migration phases.
4. Port backend in contract-safe phases.
5. Validate locally with the existing web app before deployment.

## Files Planned For Inspection

- `README.md`
- `apps/api/README.md`
- `apps/api/src/index.ts`
- `apps/api/src/middleware.ts`
- `packages/shared/src/index.ts`
- `packages/db/schema.dbml`
- `packages/db/src/schema/society-config.ts`
- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/contracts.test.ts`
- `apps/api/src/routes/society.ts`
- `apps/api/src/routes/users.ts`
- `apps/api/src/routes/visitors.ts`
- `packages/shared/src/apartment.ts`
- `apps/api/src/routes/apartments.ts`
- `packages/db/src/schema/enums.ts`
- `packages/db/src/schema/residencies.ts`
- `packages/db/src/schema/apartments.ts`
- `packages/db/src/schema/users.ts`
- `pnpm-workspace.yaml`
- `turbo.json`
- `.gitignore`
- `.env.example`

## Files Inspected

- `README.md`
- `apps/api/README.md`
- `apps/api/src/index.ts`
- `apps/api/src/middleware.ts`
- `packages/shared/src/index.ts`
- `packages/db/schema.dbml`
- `packages/db/src/schema/society-config.ts`
- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/contracts.test.ts`
- `apps/api/src/routes/society.ts`
- `apps/api/src/routes/users.ts`
- `apps/api/src/routes/visitors.ts`
- `packages/shared/src/apartment.ts`
- `apps/api/src/routes/apartments.ts`
- `packages/db/src/schema/enums.ts`
- `packages/db/src/schema/residencies.ts`
- `packages/db/src/schema/apartments.ts`
- `packages/db/src/schema/users.ts`
- `pnpm-workspace.yaml`
- `turbo.json`
- `.gitignore`
- `.env.example`

## Files Modified

- `ai/TASK.md`
- `ai/TASK_INDEX.md`
- `ai/chat/INDEX.md`
- `ai/chat/TASK-001-backend-port-multitenant-migration.md`
- `ai/RECOMMENDED_ARCHITECTURE.md`
- `README.md`
- `.gitignore`
- `apps/api-fastapi/.gitignore`
- `apps/api-fastapi/.env.example`
- `apps/api-fastapi/README.md`
- `apps/api-fastapi/pyproject.toml`
- `apps/api-fastapi/app/main.py`
- `apps/api-fastapi/app/api/deps.py`
- `apps/api-fastapi/app/api/router.py`
- `apps/api-fastapi/app/api/routes/health.py`
- `apps/api-fastapi/app/api/routes/apartments.py`
- `apps/api-fastapi/app/api/routes/guards.py`
- `apps/api-fastapi/app/api/routes/placeholders.py`
- `apps/api-fastapi/app/api/routes/notices.py`
- `apps/api-fastapi/app/api/routes/parking.py`
- `apps/api-fastapi/app/api/routes/society.py`
- `apps/api-fastapi/app/api/routes/tickets.py`
- `apps/api-fastapi/app/api/routes/users.py`
- `apps/api-fastapi/app/api/routes/vehicles.py`
- `apps/api-fastapi/app/api/routes/visitors.py`
- `apps/api-fastapi/app/core/auth.py`
- `apps/api-fastapi/app/core/config.py`
- `apps/api-fastapi/app/core/tenant.py`
- `apps/api-fastapi/app/db/base.py`
- `apps/api-fastapi/app/db/models.py`
- `apps/api-fastapi/app/db/session.py`
- `apps/api-fastapi/app/schemas/apartments.py`
- `apps/api-fastapi/app/schemas/guard_devices.py`
- `apps/api-fastapi/app/schemas/guards.py`
- `apps/api-fastapi/app/schemas/notices.py`
- `apps/api-fastapi/app/schemas/parking.py`
- `apps/api-fastapi/app/schemas/society.py`
- `apps/api-fastapi/app/schemas/tickets.py`
- `apps/api-fastapi/app/schemas/users.py`
- `apps/api-fastapi/app/schemas/vehicles.py`
- `apps/api-fastapi/app/schemas/visitors.py`
- `apps/api-fastapi/tests/test_app_contracts.py`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/index.tsx`
- `apps/mobile/app/sign-in.tsx`
- `apps/mobile/app/notices.tsx`
- `apps/mobile/app/tickets.tsx`
- `apps/mobile/app/my-vehicles.tsx`
- `apps/mobile/app/visitors.tsx`
- `apps/mobile/app/pre-approve.tsx`
- `apps/mobile/app/gate.tsx`
- `apps/mobile/app/duty.tsx`
- `apps/mobile/app/house-help.tsx`
- `apps/mobile/app.json`
- `apps/mobile/components/Button.tsx`
- `apps/mobile/components/auth-status.tsx`
- `apps/mobile/components/mobile-ui.tsx`
- `apps/web/src/routes/__root.tsx`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/sign-in.tsx`
- `apps/web/src/routes/resident.tsx`
- `apps/web/src/routes/admin/index.tsx`
- `apps/web/src/routes/admin.tsx`
- `apps/web/src/components/auth-controls.tsx`
- `apps/web/src/lib/api.ts`
- `apps/mobile/api/client.ts`
- `apps/api-fastapi/app/api/routes/notifications.py`
- `apps/api-fastapi/app/api/routes/payments.py`
- `apps/api-fastapi/app/api/routes/visitors.py`
- `apps/api-fastapi/app/api/routes/notices.py`
- `apps/api-fastapi/app/core/notifications.py`
- `apps/api-fastapi/app/schemas/notifications.py`
- `apps/mobile/api/client.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/resident.tsx`
- `apps/web/src/routes/sign-in.tsx`
- `apps/mobile/app/notices.tsx`
- `scripts/001_create_multi_tenant_foundation.sql`
- `scripts/002_tenantize_society_config.sql`
- `scripts/003_tenantize_apartments.sql`
- `scripts/004_tenantize_users.sql`
- `scripts/005_tenantize_residencies.sql`
- `scripts/006_backfill_default_tenant.sql`
- `scripts/007_enforce_not_null_and_fk_guards.sql`
- `scripts/008_tenantize_visitor_pre_approvals.sql`
- `scripts/009_tenantize_visitor_entries.sql`
- `scripts/010_backfill_visitor_tenant.sql`
- `scripts/011_enforce_visitor_tenant_not_null.sql`
- `scripts/012_tenantize_notices.sql`
- `scripts/013_tenantize_notice_reads.sql`
- `scripts/014_tenantize_guards.sql`
- `scripts/015_tenantize_guard_devices.sql`
- `scripts/016_backfill_notice_and_guard_tenant.sql`
- `scripts/017_enforce_notice_and_guard_tenant_not_null.sql`
- `scripts/018_tenantize_maintenance_tickets.sql`
- `scripts/019_backfill_maintenance_tickets_tenant.sql`
- `scripts/020_enforce_maintenance_tickets_tenant_not_null.sql`
- `scripts/021_tenantize_vehicles.sql`
- `scripts/022_tenantize_parking_slots.sql`
- `scripts/023_backfill_vehicle_and_parking_tenant.sql`
- `scripts/024_enforce_vehicle_and_parking_tenant_not_null.sql`
- `scripts/999_all_in_one_supabase_migration.sql`
- `scripts/README.md`

## Implementation Notes

- Upstream repo confirmed as single-tenant by design: one API and one database per society.
- Current backend stack: Hono on Cloudflare Workers, Drizzle ORM on Neon Postgres, Clerk auth with a local user mirror.
- Current tenancy model is enforced by a singleton `society_config` table and absence of `society_id` across domain tables.
- Preserving frontend compatibility requires keeping route paths, auth semantics, response payloads, and shared contract behavior stable during the backend swap.
- Because this is a major architecture change, the first deliverable is a migration recommendation and phased implementation plan before the actual port starts.
- Added an in-repo `apps/api-fastapi` migration scaffold so the backend port can proceed in parallel with the existing worker API instead of replacing it in one step.
- The FastAPI scaffold mirrors current top-level route groups, preserves the `GET /` and `GET /health` contracts, and centralizes tenant resolution plus Supabase-oriented auth resolution.
- Core domain routes are intentionally left as `501 not implemented` until each contract is ported and validated, to avoid silently drifting from the existing API behavior.
- Added SQLAlchemy-backed tenant and society models plus session wiring.
- Implemented the first real FastAPI business route: tenant-aware `/society` read/update with auth enforcement and persistence-backed tests.
- Added tenant-aware `/users` admin foundations for list, approve, and role update.
- Added tenant-aware `/apartments` read support to unblock the existing resident-approval UI.
- Added FastAPI apartment mutations for create, bulk import, and update so the admin unit-management screen can execute against the new backend.
- Implemented tenant-aware visitor logs, visitor lifecycle transitions, and pre-approval flows in FastAPI.
- Implemented tenant-aware notice archive, create, mark-read, and read-receipt flows in FastAPI.
- Implemented tenant-aware guard roster, update, device listing, and device revocation flows in FastAPI.
- Implemented tenant-aware maintenance ticket list/create/assign/transition flows in FastAPI.
- Implemented tenant-aware vehicle registry, resident-scoped vehicle management, and gate-log matching in FastAPI.
- Implemented tenant-aware parking inventory, directory, visitor-pool views, slot assignment, and deletion flows in FastAPI.
- Implemented tenant-aware billing, payments, bill-config, invoice PDF, and report flows in FastAPI.
- Implemented tenant-aware house-help registry, reviews, assignments, attendance, uploads, webhook mirror, and guard-duty flows in FastAPI.
- Wired visitor parking occupancy allocation/release into visitor check-in/check-out so guard parking state remains contract-compatible.
- Collected ordered SQL migration scripts in the repo-root `scripts/` folder for the current multi-tenant foundation rollout.
- Created a working Python 3.12 virtual environment at `apps/api-fastapi/.venv` and installed runtime plus dev dependencies there.
- Updated dev-auth fallback behavior so `x-user-id` resolves real tenant users by local `id` or legacy `clerk_id`, which keeps resident-scoped contract tests meaningful during the migration.
- Sanitized `apps/api-fastapi/.env.example` to remove embedded-looking secrets and replace them with placeholders.
- Added a single Supabase-ready bundled migration script so the ordered SQL can also be run as one file.
- Rebranded active user-facing surfaces from `OpenSociety` to `SarvaSociety`.
- Added a shared mobile visual system and refreshed the primary resident and guard screens so local testing feels like a focused mobile product instead of a plain shell.
- Added Expo web branding metadata for the mobile app so installability-related manifest data is in place for later HTTPS deployment.
- Fixed the admin web shell to respect auth-session state before fetching `/auth/me`, so it behaves as a real society operations console instead of hanging on an indeterminate loading state.
- Added backend in-app notification support plus optional Firebase push dispatch hooks for visitor approval requests, published notices, and admin test notifications.
- Enabled resident-side payment recording through the existing `/payments` contract so billing is no longer admin-only.
- Moved resident notice consumption into the resident dashboard experience with notice detail viewing and notification cards on the web resident surface.
- Hardened local app connectivity so the same running stack works from `localhost`, `127.0.0.1`, and LAN IP testing by resolving local API hosts on the client side and broadening FastAPI local-dev CORS matching.
- Replaced the generic web landing splash with a clearer SarvaSociety app launcher that points directly to sign-in, the mobile hub, and the separated resident/guard/admin surfaces.
- Refined the resident experience so notices and alerts stay inside scrollable card sections, notice details open in closable popups instead of bouncing through list routes, and resident house-help assignments are visible on the main dashboard.
- Clarified the shared sign-in experience so the web sign-in page explicitly explains that one Supabase login works for admin, resident, and guard, and explains the purpose of the `3000` web surface.

## Validation Performed

- Verified repo state is clean on `main` before branch creation.
- Verified upstream recent backend PRs are already merged and no existing FastAPI/Supabase migration PR was found.
- Verified fork creation to `sarvasoftopc/opensociety`.
- Verified current API route registration, auth middleware behavior, and single-tenant schema assumptions from source files.
- Added FastAPI migration scaffold files and local dev configuration.
- Verified the first implemented FastAPI route with persistence-backed contract tests.
- `python3 -m compileall apps/api-fastapi/app apps/api-fastapi/tests` re-run after the `/users`, `/apartments`, and `scripts/` updates
- `python3 -m compileall apps/api-fastapi/app apps/api-fastapi/tests`
- `. .venv/bin/activate && pytest tests/test_app_contracts.py` -> 12 passed
- `. .venv/bin/activate && pytest tests/test_app_contracts.py` -> 16 passed after adding visitor and pre-approval coverage
- `. .venv/bin/activate && pytest tests/test_app_contracts.py` -> 20 passed after adding notice and guard coverage
- `. .venv/bin/activate && pytest tests/test_app_contracts.py` -> 26 passed after adding ticket, vehicle, and parking coverage
- `. .venv/bin/activate && pytest tests/test_app_contracts.py` -> 29 passed after adding finance, house-help, uploads, webhooks, and guard-duty coverage
- `. .venv/bin/activate && pytest tests/test_app_contracts.py` -> 31 passed after Supabase-only auth compatibility fixes, tenant-resolution hardening, and local host regression coverage
- `cd apps/web && pnpm run check-types`
- `cd apps/mobile && pnpm run check-types`
- Verified live local backend on `http://0.0.0.0:8788` against Supabase Postgres
- Verified live local web on `http://192.168.1.2:3000`
- Seeded Supabase auth users plus demo tenant data with `scripts/050_seed_demo_supabase.py`
- Verified real Supabase bearer-token auth against `GET /auth/me`
- Verified live local mobile web on `http://192.168.1.2:8081`
- Verified browser-level rendering for `/app`, `/admin`, `/resident`, and `/guard` against the FastAPI backend
- Verified browser-level rendering from both `http://127.0.0.1:*` and `http://192.168.1.2:*` after local-host API resolution and CORS fixes
- `pnpm --dir apps/web run check-types`
- `pnpm --dir apps/mobile run check-types`
- Verified resident mobile-style flows on real auth:
  - `/`
  - `/notices`
  - `/tickets`
  - `/my-vehicles`
  - `/bills`
- Verified guard mobile-style flows on real auth:
  - `/`
  - `/gate`
  - `/duty`
  - `/house-help`
- Re-ran `cd apps/web && pnpm run check-types` after the SarvaSociety branding and landing-page updates
- Re-ran `cd apps/mobile && pnpm run check-types` after the mobile UI overhaul
- Re-ran `. .venv/bin/activate && pytest tests/test_app_contracts.py` -> 32 passed after the UI/branding pass
- Re-started local runtime services after the UI pass and re-verified:
  - `curl http://127.0.0.1:8788/health` -> `{"status":"ok"}`
  - `curl -I http://127.0.0.1:3000` -> `200`
  - `curl -I http://127.0.0.1:8081` -> `200`
- Re-ran `cd apps/web && pnpm run check-types` after the resident dashboard, admin auth gate, payment, and notification updates
- Re-ran `cd apps/api-fastapi && . .venv/bin/activate && python -m pip install -e '.[dev]'` to install Firebase Admin support
- Re-ran `cd apps/api-fastapi && . .venv/bin/activate && pytest tests/test_app_contracts.py -q` -> 32 passed after the notification/payment backend updates
- Rebuilt `packages/shared` after extending the visitor and guard-duty contracts for mobile resident and guard flows
- Re-ran `pnpm --dir apps/mobile check-types` after adding the resident bottom-bar route targets, resident profile editing, guard attendance capture UI, and walk-in registration overhaul
- Re-ran `cd apps/api-fastapi && .venv/bin/pytest -q tests/test_app_contracts.py` -> 32 passed after preserving visitor-create backward compatibility while adding optional `partnerName`, `apartmentLabel`, `checkpoint`, and `clockInPhotoUrl` fields
- Applied `scripts/036_mobile_guard_and_visitor_fields.sql` to the live Supabase database used for local testing
- Re-started FastAPI on `http://0.0.0.0:8788` after the new resident/guard flow changes
- Verified live API behavior for:
  - `GET /auth/me`
  - `GET /guards/duty/active`
  - `POST /visitors` with `partnerName`
  - `GET /visitors` showing `apartmentLabel` and `partnerName`
- Verified frontend reachability after the new pass:
  - `curl -I http://127.0.0.1:3000` -> `200`
  - `curl -I http://127.0.0.1:8081` -> `200`
- Updated Expo mobile identifiers in `apps/mobile/app.json`:
  - iOS bundle identifier -> `com.sarvasoft.sarvasociety`
  - Android package -> `com.sarvasoft.sarvasociety`
- Placed Firebase native client configs in the Expo app:
  - `apps/mobile/google-services.json`
  - `apps/mobile/GoogleService-Info.plist`
- Updated Expo config to reference those Firebase files for Android and iOS native builds
- Added Firebase web/PWA config to local web/mobile env files and placeholders to env examples
- Added web push/PWA wiring for the web app:
  - `apps/web/public/firebase-messaging-sw.js`
  - `apps/web/src/lib/firebase-web.ts`
  - web auth-session push registration and permission flow
  - installable PWA manifest/head metadata
  - resident/guard/admin push-enable UI cards
- Added SQL for notification persistence and device tokens:
  - `scripts/037_notifications_and_device_tokens.sql`
  - included in `998_bootstrap_supabase_schema.sql`
  - included in `999_all_in_one_supabase_migration.sql`
- Applied `scripts/037_notifications_and_device_tokens.sql` to the active Supabase database
- Verified live notification endpoints after table creation:
  - `POST /notifications/register-device` -> `{"ok":true}`
  - `POST /notifications/test` -> in-app notification created successfully
- Started HTTPS ngrok tunnel for PWA/device testing on the web app
- Rebuilt the web app successfully with `node node_modules/vite/bin/vite.js build`

## Live Testing Status

Started locally against the web app.

- Backend is running locally against Supabase Postgres on `http://192.168.1.2:8788`
- Web is running locally on `http://192.168.1.2:3000`
- Mobile web app is running locally on `http://192.168.1.2:8081`
- Current mobile UI pass is active on the local Expo web app with SarvaSociety branding and updated resident/guard visual design
- Resident bottom-bar routes now exist as real mobile screens:
  - `/`
  - `/community`
  - `/homes`
  - `/services`
  - `/profile`
- Guard attendance now has a real UI flow for checkpoint selection and photo capture before clock-in, backed by new API fields and Supabase columns
- Guard walk-in registration now has apartment search, partner/company capture, required purpose in the UI, and visitor-photo capture/upload support
- Installable PWA metadata and Firebase web-push registration flow now exist on the `apps/web` app
- The web app now routes API calls through same-origin `/api` proxying during
  local/ngrok testing, which removes the prior HTTPS-to-HTTP mixed-content
  failure on Android PWA sessions
- Real outbound push still requires the Firebase Admin SDK service-account JSON file in the backend env path before FCM send calls can succeed
- Verified route-shell rendering for:
  - `/app`
  - `/admin`
  - `/resident`
  - `/guard`
- Verified real Supabase sign-in and role-specific app loading for seeded:
  - admin
  - resident
  - guard
- Current local validation no longer depends only on the dev fallback user; real Supabase accounts now exist for demo use
- PWA-style metadata is now wired, but install prompts on a phone over LAN are still browser-dependent and typically need HTTPS/production-style hosting for a reliable "install app" prompt
- Firebase push delivery still needs your real Firebase project credentials and real device-token registration from a native app/device to fully exercise push notifications end-to-end

## Commit References

None yet.

## PR Status

Not raised. Per repo policy, no PR will be opened automatically.

## Blockers Or Pending Items

- Major architecture redesign requires phased execution to avoid breaking existing frontend contracts.
- Supabase project structure, auth flow mapping, and tenant resolution strategy still need to be finalized before implementation.
- Local contract-test strategy should be expanded before replacing the current backend runtime.
- Production webhook signature verification remains to be finalized for the Supabase-era auth event source.
- The current SQL set now covers the shared foundation, visitor, notice, guard, guard-duty, ticket, vehicle, parking, finance, and house-help tables.
- Supabase access is already configured for the current local backend run, and seeded demo role-specific users plus demo operational data now exist.
- A final user walkthrough and any additional visual polish based on your review are still pending before this task can be called complete.
- Native-device push token capture still needs to be completed when you are ready to provide Firebase mobile configuration details.
- Notification tables are still optional in the current Supabase instance; core visitor and approval flows are now hardened so they keep working even before `app_notifications` and `user_device_tokens` are created.
- The active Supabase instance now has `app_notifications` and `user_device_tokens` created, so token registration and in-app notification persistence work locally.
- Real FCM delivery is still blocked only by the missing backend Firebase Admin SDK private-key JSON.
- Removed the remaining hardcoded public URLs from app code:
  - web Vite allowed-host list now comes from `VITE_ALLOWED_HOSTS`
  - mobile admin console launch URL now comes from `EXPO_PUBLIC_ADMIN_WEB_URL`
- Android sign-in rendering and profile loading were hardened by:
  - moving the web client to `VITE_API_URL=/api`
  - adding `VITE_API_PROXY_TARGET` for local FastAPI proxying
  - setting explicit sign-in input/button text colors and `color-scheme: light`
  - validating `GET /api/health` and `GET /api/auth/me` successfully over the
    current ngrok HTTPS URL with a real Supabase resident session
- The deployable `apps/web` app is now being used as the single HTTPS role
  entry surface for admin, resident, and guard:
  - sign-in now describes one URL for all roles
  - `/app` redirects directly into the correct role app after login
  - `/resident` now uses a phone-style MyGate-inspired layout with bottom-tab
    sections, notice popups, daily-help cards, in-route payments, and profile
    editing
  - `/guard` now uses a phone-style guard layout on the same URL
  - resident and guard now receive a modal notification-permission prompt
    instead of only a passive card
- Resident web app UI was tightened again for phone-sized rendering:
  - removed the oversized resident banner treatment
  - replaced scrolling shortcut pills with a compact 2x2 quick-action grid
  - moved daily help above notices
  - removed dues from the home dashboard and kept billing under services
  - reduced notice/card typography and card heights
  - moved the bottom navigation into a proper fixed dock with safe bottom padding
- Notification behavior was further hardened:
  - push-enabled state is persisted so the app does not keep visually
    re-registering notifications on every wake
  - stale/failed Firebase tokens are deactivated automatically after multicast
    failures
  - duplicate foreground/system notification creation was removed
  - admin notifications now support either a searched single resident target or
    a broadcast to all residents
- README now reflects the implemented FastAPI + Supabase + single-URL role-based
  architecture instead of the older Hono/Neon/Expo Push description

## Completion Status

In progress.
