FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder

COPY . ./app
WORKDIR /app
 
# Generate a partial monorepo with a pruned lockfile for a target workspace.
RUN pnpm turbo prune @acme/api @acme/app --docker
 
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat postgresql postgresql-client
WORKDIR /app
 
# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
 
# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm build
 
FROM base AS runner
WORKDIR /app
 
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs
 
COPY --from=installer --chown=nodejs:nodejs /app/ ./

RUN mkdir -p /var/lib/postgresql/data && \
    chown -R nodejs:nodejs /var/lib/postgresql

ENV PGDATA=/var/lib/postgresql/data

RUN pg_ctl init

CMD ["pnpm", "run", "prod"]