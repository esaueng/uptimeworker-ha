# Align CI With HA Docker Branch

Audit stamp: `ec68182`

## Finding

CI is still shaped around upstream branch names and does not fully protect this fork's active `docker` distribution path.

Evidence:

- README says this repository is based on the source `docker` branch and the Home Assistant container path is primary.
- `.github/workflows/auto-test.yml:7-10` only runs push tests for `master`, `1.23.X`, and `3.0.0`.
- `.github/workflows/validate.yml:4-9` only runs push validation for `master` and pull requests into `master` / `1.23.X`.
- `.github/workflows/codeql-analysis.yml:3-6` only runs CodeQL for `master` and `1.23.X`.
- `Dockerfile:1` and `uptimeworker/Dockerfile:1` define the two image paths this fork relies on, but no fork-specific CI job smoke-builds both on `docker`.
- `package.json:31-33` has only all-in backend test scripts; local `npm run test-backend` fails when no container runtime is available.

## Impact

Changes can land on the active distribution branch without the same validation expected by the repo. Local and CI test signals are also noisy because container-dependent suites are mixed into the default backend command without a clear fallback when Docker/Testcontainers is unavailable.

## Scope

In scope:

- `.github/workflows/auto-test.yml`
- `.github/workflows/validate.yml`
- `.github/workflows/codeql-analysis.yml`
- A new HA Docker smoke workflow if cleaner than extending existing workflows
- `package.json` test scripts
- Test helper changes needed to skip or separate Testcontainers suites cleanly

Out of scope:

- Publishing Docker images
- Release automation for upstream `louislam/uptime-kuma`
- Removing upstream workflows that are intentionally retained but inactive

## Implementation Steps

1. Update workflow branch triggers to include `docker` for push and pull request validation where appropriate:
   - `auto-test.yml`
   - `validate.yml`
   - `codeql-analysis.yml`
2. Add a fork-specific smoke job that builds both image paths without pushing:
   - Root image: `docker build -t uptimeworker-ha:ci .`
   - Add-on image: `docker build -f uptimeworker/Dockerfile -t uptimeworker-ha-addon:ci uptimeworker`
   - Pass `UPTIMEWORKER_REPOSITORY` and `UPTIMEWORKER_REF` build args when needed so CI tests the intended branch/ref.
3. Split backend tests into clear scripts:
   - A fast unit/static backend suite that excludes Testcontainers-dependent monitor/database files.
   - A container integration suite that requires Docker/Testcontainers.
   - Keep `npm run test-backend` as the full suite if CI has Docker, but document and expose the unit subset for local checks.
4. Add a small Testcontainers availability helper or environment guard for suites that currently fail with `Could not find a working container runtime strategy` or `Cannot read properties of undefined (reading 'split')` when the runtime is absent.
5. Update `test/backend-test/README.md` with the new command split and the expected Docker requirement for integration tests.

## Test Plan

Run local command checks:

```bash
npm run test-backend:unit
npm run test-backend:containers
```

Expected local result:

- `test-backend:unit` passes without Docker.
- `test-backend:containers` either passes with Docker/Testcontainers available or exits/skips with a clear message when unavailable.

Run build checks:

```bash
npm run build
docker build -t uptimeworker-ha:ci .
docker build -f uptimeworker/Dockerfile -t uptimeworker-ha-addon:ci uptimeworker
```

Run workflow syntax checks if available:

```bash
npm run lint:prod
```

## Done Criteria

- Pushes to the active `docker` branch run validation.
- Pull requests targeting `docker` run validation.
- The HA add-on Dockerfile and root Dockerfile are smoke-built in CI without pushing images.
- Developers have a documented backend unit command that does not require Docker.
- Container-dependent tests have an explicit Docker requirement and no longer produce misleading TypeErrors when Docker is unavailable.

## Review Notes

Keep upstream workflow conditions that deliberately prevent publishing from forks. The goal is validation for this fork, not re-enabling upstream release jobs.

## Stop Conditions

- STOP if GitHub Actions minutes or architecture constraints make full Docker builds too expensive. Replace full image builds with `docker build --target build` or a scheduled/manual smoke workflow and document the tradeoff.
- STOP if Home Assistant add-on builds cannot use the local checkout as context; preserve the existing remote clone workaround and make the build args explicit instead of forcing a context change.
