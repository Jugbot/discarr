#!/bin/sh
set -euo pipefail

setup() {
    RC=-1
    trap 'teardown' EXIT

    if [ ! -w "$DATA_DIR" ]; then
        echo "Error: User $(id -u) does not have write access to volume $DATA_DIR"
        exit 1
    fi
}
teardown() {
    trap - EXIT
    exit $RC
}

setup
$@
RC=$?
