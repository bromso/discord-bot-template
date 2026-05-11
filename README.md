# Discord Bot Template

A batteries-included starter for production-grade Discord bots. Comes with a typed slash-command framework, a Postgres-backed settings store, a Next.js dashboard with Discord OAuth, scheduled jobs, i18n, and Docker images for both apps. It is aimed at developers who want to ship a real bot — not a tutorial bot — without spending the first week wiring up plumbing.

## Stack

| Concern | Choice |
| --- | --- |
| Runtime / package manager | Bun |
| Monorepo | Turborepo |
| Discord library | discord.js |
| Database | Postgres + Drizzle ORM |
| Dashboard | Next.js 16 + Auth.js v5 |
| UI | Tailwind v4 + shadcn-style `Button` + Iconify (lucide) |
| Logging | pino |
| Scheduler | croner |
| i18n | plain TS locale files |
| Tests | Vitest |
| Lint + format | Biome |

## Quick start

```bash
bun install
cp .env.example .env                            # fill in Discord creds + AUTH_SECRET (openssl rand -base64 32)
docker compose up -d --wait                     # start Postgres and wait until healthy
bun run db:migrate                              # apply committed migrations to local Postgres
bun run bot:register --guild "$DEV_GUILD_ID"    # register slash commands to your dev guild
bun run dev                                     # bot + dashboard in parallel
```

**VS Code users:** Press F1 and run "Dev Containers: Reopen in Container" instead of the steps above — Postgres, Bun, and `bun install` are wired automatically via `.devcontainer/`. You still need to fill `.env` with Discord credentials before running `bun run dev`.

The dashboard is then on `http://localhost:3000` and the bot connects to the gateway as soon as `DISCORD_TOKEN` is valid. Slash commands take a minute or two to propagate even when scoped to a single guild.

## Project structure

```
apps/
  bot/          # discord.js client, slash commands, events, jobs, sharding entry
  dashboard/    # Next.js 16 app router, Auth.js v5 (Discord provider), guild settings UI
packages/
  config/       # Zod-parsed env (single source of truth for required variables)
  db/           # Drizzle schema, queries, migrator, drizzle-kit config
  i18n/         # locale files + tiny t() helper
  logger/       # pino factory with sensible prod/dev defaults
  ui/           # shadcn-host: Button + Icon, Tailwind v4 styles
  typescript-config/
```

Each app pulls from `@repo/*` workspace packages. Turborepo orchestrates `dev`, `build`, `test`, `check-types`, and `lint` across all of them.

## Adding a slash command

Drop a file into `apps/bot/src/commands/`. It is auto-loaded at startup. Cribbed from [`apps/bot/src/commands/ping.ts`](apps/bot/src/commands/ping.ts):

```ts
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../lib/defineCommand.js";

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with bot latency."),
  async execute(i, ctx) {
    const latency = i.client.ws.ping;
    await i.reply({ content: ctx.t("ping.reply", { latency }), flags: MessageFlags.Ephemeral });
  },
});
```

`ctx.t()` is the i18n helper resolved against the calling guild's locale. After adding a command, re-run `bun run bot:register --guild $DEV_GUILD_ID`.

Commands with subcommands or autocomplete (see [`apps/bot/src/commands/settings.ts`](apps/bot/src/commands/settings.ts)) just export an extra `autocomplete()` method on the same object.

## Adding an event

Files under `apps/bot/src/events/` are auto-loaded. From [`apps/bot/src/events/guildCreate.ts`](apps/bot/src/events/guildCreate.ts):

```ts
import { Events } from "discord.js";
import { upsertGuild } from "@repo/db";
import { defineEvent } from "../lib/defineEvent.js";

export default defineEvent({
  name: Events.GuildCreate,
  async execute(_client, guild) {
    await upsertGuild(guild.id);
  },
});
```

`name` is keyed off `Events`, and `execute` receives `(client, ...payload)` — fully typed via `ClientEvents[K]`.

## Adding a component

Buttons, select menus, and modals are dispatched by parsing their `customId`. The convention is `module:action[:arg]`, parsed by `apps/bot/src/lib/customId.ts`. Build IDs with `buildCustomId("settings", "pick", "locale")` so that any colons inside args are escaped safely.

Handlers live in `apps/bot/src/components/`. From [`apps/bot/src/components/settings.ts`](apps/bot/src/components/settings.ts):

```ts
import { updateGuildSettings } from "@repo/db";
import { defineComponent } from "../lib/defineComponent.js";

export default defineComponent({
  module: "settings",
  async execute(i, parts, ctx) {
    if (!i.guildId) return;
    const [action, target] = parts;
    if (action === "pick" && target === "locale" && i.isStringSelectMenu()) {
      const value = i.values[0];
      if (!value) return;
      await updateGuildSettings(i.guildId, { locale: value });
      await i.update({ content: ctx.t("settings.localeChanged", { locale: value }), components: [] });
    }
  },
});
```

The dispatcher matches on `module` and hands you `parts = [action, ...args]`.

## Adding a scheduled job

Files under `apps/bot/src/jobs/` are picked up by the scheduler, which runs cron expressions via croner. From [`apps/bot/src/jobs/cleanup.ts`](apps/bot/src/jobs/cleanup.ts):

