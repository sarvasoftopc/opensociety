# TASK-002: Secret cleanup and Netlify/Render deployment setup

## Task ID

`TASK-002`

## Task Title

Secret cleanup and Netlify/Render deployment setup

## Objective

Remove tracked env example files and embedded sensitive values from the merged repository state, then add deployable Netlify and Render configuration so the web app and FastAPI backend can be hosted with platform-managed environment variables instead of repo-stored env files.

## Scope

- Verify the merged state on `main` and isolate the cleanup in a fresh branch.
- Remove tracked `.env` example files from the repo without changing the intended Firebase mobile client files.
- Harden ignore rules so env files remain local-only.
- Add Netlify configuration for the web app.
- Add Render configuration for the FastAPI backend.
- Update the README with deployment and environment-variable instructions.

## Branch Name

`fix/TASK-002-deployment-secret-cleanup`

## Sub-tasks

1. Verify merged `main` still contains tracked env examples and sensitive values.
2. Remove tracked env example files and update ignore rules.
3. Add Netlify deployment configuration for `apps/web`.
4. Add Render deployment configuration for `apps/api-fastapi`.
5. Update task docs and README.
6. Validate repo state and config files.

## Files Planned For Inspection

- `ai/TASK_INDEX.md`
- `ai/TASK.md`
- `ai/chat/INDEX.md`
- `README.md`
- `.gitignore`
- `apps/api-fastapi/.env.example`
- `apps/api-fastapi/app/core/config.py`
- `apps/web/vite.config.ts`
- `apps/web/package.json`
- `package.json`

## Files Inspected

- `ai/TASK.md`
- `ai/TASK_INDEX.md`
- `ai/chat/INDEX.md`
- `ai/chat/TASK-001-backend-port-multitenant-migration.md`
- `README.md`
- `.gitignore`
- `apps/api-fastapi/.env.example`
- `apps/api-fastapi/app/core/config.py`
- `apps/web/vite.config.ts`
- `apps/web/package.json`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/supabase.ts`
- `package.json`

## Files Modified

- `ai/TASK.md`
- `ai/TASK_INDEX.md`
- `ai/chat/INDEX.md`
- `ai/chat/TASK-002-secret-cleanup-and-deployment.md`
- `.gitignore`
- `.env.example`
- `apps/api-fastapi/.env.example`
- `apps/mobile/.env.example`
- `apps/web/.env.example`
- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `netlify.toml`
- `render.yaml`
- `README.md`

## Implementation Notes

- Merged `main` still tracked four env example files, and `apps/api-fastapi/.env.example` still contained live Supabase values.
- The mobile Firebase client files are intentionally kept in the repo because the Expo native builds reference them directly.
- The web app reads Firebase and Supabase public values from Vite env vars at build time.
- The FastAPI backend reads Supabase and Firebase admin credentials from runtime env vars.
- Deployment config should therefore live in Netlify/Render settings and not in committed env files.

## Validation Performed

- Verified merged `main` in a fresh worktree branch.
- Confirmed tracked env files exist in `HEAD`.
- Confirmed live Supabase values exist in `apps/api-fastapi/.env.example`.
- Ran `pnpm install --ignore-scripts` to refresh the lockfile after adding the Netlify plugin.
- Ran `pnpm --filter @opensociety/shared build && pnpm --filter @opensociety/web build` successfully.
- Verified no `.env` files remain tracked in the staged index.
- Verified the staged index no longer contains the previously exposed Supabase values.

## Live Testing Status

- Local production web build validated.
- Full backend runtime validation not re-run in this worktree because this task did not change backend application code.

## Commit References

- Pending

## PR Status

- New PR required after this branch is pushed.

## Blockers Or Pending Items

- Backend pytest was not re-run in this worktree because the local FastAPI venv is not present here.
- Supabase service-role key rotation is still required outside the repo because the earlier merged commit exposed it before this cleanup task.

## Completion Status

- In progress
