# Docker And Home Assistant Deployment

This Docker path runs Uptime Worker HA as one self-hosted Node.js container. It
is intended for Home Assistant hosts or any other machine where you want a local
container instead of the Cloudflare Worker stack.

The container serves the built Vue app, stores SQLite data under `/data`, and
listens on port `3001`.

## Home Assistant Add-on Repository

Add this repository URL in Home Assistant:

```text
https://github.com/esaueng/uptimeworker-ha
```

Home Assistant will find the `uptimeworker/` add-on folder and build the image
from this repository's `main` branch. The add-on exposes port `3001` and
stores persistent data in Home Assistant's add-on `/data` volume.

## Build

```bash
docker build -t uptimeworker-ha:local .
```

## Run

Create or choose a persistent host directory first. On a Home Assistant host,
use a path that is included in your normal backups.

```bash
mkdir -p ./data

docker run -d \
  --name uptimeworker-ha \
  --restart unless-stopped \
  -p 3001:3001 \
  -v "$PWD/data:/data" \
  uptimeworker-ha:local
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

## Runtime Settings

The image defaults to:

| Setting | Value |
| --- | --- |
| `DATA_DIR` | `/data` |
| `UPTIME_KUMA_DB_TYPE` | `sqlite` |
| `UPTIME_KUMA_IS_CONTAINER` | `1` |
| `UPTIME_KUMA_PORT` | `3001` |

The app database, uploads, screenshots, and Docker TLS files live in `/data`.
Back up that volume before replacing the container image.

## Notes For Home Assistant Boxes

- The `uptimeworker/` folder provides the Home Assistant add-on package.
- The root `Dockerfile` and `compose.yaml` remain available for normal Docker
  hosts.
- Map `3001:3001` or choose another host port if `3001` is already used.
- Keep `/data` on persistent storage. Removing that volume removes monitors,
  users, status pages, and history.
- The retained Cloudflare Worker deployment files are not required for this
  local container path.
