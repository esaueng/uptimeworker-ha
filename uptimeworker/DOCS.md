# Uptime Worker Home Assistant app

## Install

Add this repository in Home Assistant:

```text
https://github.com/esaueng/uptimeworker/tree/docker
```

Then install **Uptime Worker** from the Apps store and start it.

## Web UI

The app exposes the Uptime Worker web UI on port `3001`.

```text
http://<home-assistant-host>:3001
```

The Home Assistant app page also opens this URL through its Web UI button.

## Data

Home Assistant mounts persistent app storage at `/data`. Uptime Worker stores
its SQLite database, uploads, screenshots, and runtime files there.

Back up the Home Assistant app data before uninstalling the app or replacing
the host storage.

## Notes

This app builds the container from the `docker` branch of this repository. The
Cloudflare Worker deployment remains available for Cloudflare-based installs,
but it is not required for this Home Assistant app.
