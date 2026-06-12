# Redact Worker Sidecar Secrets

Audit stamp: `ec68182`

## Finding

The Cloudflare Worker sidecar resource APIs return sensitive connection material through read endpoints, and read permissions are granted to non-admin roles.

Evidence:

- `cloudflare/worker/api.mjs:391-402` grants the `viewer` role `proxies.read`, `docker-hosts.read`, and `remote-browsers.read`.
- `cloudflare/worker/api.mjs:665-666` returns `listProxies(env)` for the `proxies` route.
- `cloudflare/worker/api.mjs:1123-1130` selects `password` from the proxy table for list responses.
- `cloudflare/worker/api.mjs:1292-1304` serializes `password: row.password ?? null`.
- `cloudflare/worker/api.mjs:990-997` serializes Docker daemon URLs without redaction.
- `cloudflare/worker/api.mjs:1114-1120` serializes remote browser URLs without redaction.
- `src/mixins/socket.js:452-469` hydrates the sidecar lists into the frontend cache.

## Impact

A read-only Worker user can receive proxy credentials. The same pattern can expose tokenized remote browser URLs or Docker daemon URLs containing URL credentials. This weakens the RBAC boundary: read roles should inspect configuration shape, not recover reusable secrets.

## Scope

In scope:

- `cloudflare/worker/api.mjs`
- `src/mixins/socket.js`
- `src/components/ProxyDialog.vue`
- `src/components/DockerHostDialog.vue`
- The remote browser dialog if it exists or is added later in the same pattern
- `test/backend-test/cloudflare/test-worker-api.mjs`

Out of scope:

- Encrypting stored credentials at rest
- Changing monitor runner payloads that need credentials to execute checks
- Removing read access to sidecar resources entirely unless redaction cannot preserve the UI
- Redacting notification secrets, which already have a separate redaction path

## Implementation Steps

1. In `cloudflare/worker/api.mjs`, split internal serializers from response serializers.
   - Keep an internal proxy serializer for runner execution so `serializeRunnerProxy()` can still include the stored password.
   - Add response serializers for proxies, Docker hosts, and remote browsers that remove or mask secret fields.
2. For proxy list responses, never return the stored password. Return either `password: null` plus metadata such as `hasPassword: true`, or omit `password` and add a `__secretFields` entry. Match the existing notification redaction style if practical.
3. For proxy updates, preserve the existing stored password when an authenticated proxy update submits an empty, missing, or redacted password placeholder. Continue to clear username/password when `auth` is false.
4. For remote browser and Docker daemon URLs, redact URL credentials and query parameters whose keys look sensitive, such as token, secret, key, password, auth, credential, or access_token. Do not redact host, protocol, or port.
5. Preserve edit ergonomics:
   - Edit dialogs should show an empty or placeholder password field for existing secrets.
   - Saving an unchanged redacted value should not overwrite the stored secret.
   - Cloning a proxy should not silently clone a secret the user cannot see; require re-entry for the cloned credential.
6. Add tests in `test/backend-test/cloudflare/test-worker-api.mjs`:
   - A viewer with `proxies.read` can list proxies but cannot see the stored password.
   - Admin list responses also redact the stored password unless a deliberate write-only endpoint is introduced.
   - `check-now` still sends the stored active proxy password to the runner payload.
   - Remote browser and Docker host list responses redact credentials in URLs.
   - Updating a proxy with a redacted placeholder preserves the stored password; setting `auth: false` clears it.

## Test Plan

Run the focused Worker API tests:

```bash
node --test --test-reporter=spec test/backend-test/cloudflare/test-worker-api.mjs
```

Run frontend lint for edited Vue/socket files:

```bash
npm run lint:js -- src/mixins/socket.js src/components/ProxyDialog.vue src/components/DockerHostDialog.vue
```

Run the build to catch template/type regressions:

```bash
npm run build
```

## Done Criteria

- No read endpoint returns a raw stored proxy password.
- No read endpoint returns URL username/password or sensitive query parameter values for Docker hosts or remote browsers.
- Runner execution still receives stored credentials needed to perform checks.
- Existing notification redaction behavior remains unchanged.
- Focused Worker API tests pass.

## Review Notes

Do not log redacted or unredacted secret values in test output. Tests may use obvious fake values, but assertions should focus on presence or absence rather than printing the value.

## Stop Conditions

- STOP if the frontend cannot preserve existing proxy secrets without adding a new API contract; report the needed contract explicitly.
- STOP if any existing consumer depends on reading raw proxy passwords through `/api/proxies`; that consumer must be redesigned rather than keeping the leak.
