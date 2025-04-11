FROM node:22-alpine AS base

ENV DO_NOT_TRACK="1"
ENV NODE_ENV="production"
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

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile --prod=false
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod=false --offline

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm build

FROM base AS runner
RUN apk update
RUN apk add --no-cache postgresql postgresql-client

WORKDIR /app

ENV UID=1001
ENV GID=1001

# Don't run production as root
RUN addgroup --system --gid "$GID" nodejs 
RUN adduser --system --uid "$UID" --ingroup nodejs nodejs

ENV PGDATA="/var/lib/postgresql/data"

RUN install -v -d -o nodejs -g nodejs \
    /var/lib/postgresql \
    /var/lib/postgresql/data \
    /var/run/postgresql

USER nodejs

COPY --from=installer --chown=nodejs:nodejs /app ./
COPY --chown=nodejs:nodejs /docker-entrypoint.sh .

VOLUME ["${PGDATA}"]

ENTRYPOINT ["sh", "docker-entrypoint.sh"]

CMD ["pnpm", "run", "prod"]

EXPOSE 3000
EXPOSE 5432