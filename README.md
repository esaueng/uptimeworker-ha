# Uptime Worker HA

Uptime Worker HA is the Home Assistant container fork of
`esaueng/uptimeworker`. It is based on that repository's `docker` branch and is
intended to run the retained Node.js monitoring server as a local Docker
container or Home Assistant add-on.

The container serves the web UI on port `3001` and stores its SQLite database,
uploads, screenshots, and runtime files in `/data`.

## Install In Home Assistant

Add this repository to Home Assistant:

```text
https://github.com/esaueng/uptimeworker-ha
```

Then install **Uptime Worker HA** from the add-on store and start it. Open the
web UI from the add-on page or browse to:

```text
http://<home-assistant-host>:3001
```

Create the first admin user from the setup screen after the app starts.

## Run With Docker

Build the image locally:

```bash
docker build -t uptimeworker-ha:local .
```

Run it with persistent data:

```bash
docker run -d \
  --name uptimeworker-ha \
  --restart unless-stopped \
  -p 3001:3001 \
  -v "$PWD/data:/data" \
  uptimeworker-ha:local
```

The checked-in `compose.yaml` provides the same local container path:

```bash
docker compose up -d --build
```

## Runtime Defaults

| Setting | Value |
| --- | --- |
| `DATA_DIR` | `/data` |
| `UPTIME_KUMA_DB_TYPE` | `sqlite` |
| `UPTIME_KUMA_IS_CONTAINER` | `1` |
| `UPTIME_KUMA_PORT` | `3001` |

Keep `/data` on persistent storage. Removing that volume removes monitors,
users, status pages, and history.

## Repository Layout

```text
uptimeworker/       Home Assistant add-on package
Dockerfile          Standalone Docker image for local builds
compose.yaml        Local Docker Compose deployment
docs/docker.md      Container deployment details
server/             Retained Node.js monitoring server
src/                Vue dashboard and status page UI
db/                 SQLite migration files
```

## Relationship To The Source Fork

This repository is a fork of `esaueng/uptimeworker`, using its `docker` branch
as the Home Assistant and Docker container distribution branch. The Cloudflare
Worker files from the source project remain in the tree, but this repository's
primary deployment target is the local Home Assistant container path.

Uptime Worker retains MIT-licensed code from Uptime Kuma. See `LICENSE` for the
full license text and attribution. Uptime Worker HA project changes are
maintained by Esau Engineering.
