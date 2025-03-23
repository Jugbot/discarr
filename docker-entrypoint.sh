#!/bin/sh
set -euo pipefail

setup() {
    RC=-1
    trap 'teardown' EXIT

    # Start postgres
    pg_ctl start

    # Run migrations
    pnpm --filter=@acme/db push
}
teardown() {
    # Tear down postgres
    pg_ctl stop

    trap - EXIT
    exit $RC
}

setup
$@
RC=$?
