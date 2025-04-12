FROM node:alpine AS base

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

WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile --prod=false
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod=false --offline

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm build

FROM base AS runner

WORKDIR /app

RUN addgroup --system defaultuser
RUN adduser --system --ingroup defaultuser defaultuser

COPY --chmod=777 --from=installer /app ./
COPY --chmod=777 /docker-entrypoint.sh .

USER defaultuser

ENV DATA_DIR="/data"

VOLUME ["${DATA_DIR}"]

ENTRYPOINT ["sh", "docker-entrypoint.sh"]

CMD ["pnpm", "run", "prod"]

EXPOSE 3000
EXPOSE 5432