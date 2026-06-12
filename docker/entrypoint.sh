#!/bin/sh
set -e

mkdir -p "${DATA_DIR:-/data}"

if [ "$(id -u)" = "0" ]; then
    chown -R node:node "${DATA_DIR:-/data}"
    exec runuser -u node -- "$@"
fi

exec "$@"
