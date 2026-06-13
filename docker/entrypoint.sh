#!/bin/sh
set -e

data_dir="${DATA_DIR:-/data}"

mkdir -p "${data_dir}"

if [ "$(id -u)" = "0" ]; then
    node_uid="$(id -u node)"
    node_gid="$(id -g node)"
    current_owner="$(stat -c "%u:%g" "${data_dir}")"

    # Avoid walking large persisted data volumes on every restart.
    if [ "${current_owner}" != "${node_uid}:${node_gid}" ]; then
        chown -R node:node "${data_dir}"
    fi

    exec runuser -u node -- "$@"
fi

exec "$@"
