# Advisory Plans

Audit stamp: `ec68182`

This advisory run used the default `standard` effort. Because this was a non-interactive request, the default selection is the top four vetted findings by leverage. Source code was not changed; these files are implementation handoffs for another executor.

## Recommended Order

| Order | Plan | Status | Depends On | Why first |
| --- | --- | --- | --- | --- |
| 1 | [001-restore-ha-verification-baseline.md](./001-restore-ha-verification-baseline.md) | TODO | None | The advertised backend verification command currently fails on stale Home Assistant/container assertions. Fix this before using test results to judge riskier changes. |
| 2 | [002-redact-worker-sidecar-secrets.md](./002-redact-worker-sidecar-secrets.md) | TODO | Plan 001 preferred | Read-only Worker roles can receive proxy passwords and tokenized URLs from sidecar APIs. This is the highest-impact security fix. |
| 3 | [003-patch-production-dependency-advisories.md](./003-patch-production-dependency-advisories.md) | TODO | Plan 001 preferred | `npm audit --omit=dev` reports critical/high production advisories in dependencies used by notification, monitor, and gRPC paths. |
| 4 | [004-align-ci-with-ha-docker-branch.md](./004-align-ci-with-ha-docker-branch.md) | TODO | Plans 001 and 003 | CI is still largely scoped to upstream branches and does not protect the active `docker` distribution branch or HA image path well. |

## Findings

| # | Finding | Category | Impact | Effort | Risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HA/container verification drift makes backend tests fail before real regressions are evaluated. | Correctness / Tests / DX | Broken local gate; stale tests assert old names, URLs, and image tags while repo files use the `uptimeworker-ha` fork identity. | S | Low | `test/backend-test/test-home-assistant-app-repository.js:17`, `test/backend-test/test-home-assistant-app-repository.js:25`, `test/backend-test/test-single-container-docker.js:49`, `repository.yaml:1`, `uptimeworker/config.yaml:1`, `compose.yaml:6`, `package.json:43` |
| 2 | Worker sidecar read APIs return sensitive connection material to roles with read-only permissions. | Security | Viewer/operator roles have read permissions for proxies, Docker hosts, and remote browsers; current serializers return proxy passwords and full URLs that may contain credentials or tokens. | M | Medium | `cloudflare/worker/api.mjs:391`, `cloudflare/worker/api.mjs:397`, `cloudflare/worker/api.mjs:990`, `cloudflare/worker/api.mjs:1114`, `cloudflare/worker/api.mjs:1123`, `cloudflare/worker/api.mjs:1301` |
| 3 | Production dependency advisories remain in the runtime image. | Security / Dependencies | `npm audit --omit=dev` reports 8 production advisories, including critical LiquidJS and high Axios/gRPC findings in code paths this app uses. | M | Medium | `package.json:75`, `package.json:80`, `package.json:95`, `package.json:117`, `package.json:140`, `package.json:141`, `server/notification-providers/notification-provider.js:1`, `server/monitor-types/grpc.js:4` |
| 4 | CI still targets upstream branch names and lacks HA Docker branch/image coverage. | CI / Release | Pushes to `docker` can miss main validation, CodeQL, and HA image smoke coverage, even though README says this fork distributes from the `docker` branch. | M | Low-Medium | `.github/workflows/auto-test.yml:7`, `.github/workflows/validate.yml:4`, `.github/workflows/codeql-analysis.yml:3`, `uptimeworker/Dockerfile:1`, `Dockerfile:1` |

## Considered And Rejected

- `settings` route permission bypass: rejected. Although `ROUTE_PERMISSIONS` maps `settings` to `settings.read`, `resolveRoutePermission(route, method)` upgrades `PUT /api/settings` to `settings.write`.
- Add-on Dockerfile remote clone as a standalone finding: not planned separately. Tests explicitly document that Home Assistant builds the add-on folder as Docker context, so the remote clone is an intentional workaround. Plan 004 still asks for a smoke build to keep that path honest.
- Full backend suite failure from Testcontainers: treated as part of Plan 004 test segmentation rather than as a product bug. The failures are environment/tooling failures when no container runtime is available.

## Verification Commands Found During Recon

- `npm run build`
- `npm run lint:prod`
- `npm run tsc`
- `npm run test-backend`
- `npm run test-e2e`
- Targeted HA check: `node --test --test-reporter=spec test/backend-test/test-home-assistant-app-repository.js test/backend-test/test-single-container-docker.js`
- Dependency audit: `npm audit --omit=dev`

## Audit Notes

- `node --test --test-reporter=spec test/backend-test/test-home-assistant-app-repository.js test/backend-test/test-single-container-docker.js` failed with 3 assertion failures in HA metadata/container drift.
- `npm run test-backend` also failed in local verification because several Testcontainers suites could not find a working container runtime.
- `npm audit --omit=dev --json` failed with vulnerability findings, not with a tool error.
- Initial `npm outdated --omit=dev --json` failed because the user npm cache contains root-owned files; rerunning with `npm_config_cache=/private/tmp/uptimeworker-npm-cache` succeeded.