```ts
import { defineJob } from "../lib/defineJob.js";

export default defineJob({
  cron: "0 4 * * *",
  shardZeroOnly: true,
  async run() {
    // do work
  },
});
```

`shardZeroOnly: true` (the default for most workloads) means the job only fires on shard 0. This is what you want for cleanup, digests, periodic reports, anything that should run once globally rather than once per shard. Leave it on unless you actually want per-shard behavior.

## Adding a per-guild setting

Three steps, one per layer:

1. **Extend the schema.** Add a field to the `GuildSettings` type in [`packages/db/src/schema/guilds.ts`](packages/db/src/schema/guilds.ts). The column is `jsonb` so no migration is strictly required for shape-only changes, but run `bun run db:generate` if you want a snapshot.
2. **Surface it in `/settings`.** Add a subcommand or component in [`apps/bot/src/commands/settings.ts`](apps/bot/src/commands/settings.ts) that calls `updateGuildSettings(guildId, { yourField })`.
3. **Surface it in the dashboard.** Add the input to [`apps/dashboard/src/app/(app)/guilds/[id]/settings/page.tsx`](apps/dashboard/src/app/(app)/guilds/[id]/settings/page.tsx) and extend the Zod schema in [`apps/dashboard/src/actions/settings.ts`](apps/dashboard/src/actions/settings.ts).

The bot and dashboard both go through the same `updateGuildSettings()` query in `@repo/db`, so you only have one source of truth for writes.

## i18n

Add a key to [`packages/i18n/src/locales/en.ts`](packages/i18n/src/locales/en.ts) and a parallel entry in `sv.ts`:

```ts
// en.ts
ping: { reply: "Pong! ({latency}ms)" },

// sv.ts
ping: { reply: "Pong! ({latency}ms)" },
```

`ctx.t("ping.reply", { latency })` resolves against the guild's stored locale and falls back to English.

For Discord-native command name and description localization (so the command itself appears translated in the client), chain `.setNameLocalizations()` and `.setDescriptionLocalizations()` on your `SlashCommandBuilder`:

```ts
new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with bot latency.")
  .setNameLocalizations({ "sv-SE": "ping" })
  .setDescriptionLocalizations({ "sv-SE": "Svarar med botens latens." });
```

## Deployment

**Docker.** Both apps ship with multi-stage Dockerfiles:

```bash
docker build -f apps/bot/Dockerfile -t my-bot .
docker build -f apps/dashboard/Dockerfile -t my-dashboard .
```

Run with `--env-file .env` (or your platform's env mechanism). The dashboard exposes `/api/health` for liveness checks.

**Railway.** Create two services from the same repo. Point each at its app's Dockerfile (`apps/bot/Dockerfile`, `apps/dashboard/Dockerfile`). Provision the Postgres add-on, wire `DATABASE_URL` from it, and copy the rest of `.env.example` into each service's variables.

**Fly.io.** From each app directory, run `fly launch --dockerfile Dockerfile` and answer "no" to autogenerating a Dockerfile. Set secrets with `fly secrets set DATABASE_URL=… DISCORD_TOKEN=…`. The bot has no public port; the dashboard does.

## Sharding

For single-shard development and small bots, the entry is `bun src/index.ts`. Once you cross roughly 2,000 guilds, Discord requires sharding — switch the start command to `bun src/sharding.ts`, which spawns a `ShardingManager` with one process per shard.

The thing to watch for: scheduled jobs default to `shardZeroOnly: true`. That is what you want for once-globally workloads, but if you wrote a job that needs per-shard behavior (or you write a new one and forget the flag) it will silently misbehave under sharding. Audit your jobs before flipping the entry.

## FAQ

- **My slash command doesn't appear.** Did you run `bun run bot:register --guild $DEV_GUILD_ID`? Guild-scoped commands appear immediately; global commands take up to an hour to propagate.
- **Zod env errors at startup.** Check your `.env` against the schema in [`packages/config/src/env.ts`](packages/config/src/env.ts). It throws on the first missing or malformed variable.
- **`drizzle-kit generate` says nothing changed.** It only emits SQL when the schema files differ from the last snapshot in `packages/db/migrations/meta/`. If you only changed a `jsonb` type and not a column, this is expected.
- **Dashboard build errors at Auth.js.** Make sure `DATABASE_URL` points at a reachable Postgres at build time. Auth.js v5 evaluates its config at module load, so the Drizzle adapter tries to connect during `next build`.

## Optional addons

- **More shadcn components.** Run `bunx shadcn add input form select` from `packages/ui`. Components land in `packages/ui/src/components/` and are immediately importable from both apps.
- **Sentry.** Install `@sentry/node` in `apps/bot`, set `SENTRY_DSN` in `.env`, and the bot's `errorHandler` will forward unhandled errors. The dashboard can do the same with `@sentry/nextjs`.
- **CI.** A minimal GitHub Actions workflow:

  ```yaml
  name: ci
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: oven-sh/setup-bun@v2
        - run: bun install --frozen-lockfile
        - run: bun run check-types
        - run: bun run test
  ```

## License

MIT — feel free to fork, copy, and ship. Add a `LICENSE` file at the repo root if you want to make that explicit before publishing.
