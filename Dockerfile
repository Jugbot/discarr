FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder

WORKDIR /app

# Generate a partial monorepo with a pruned lockfile for a target workspace.
RUN pnpm add -g turbo
COPY . .

RUN pnpm turbo prune @acme/api @acme/app --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat

WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm build

FROM base AS runner
RUN apk update
RUN apk add --no-cache postgresql postgresql-client

WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

RUN mkdir -p /var/lib/postgresql/data && \
    chown -R nodejs:nodejs /var/lib/postgresql

RUN mkdir -p /var/run/postgresql && \
    chown -R nodejs:nodejs /var/run/postgresql

USER nodejs

COPY --from=installer --chown=nodejs:nodejs /app ./

ENV PGDATA="/var/lib/postgresql/data"

RUN pg_ctl init && \
    pg_ctl start && \
    createuser -s user && \
    createdb -O user dbname && \
    pg_ctl stop

CMD pnpm run prod