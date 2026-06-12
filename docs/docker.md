# Single-container Docker deployment

This Docker path runs Uptime Worker as one self-hosted Node.js container. It is
intended for Home Assistant hosts or any other machine where you want a local
container instead of the Cloudflare Worker, D1, R2, Queue, and Container stack.

The container uses the retained Node server, serves the built Vue app, stores
SQLite data under `/data`, and listens on port `3001`.

## Build

```bash
docker build -t uptimeworker:local .
```

## Run

Create or choose a persistent host directory first. On a Home Assistant host,
use a path that is included in your normal backups.

```bash
mkdir -p ./data

docker run -d \
  --name uptimeworker \
  --restart unless-stopped \
  -p 3001:3001 \
  -v "$PWD/data:/data" \
  uptimeworker:local
```

Then open:

```text
http://<home-assistant-host>:3001
```

## Compose

The checked-in `compose.yaml` builds the local image and stores data in
`./data`:

```bash
docker compose up -d --build
```

## Runtime settings

The image defaults to:

| Setting | Value |
| --- | --- |
| `DATA_DIR` | `/data` |
| `UPTIME_KUMA_DB_TYPE` | `sqlite` |
| `UPTIME_KUMA_PORT` | `3001` |

The app database, uploads, screenshots, and Docker TLS files live in `/data`.
Back up that volume before replacing the container image.

## Notes for Home Assistant boxes

- This is a normal Docker container, not a Home Assistant add-on package.
- Map `3001:3001` or choose another host port if `3001` is already used.
- Keep `/data` on persistent storage. Removing that volume removes monitors,
  users, status pages, and history.
- The Cloudflare Worker deployment remains available through `wrangler.jsonc`;
  this container path does not require Cloudflare services at runtime.
