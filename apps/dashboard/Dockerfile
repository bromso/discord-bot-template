# syntax=docker/dockerfile:1.7
FROM oven/bun:1-alpine AS deps
WORKDIR /repo
COPY package.json bun.lock turbo.json ./
COPY apps/bot/package.json apps/bot/
COPY apps/dashboard/package.json apps/dashboard/
COPY packages packages
RUN bun install --frozen-lockfile

FROM deps AS build
COPY apps/dashboard apps/dashboard
ENV DISCORD_TOKEN=build_placeholder \
    DISCORD_CLIENT_ID=build_placeholder \
    DISCORD_CLIENT_SECRET=build_placeholder \
    AUTH_SECRET=build_placeholder \
    AUTH_URL=http://localhost:3000 \
    DATABASE_URL=postgres://build_placeholder:build@localhost:5432/build
RUN bun run --filter=dashboard build

FROM oven/bun:1-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /repo /app
USER app
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O- http://localhost:3000/api/health || exit 1
CMD ["bun", "--cwd=apps/dashboard", "start"]
