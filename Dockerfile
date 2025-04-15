FROM node:22-alpine AS base

ENV DO_NOT_TRACK="1"
ENV NODE_ENV="production"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Use custom corepack home so cache is readable by other users
ENV COREPACK_HOME="/.corepack"
RUN mkdir $COREPACK_HOME

# Install pnpm
RUN corepack enable
COPY /package.json .
RUN corepack install
RUN rm /package.json

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

COPY --chmod=777 --from=installer /app .
COPY --chmod=777 /docker-entrypoint.sh .

RUN mkdir -m 777 /data

USER defaultuser

ENV DATA_DIR="/data"

VOLUME ["${DATA_DIR}"]

ENTRYPOINT ["sh", "docker-entrypoint.sh"]

CMD ["pnpm", "run", "prod"]

EXPOSE 3000
EXPOSE 5432