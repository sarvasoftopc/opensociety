# Recommended Architecture: FastAPI + Supabase Multi-Tenant Migration

## Problem

The current platform is intentionally single-tenant. Each society gets its own backend deployment and its own database. That creates growing operational overhead, duplicated infrastructure, more environments to maintain, and a slower onboarding path as the number of societies increases.

At the same time, the existing web and mobile applications already depend on the current API contract. A backend rewrite must not break route paths, request bodies, response shapes, auth expectations, or user-facing workflows.

## Current Limitation

- Backend runtime is `Hono` on Cloudflare Workers.
- Database access uses Drizzle on a per-society Neon Postgres database.
- Authentication is handled by Clerk with a local mirrored `users` table.
- Tenancy is single-tenant by design:
  - `society_config` is treated as a one-row singleton.
  - Domain tables do not carry `society_id`.
  - Every deployment assumes exactly one society context.

This architecture does not scale well to a SaaS model serving 50 to 500 societies from one platform.

## Recommended Change

Adopt a shared multi-tenant backend and database with contract-preserving API compatibility:

1. Runtime and service layer
   - Replace the current Hono worker backend with a Python `FastAPI` service.
   - Keep the public route paths and HTTP semantics aligned with the current frontend contract.
   - Organize the new backend into routers, services, repositories, schemas, and auth dependencies to keep business logic isolated from transport concerns.

2. Authentication
   - Move from Clerk auth to Supabase Auth.
   - Preserve the current backend authorization behavior:
     - authenticated user resolution
     - local app roles and approval status
     - guard/admin/resident role checks
   - Introduce a user identity mapping layer so frontend behavior can remain stable while the backend changes underneath.

3. Multi-tenancy
   - Introduce `society_id` on all tenant-scoped tables.
   - Replace the singleton `society_config` assumption with tenant-owned society records.
   - Resolve tenant context per request using a stable strategy such as subdomain, host header, or explicit tenant header for local development and internal tooling.
   - Enforce tenant isolation in application queries and, where practical, database-level row-level security or scoped access policies.

4. Shared contract safety
   - Keep current endpoint URLs unchanged for the web app.
   - Preserve request/response payloads by generating a contract inventory from the existing TypeScript routes and `@opensociety/shared` package.
   - Add backend contract tests so the new FastAPI handlers are validated against the current API shapes and status codes.

5. Migration strategy
   - Use an incremental cutover rather than a one-step rewrite.
   - Port the database schema and auth foundation first.
   - Port route groups in phases.
   - Validate each route group with the existing web app locally before broadening scope.

## Files/Modules Affected

Expected new or heavily changed areas:

- `apps/api/*` or a new Python backend app directory
- `packages/shared/*` or an equivalent generated contract bridge
- `packages/db/*` and migrations
- Web frontend API client configuration where runtime base URLs are injected
- Local/dev environment docs and deployment configuration

## Migration Impact

High.

- Runtime changes from TypeScript Workers to Python ASGI.
- Auth provider changes from Clerk to Supabase.
- Data model changes from single-tenant tables to tenant-scoped tables.
- Deployment model changes from per-society infrastructure to one shared platform.

To avoid breaking users, the migration should be delivered in phases:

### Phase 0: Contract inventory and test harness

- Inventory every route, request schema, response schema, auth requirement, and error shape from the current API.
- Add local regression checks that exercise the current web app against expected backend behavior.

### Phase 1: FastAPI skeleton with compatibility surface

- Create the FastAPI app with mirrored routes, health endpoints, middleware, auth dependencies, and error handling.
- Add a compatibility layer for current frontend auth headers and response conventions during transition.

### Phase 2: Multi-tenant schema foundation

- Design tenant tables and `society_id` rollout.
- Add tenant-aware user, apartment, visitor, notice, billing, and guard models.
- Create data migration scripts from the old single-tenant layout into the shared schema.

### Phase 3: Supabase Auth integration

- Map Supabase user identities into the local domain user model.
- Preserve role/status checks currently enforced after Clerk identity resolution.
- Provide a migration path for existing users and approval state.

### Phase 4: Route-group porting

- Port domain groups one by one:
  - society
  - apartments
  - users
  - guards
  - visitors and pre-approvals
  - notices
  - tickets
  - house-help
  - vehicles and parking
  - bills, payments, reports, uploads, webhooks

### Phase 5: Local end-to-end validation

- Run the FastAPI backend locally.
- Point the unchanged web app at the new local backend.
- Exercise critical workflows end to end before any deployment:
  - sign-in/session resolution
  - society config views
  - apartment management
  - resident approval
  - visitor approvals/check-in/check-out
  - notice creation/listing
  - ticket flows
  - guard actions
  - billing/reporting flows

## Testing Impact

Required:

- Contract tests for every public API route.
- Unit tests for auth resolution, tenant resolution, and service-layer behavior.
- Migration tests for tenant data isolation and data movement.
- Webapp-driven local functional checks against the new backend.

Recommended:

- Golden response fixtures for critical endpoints.
- Seeded local demo data for multiple societies to verify isolation.

## Risks

- Breaking API contracts during the runtime rewrite.
- Losing behavior parity around auth, approval state, or role checks.
- Missing a table during `society_id` rollout, causing cross-tenant leakage.
- Differences between Clerk session behavior and Supabase token/session behavior.
- Frontend assumptions about IDs, error strings, or nullable fields surfacing late in testing.

## Alternative Options

1. Keep the current single-tenant architecture.
   - Lowest short-term cost, highest long-term operational overhead.

2. Keep Hono/TypeScript but move to multi-tenant first.
   - Lower runtime change risk, but does not achieve the requested Python/FastAPI target.

3. Port to FastAPI first while remaining single-tenant, then add multi-tenancy later.
   - Safer technically than doing both at once, but increases total migration time.

## Recommendation

The safest long-term path is:

1. Approve the multi-tenant FastAPI + Supabase target architecture.
2. Implement the migration in phases with contract tests first.
3. Keep the web frontend unchanged and validate it locally against the new backend before any deployment.

This preserves delivery safety while still moving the platform toward a scalable SaaS architecture.
