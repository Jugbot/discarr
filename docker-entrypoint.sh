#!/bin/sh
set -euo pipefail

setup() {
    RC=-1
    trap 'teardown' EXIT

    if [ -z "$(ls -A "$PGDATA")" ]; then
        pg_ctl init
        pg_ctl start
        createuser -s user
        createdb -O user dbname
        pg_ctl stop
    fi

    # Start postgres
    pg_ctl start

    # Run migrations
    pnpm --filter=@acme/db migrate
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
