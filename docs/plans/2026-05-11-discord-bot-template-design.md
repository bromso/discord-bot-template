# Discord bot template — design

**Date:** 2026-05-11
**Status:** Approved, ready for implementation planning
**Goal:** Transform this Turborepo starter into a great boilerplate for building Discord bots, with a companion dashboard.

## Summary

A monorepo template for building production-ready Discord bots in TypeScript on Bun. Ships a bot app (discord.js), a dashboard (Next.js 15 + Auth.js v5 + Discord OAuth2), and shared packages for db, config, logging, and i18n. Designed to be "lean and file-conventional": file-based loaders for commands/events/components, no base classes or decorators, every concept demonstrated by a working example users can copy.

## Stack

| Concern | Choice |
|---|---|
| Runtime / package manager | Bun |
| Monorepo | Turborepo |
| Language | TypeScript |
| Discord library | discord.js |
| Database | Postgres + Drizzle ORM (driver: `postgres-js`) |
| Dashboard | Next.js 15 (App Router) |
| Auth | Auth.js v5 (Discord OAuth2) + Drizzle adapter |
| UI | Tailwind v4 + shadcn/ui (latest) |
| Logging | pino |
| Scheduler | croner |
| i18n | plain TS locale files |
| Tests | Vitest |
| Local Postgres | docker-compose |
| Deploy | per-app Dockerfile (Bun-based) |

Stack chosen under the principle "stable and works well with all the other tech."

## §1. Repo layout

```
discord-bot-template/
├── apps/
│   ├── bot/                    # Discord bot (replaces apps/web)
│   └── dashboard/              # Next.js 15 dashboard (replaces apps/docs)
├── packages/
│   ├── db/                     # Drizzle schema, client, migrations  (NEW)
│   ├── config/                 # env parsing (Zod), shared constants  (NEW)
│   ├── logger/                 # pino instance + helpers              (NEW)
│   ├── i18n/                   # locale files + lookup                (NEW)
│   ├── ui/                     # shared React components (KEPT, trimmed)
│   ├── eslint-config/          # KEPT
│   └── typescript-config/      # KEPT
├── docs/plans/                 # design + implementation docs
├── docker-compose.yml          # Postgres for local dev (NEW)
├── .env.example                # template env vars (NEW)
├── turbo.json                  # extended with db tasks
├── package.json
└── README.md                   # rewritten for the template
```

The existing `apps/web` and `apps/docs` Turborepo demo apps are deleted and replaced. Each new package is small but answers a recurring "where does this go" question.

## §2. Bot app architecture (`apps/bot`)

