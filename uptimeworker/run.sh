#!/bin/sh
set -e

export DATA_DIR="${DATA_DIR:-/data}"
export UPTIME_KUMA_DB_TYPE="${UPTIME_KUMA_DB_TYPE:-sqlite}"
export UPTIME_KUMA_IS_CONTAINER="${UPTIME_KUMA_IS_CONTAINER:-1}"
export UPTIME_KUMA_PORT="${UPTIME_KUMA_PORT:-3001}"

exec /app/docker/entrypoint.sh node /app/server/server.js
