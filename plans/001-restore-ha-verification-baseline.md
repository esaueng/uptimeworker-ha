# Restore HA Verification Baseline

Audit stamp: `ec68182`

## Finding

The Home Assistant/container verification tests assert older project identity and image names, while the repository files now use the `uptimeworker-ha` fork identity. The targeted verification command fails before it can protect the packaging path.

Evidence:

- `repository.yaml:1` is `name: Uptime Worker HA`, while `test/backend-test/test-home-assistant-app-repository.js:17` expects `Uptime Worker Apps`.
- `repository.yaml:2` points at `https://github.com/esaueng/uptimeworker-ha`, while `test/backend-test/test-home-assistant-app-repository.js:18` expects the older `esaueng/uptimeworker/tree/docker` URL.
- `uptimeworker/config.yaml:1` is `name: Uptime Worker HA`, while `test/backend-test/test-home-assistant-app-repository.js:25` expects `Uptime Worker`.
- `compose.yaml:6` uses `image: uptimeworker-ha:local`, while `test/backend-test/test-single-container-docker.js:49` expects `uptimeworker:local`.
- `package.json:43-44` still use `uptimeworker:local` for `docker:build` and `docker:run`, while README and compose use `uptimeworker-ha:local`.

Confirmed failure:

```bash
node --test --test-reporter=spec test/backend-test/test-home-assistant-app-repository.js test/backend-test/test-single-container-docker.js
```

Expected current output before the fix: 7 tests run, 4 pass, 3 fail in the HA metadata/container assertions.

## Impact

Developers cannot trust the repo's own backend verification before changing packaging. Stale assertions also hide the intended canonical names and image tags, increasing the chance that docs, scripts, and add-on metadata drift further.

## Scope

In scope:

- `test/backend-test/test-home-assistant-app-repository.js`
- `test/backend-test/test-single-container-docker.js`
- `package.json` Docker scripts if the canonical image name remains `uptimeworker-ha:local`
- `README.md` and `docs/docker.md` only if they need minor consistency updates after script changes

Out of scope:

- Runtime server behavior
- Cloudflare Worker behavior
- Docker image restructuring
- Home Assistant add-on versioning beyond existing `1.0.0`

## Implementation Steps

1. Treat the current repo identity as canonical unless the maintainer explicitly says otherwise: `uptimeworker-ha`, `Uptime Worker HA`, and `https://github.com/esaueng/uptimeworker-ha`.
2. Update `test/backend-test/test-home-assistant-app-repository.js` assertions to match `repository.yaml` and `uptimeworker/config.yaml`.
3. Update `test/backend-test/test-single-container-docker.js` to expect `image: uptimeworker-ha:local`.
4. Update `package.json` scripts `docker:build` and `docker:run` to use `uptimeworker-ha:local`, matching `compose.yaml:6`, README, and `docs/docker.md`.
5. If any docs still mention `uptimeworker:local` after the script update, align those docs with the same canonical image tag.

## Test Plan

Run the targeted package tests:

```bash
node --test --test-reporter=spec test/backend-test/test-home-assistant-app-repository.js test/backend-test/test-single-container-docker.js
```

Expected result after the fix: all 7 tests pass.

Run a broader non-container backend subset if available after Plan 004, or run:

```bash
npm run test-backend
```

Expected result depends on local container runtime availability. If Docker/Testcontainers is unavailable, record that as an environment limitation, not a failure of this plan.

## Done Criteria

- Targeted HA/container metadata command passes.
- `package.json`, README, docs, `compose.yaml`, `repository.yaml`, and `uptimeworker/config.yaml` agree on the fork identity and local image tag.
- No source runtime files are changed.

## Review Notes

These tests are intentionally string-based packaging guards. Keep assertions direct and readable rather than abstracting them heavily.

## Stop Conditions

- STOP if the maintainer says the canonical Home Assistant store display name should be `Uptime Worker` instead of `Uptime Worker HA`; update metadata and docs first, then adjust tests to that decision.
- STOP if changing `package.json` scripts would break a published automation that expects `uptimeworker:local`; document the compatibility requirement and add an alias script instead of replacing it.
