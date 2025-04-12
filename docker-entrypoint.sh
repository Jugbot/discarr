#!/bin/sh
set -euo pipefail

setup() {
    RC=-1
    trap 'teardown' EXIT

    # Run migrations
    pnpm --filter=@acme/db migrate
}
teardown() {
    trap - EXIT
    exit $RC
}

setup
$@
RC=$?
