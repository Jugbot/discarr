FROM node:18-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /
RUN pnpm add -g turbo@^2
COPY . .
 
# Generate a partial monorepo with a pruned lockfile for a target workspace.
RUN turbo prune @acme/api @acme/app --docker
 
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /
 
# First install the dependencies (as they change less often)
COPY --from=builder /out/json/ .
RUN pnpm install --frozen-lockfile
 
# Build the project
COPY --from=builder /out/full/ .
RUN pnpm build
 
FROM base AS runner
WORKDIR /
 
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs
 
COPY --from=installer --chown=nodejs:nodejs /packages/api/dist ./
 
CMD node apps/web/server.js