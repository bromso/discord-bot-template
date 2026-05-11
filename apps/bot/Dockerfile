# syntax=docker/dockerfile:1.7
FROM oven/bun:1-alpine AS deps
WORKDIR /repo
COPY package.json bun.lock turbo.json ./
COPY apps/bot/package.json apps/bot/
COPY apps/dashboard/package.json apps/dashboard/
COPY packages packages
RUN bun install --frozen-lockfile

FROM deps AS build
COPY apps/bot apps/bot
RUN bun run --filter=bot check-types

FROM oven/bun:1-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /repo /app
USER app
ENV NODE_ENV=production
CMD ["bun", "apps/bot/src/index.ts"]