```
apps/bot/
├── src/
│   ├── index.ts                # entrypoint — boots client, loaders, scheduler
│   ├── client.ts               # createClient() — discord.js Client w/ intents
│   ├── sharding.ts             # ShardingManager entry (opt-in via env)
│   ├── loaders/
│   │   ├── commands.ts
│   │   ├── events.ts
│   │   └── components.ts
│   ├── lib/
│   │   ├── defineCommand.ts    # typed identity helper (no class)
│   │   ├── defineEvent.ts
│   │   ├── defineComponent.ts
│   │   ├── defineJob.ts
│   │   ├── customId.ts         # parse/build "module:action:arg"
│   │   ├── errorHandler.ts     # central try/catch + Discord channel reporter
│   │   └── scheduler.ts        # croner-backed
│   ├── commands/
│   │   ├── ping.ts             # minimal slash command (+ localizations)
│   │   ├── settings.ts         # autocomplete + subcommands + reads @repo/db
│   │   └── report.ts           # context menu (message) command
│   ├── events/
│   │   ├── ready.ts
│   │   ├── guildCreate.ts      # inserts row into guilds table
│   │   └── interactionCreate.ts# dispatches to commands/components/autocomplete
│   ├── components/
│   │   └── settings.ts         # button + select handlers from /settings
│   └── jobs/
│       └── cleanup.ts          # example cron job (shard-0 guard)
├── scripts/
│   ├── register-commands.ts    # one-shot global/guild registration
│   └── delete-commands.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

### Shape of an item

Every command/event/component/job is a file that default-exports an object built by a tiny identity helper:

```ts
// commands/ping.ts
export default defineCommand({
  data: new SlashCommandBuilder().setName('ping').setDescription('Pong.'),
  async execute(interaction, ctx) {
    await interaction.reply(ctx.t('ping.reply'));
  },
});
```

No base classes, no decorators. Loaders glob the directory at boot, import each file, and build a `Map<name, item>`. Adding a thing = drop a file.

### Dispatcher

`events/interactionCreate.ts` is the single dispatcher. It inspects `interaction.type` and routes to:
- the command map (chat input + context menu)
- the autocomplete handler on the same command
- the component router (parses `customId` prefix → `components/<module>.ts`)

Every handler is wrapped by `errorHandler`. Top-level `process.on('unhandledRejection' | 'uncaughtException')` routes through the same handler.

### Sharding

`src/index.ts` is the single-process entry. `src/sharding.ts` spawns it via `ShardingManager`. README explains: flip your start script when you cross ~2,000 guilds. No changes needed in commands/events.

### Command registration

Explicit, not on-boot. `bun run bot:register [--guild <id>]` runs `scripts/register-commands.ts`. Avoids rate-limiting on restart and keeps prod deploys honest.

## §3. Persistence (`packages/db`)

```
packages/db/
├── src/
│   ├── index.ts            # exports `db`, schema, types
│   ├── client.ts           # drizzle(postgres(env.DATABASE_URL))
│   ├── schema/
│   │   ├── guilds.ts       # per-guild settings + locale
│   │   ├── users.ts        # per-user prefs
│   │   ├── sessions.ts     # Auth.js adapter tables
│   │   └── index.ts
│   └── queries/
│       └── guilds.ts
├── drizzle.config.ts
├── migrations/             # generated SQL, committed
└── package.json            # generate, migrate, push, studio scripts
```

### Initial schema

- `guilds(id pk discord_id, locale text default 'en', settings jsonb default '{}', created_at, updated_at)`
- `users(id pk discord_id, locale text, created_at)`
- Auth.js adapter tables: `sessions`, `accounts`, `verification_tokens`

`settings jsonb` lets features add per-guild settings without migrations. If a feature outgrows JSON, promote to its own table. README documents the trade-off.

### Migrations

`drizzle-kit generate` produces SQL committed to `migrations/`. `bun run db:migrate` applies them. Apps do **not** run migrations on boot — separate deploy step.

### Driver

`postgres-js` — Drizzle's most-loved driver, fast, small, great on Bun.

## §4. Dashboard (`apps/dashboard`)

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # landing — "invite the bot"
│   │   ├── (auth)/login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx            # auth-gated, guild switcher
│   │   │   ├── guilds/page.tsx       # admin-able guilds list
│   │   │   └── guilds/[id]/
│   │   │       ├── page.tsx          # overview
│   │   │       └── settings/page.tsx # edit guild settings (the reference example)
│   │   └── api/auth/[...nextauth]/route.ts
│   ├── auth.ts                       # Auth.js v5 + Drizzle adapter
│   ├── lib/
│   │   ├── discord.ts                # fetch user's guilds; MANAGE_GUILD filter
│   │   └── guards.ts                 # requireUser(), requireGuildAdmin()
│   └── actions/
│       └── settings.ts               # server actions: updateGuildSettings(...)
├── next.config.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

### Auth

Auth.js v5 with the Discord provider and Drizzle adapter (pointing at `@repo/db`). Scopes: `identify guilds`. Tokens stored in DB; guild list re-fetched on demand with a short in-memory cache.

### Guild filtering

A guild is configurable if (a) user has `MANAGE_GUILD` permission **and** (b) the bot is in that guild. Guilds missing the bot show an "Invite the bot" button with a pre-filled OAuth2 install URL.

### Bot ↔ dashboard coupling

The dashboard writes to the DB; the bot reads-through on every interaction. No network channel between them. Trade-off documented in README: instant cache-invalidation patterns (Postgres `LISTEN/NOTIFY`, `updated_at` checks) are described but not implemented.

### Reference example shipped

Working `/guilds/[id]/settings` page that edits `locale` + one example setting (e.g., `welcomeMessage`). Zod-validated. Server-action submit. Users copy this when adding their own settings.

### UI

Tailwind v4 + shadcn/ui primitives (Button, Input, Card, Form). `@repo/ui` trimmed of Turborepo demo content; holds shared primitives consumed by `apps/dashboard`.

## §5. Operational features

### Logging (`@repo/logger`)

`createLogger(name: string)` → pino instance. `pino-pretty` in dev, JSON in prod (toggled by `NODE_ENV`). Both apps import it. Loggers carry `name` as a base field. No transports — log shipping is the deploy environment's job.

### Error reporting

`apps/bot/src/lib/errorHandler.ts` exports `handleError(err, ctx)`:
1. Logs with structured context (guild, user, command/component).
2. Posts a redacted embed to `ERROR_CHANNEL_ID` if set (rate-limited to 1 post per 10s per fingerprint via in-memory map).
3. Calls `Sentry.captureException` if `SENTRY_DSN` is set.

The interaction dispatcher wraps every handler. Process-level error events route through the same path. Dashboard uses Next.js's built-in error boundaries + the same optional Sentry SDK; no Discord-channel reporting from there.

### i18n (`@repo/i18n`)

Plain TS locale files (`packages/i18n/src/locales/{en,sv,...}.ts`). `t(locale, key, vars?)` does dotted-path lookup with `{var}` interpolation, falling back to `en`.

`defineCommand` accepts a `localizations` field mapping to Discord's `setNameLocalizations` / `setDescriptionLocalizations` during registration. `/ping` ships with `en` + `sv` so the pattern is visible.

Locale resolution per-interaction: user pref > guild pref > `interaction.locale` > `en`. The dispatcher injects a bound `t` into handler context.

### Scheduled jobs

`croner`-backed scheduler. Drop a file in `apps/bot/src/jobs/` exporting `defineJob({ cron, run })`. Runs in-process.

Multi-shard caveat: jobs run **once per shard**. Sample `cleanup.ts` demonstrates the shard-0 leader-election guard. README documents the pattern.

## §6. Local dev + deployment

### `docker-compose.yml` (local dev only)

One service: `postgres:17-alpine` with a persistent volume on `5432`. Bot/dashboard run via `bun run dev` so HMR works. README is explicit: compose is for the database, not the apps.

### `.env.example`

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_PUBLIC_KEY=
AUTH_SECRET=
AUTH_URL=http://localhost:3000
ERROR_CHANNEL_ID=          # optional
SENTRY_DSN=                # optional
LOG_LEVEL=info
DEV_GUILD_ID=              # optional — instant command updates in dev
```

