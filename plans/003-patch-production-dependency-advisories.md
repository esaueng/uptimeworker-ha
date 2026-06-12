# Patch Production Dependency Advisories

Audit stamp: `ec68182`

## Finding

Production dependencies installed into the runtime image currently trigger `npm audit --omit=dev` advisories, including critical and high severity items in packages used by active runtime paths.

Evidence:

- `package.json:75` pins `@grpc/grpc-js` to `~1.8.22`; `server/monitor-types/grpc.js:4` imports it for gRPC monitors.
- `package.json:80` pins `axios` to `~0.31.0`; `server/model/monitor.js:2` imports it for monitor checks and many notification providers import it.
- `package.json:95` pins `express` to `~4.22.1`; the Node server uses Express.
- `package.json:117` pins `liquidjs` to `~10.25.0`; `server/notification-providers/notification-provider.js:1` imports it and `renderTemplate()` parses user-controlled notification templates.
- `package.json:140` pins `protobufjs` to `~7.5.7`; `server/monitor-types/grpc.js:5` imports it.
- `package.json:141` pins `qs` to `~6.14.2`; `server/notification-providers/aliyun-sms.js:5` imports it.
- `npm audit --omit=dev --json` reported 8 production advisories: 1 critical, 2 high, and 5 moderate.

`npm_config_cache=/private/tmp/uptimeworker-npm-cache npm outdated --omit=dev --json` showed newer versions are available, including LiquidJS `10.27.0`, Axios `1.17.0`, gRPC `1.14.4`, protobufjs `7.5.9` wanted / `8.6.3` latest, qs `6.15.2`, and Express `4.22.2` wanted / `5.2.1` latest.

## Impact

The production Docker image inherits known vulnerable packages. LiquidJS and Axios are particularly sensitive because this app renders user-configured templates and performs user-configured network requests.

## Scope

In scope:

- `package.json`
- `package-lock.json`
- Minimal compatibility changes required by dependency updates
- Regression tests for notification templating, HTTP monitor requests, gRPC monitors, and affected notification providers

Out of scope:

- Broad framework migrations such as Express 5 unless Express 4 cannot be patched
- Cosmetic dependency modernization unrelated to advisories
- Dev-only dependency upgrades unless needed to keep tests running

## Implementation Steps

1. Run `npm audit --omit=dev` and save the advisory list in the PR/commit notes. Do not paste exploit details or unnecessary advisory prose into code comments.
2. Update the smallest viable set of production dependencies:
   - `liquidjs` to a patched 10.x version.
   - `@grpc/grpc-js` to at least `1.9.16`, preferably current 1.x if tests pass.
   - `protobufjs` to a patched 7.x version first; only move to 8.x if needed and compatible.
   - `qs` to a patched version and let Express/body-parser dedupe if possible.
   - `express` to the patched 4.x wanted version unless audit still requires more.
3. Treat Axios separately because `0.x` to `1.x` is a major behavioral jump:
   - First try updating Axios to the lowest version that clears advisories.
   - Run focused monitor/notification tests.
   - If adapter/proxy behavior breaks, add a small compatibility wrapper in the existing Axios utility/provider pattern rather than changing every provider ad hoc.
4. Run `npm install` with explicit package versions so `package-lock.json` is updated deterministically.
5. Add or adjust focused tests only where an update changes behavior. Do not update snapshots by rote.

## Test Plan

Run dependency checks:

```bash
npm audit --omit=dev
npm ls liquidjs axios @grpc/grpc-js protobufjs qs express --omit=dev
```

Run focused runtime tests:

```bash
node --test --test-reporter=spec test/backend-test/notification-providers/*.js
node --test --test-reporter=spec test/backend-test/monitors/test-grpc.js
node --test --test-reporter=spec test/backend-test/monitors/test-websocket.js
node --test --test-reporter=spec test/backend-test/test-util-server.js
```

Run broader gates after Plan 001:

```bash
npm run build
npm run lint:prod
npm run test-backend
```

If local Docker/Testcontainers is unavailable, record that limitation and run the non-container subset introduced by Plan 004.

## Done Criteria

- `npm audit --omit=dev` reports no critical or high production vulnerabilities.
- Any remaining moderate advisories are explicitly justified with exploitability notes and upstream constraints.
- `package.json` and `package-lock.json` agree.
- Focused notification, gRPC, and HTTP-related tests pass.
- The Docker runtime still builds with production dependencies.

## Review Notes

Preserve existing Uptime Kuma-derived patterns. Avoid sweeping provider refactors while upgrading Axios; the goal is to clear advisories with the least behavior change.

## Stop Conditions

- STOP if Axios 1.x changes proxy, redirect, cookie, or NTLM behavior in a way that focused tests cannot cover quickly. Report the compatibility gap and propose a separate Axios migration plan.
- STOP if a patched LiquidJS version changes template syntax used by existing notification tests. Capture the breakage with a focused test before deciding whether to pin, shim, or migrate templates.
