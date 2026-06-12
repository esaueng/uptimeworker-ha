# Uptime Worker HA Add-on

## Install

Add this repository in Home Assistant:

```text
https://github.com/esaueng/uptimeworker-ha
```

Then install **Uptime Worker HA** from the add-on store and start it.

## Web UI

The add-on exposes the Uptime Worker web UI on port `3001`.

```text
http://<home-assistant-host>:3001
```

The Home Assistant add-on page also opens this URL through its Web UI button.

## Data

Home Assistant mounts persistent add-on storage at `/data`. Uptime Worker HA
stores its SQLite database, uploads, screenshots, and runtime files there.

Back up the Home Assistant add-on data before uninstalling the add-on or
replacing the host storage.

## Notes

This add-on builds the container from the `main` branch of this repository.
The retained Cloudflare Worker deployment remains available for
Cloudflare-based installs, but it is not required for this Home Assistant
container path.