`@repo/config` parses these with Zod once at import. Missing required vars crash on boot with a clear message.

### Dockerfiles (per app)

Multi-stage, Bun-based. Identical structure:
1. `oven/bun:1-alpine` deps stage — copy lockfile, `bun install --frozen-lockfile`.
2. Build stage — copy source, `turbo build --filter=<app>...`.
3. Runtime stage — `bun:1-alpine` (not distroless — easier debugging for this audience), non-root user. `CMD ["bun", "run", "start"]`.

**Healthchecks:** dashboard has a `/api/health` route. Bot has none — relies on process liveness. README notes Railway/Fly users can add a tiny HTTP listener if their platform demands an HTTP healthcheck.

### Top-level scripts

- `bun run dev` — turbo dev (both apps in parallel)
- `bun run build` / `lint` / `check-types`
- `bun run db:generate|migrate|push|studio`
- `bun run bot:register [--guild <id>]`
- `bun run test`

### Turbo

Add `db:migrate` task with `cache: false`. No remote cache setup in the template; README mentions `turbo login` as the one-liner.

### README

Rewritten end-to-end: Quick start (5 commands), Stack, Adding a command, Adding an event, Adding a component, Adding a setting, Deployment (Docker / Railway / Fly), Sharding, FAQ.

## §7. Testing

### Setup

Vitest at repo root via `vitest.workspace.ts`. Each app/package can have its own `vitest.config.ts`. `bun run test` runs everything; `--filter` scopes.

### Shipped examples

1. `apps/bot/src/commands/ping.test.ts` — hand-rolled interaction stub (only the methods we call). Pattern: mock the interaction, call `execute`, assert.
2. `apps/bot/src/lib/customId.test.ts` — pure-function tests for the custom-id parser.
3. `apps/dashboard/src/actions/settings.test.ts` — server action against real test DB, wrapped in a Drizzle transaction with rollback.
4. `packages/db` — one query helper tested with the transaction-rollback pattern.

### Test DB

Same Postgres container as dev, different DB name (`bot_test`). `globalSetup` runs `drizzle-kit push` against `bot_test` once per run.

### Explicitly not shipped

- No mocked discord.js client; the stub approach suffices.
- No e2e gateway tests (requires real bot token).
- No coverage thresholds (`vitest --coverage` is wired up but un-enforced).
- No CI configuration. README has a 10-line GitHub Actions example users can paste.

## Out of scope

Deliberately omitted from the template:

- Music / voice features (heavy, opinionated dependencies).
- Feature modules / plugin system — explicitly rejected in favor of the lean file-conventional approach.
- Multi-bot orchestration in one repo — single bot, single dashboard.
- Premium/billing scaffolding.
- Realtime push from dashboard to bot (documented as a pattern, not implemented).
- CI/CD pipelines beyond a README example.

## Open questions for implementation planning

- Exact shadcn/ui component set to scaffold (likely: Button, Input, Label, Card, Form, Select, Switch, Toast).
- Whether to include a single example "welcome message" feature wired end-to-end (db column or `settings.welcomeMessage` JSON path → command → settings page) as a final integration smoke-test of the architecture. Strongly recommended.
- Choice of test runner setup for `packages/i18n` (probably skip — plain TS objects are self-evident).
