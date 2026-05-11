# Discord bot template — implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform this Turborepo starter into a production-ready Discord bot boilerplate (bot + dashboard monorepo) per the approved design.

**Architecture:** Lean, file-conventional monorepo on Bun. `apps/bot` is a discord.js bot using file-based loaders (commands/events/components/jobs as drop-in files). `apps/dashboard` is Next.js 15 App Router + Auth.js v5 + Tailwind v4 + shadcn/ui. Both apps share `@repo/db` (Drizzle + Postgres), `@repo/config` (Zod-parsed env), `@repo/logger` (pino), `@repo/i18n` (plain TS locale files). Local Postgres via docker-compose; per-app Dockerfiles for deploy. Vitest for tests.

**Tech Stack:** Bun, Turborepo, TypeScript, discord.js, Drizzle ORM + postgres-js, Postgres 17, Next.js 15, React 19, Auth.js v5, Tailwind v4, shadcn/ui, pino, croner, Zod, Vitest.

**Design reference:** `docs/plans/2026-05-11-discord-bot-template-design.md` (commit `81796ab`). Read it first.

---

## Pre-work

Before Task 1: create a feature branch.

```bash
git checkout -b feat/discord-bot-template
```

Verify clean working tree and Bun installed:

```bash
git status                # expect: clean
bun --version             # expect: 1.3.x or newer
```

---

## Phase 1 — Demolition & root setup

### Task 1: Remove demo apps

**Files:**
- Delete: `apps/web/`, `apps/docs/`
- Clear: `packages/ui/src/`

**Steps:**

1. Remove demo apps and gut `packages/ui`:
   ```bash
   rm -rf apps/web apps/docs
   rm -rf packages/ui/src packages/ui/turbo
   ```
2. Verify:
   ```bash
   ls apps/                # expect: empty
   ls packages/ui/         # expect: package.json, eslint.config.mjs, tsconfig.json
   ```
3. Commit:
   ```bash
   git add -A
   git commit -m "chore: remove Turborepo demo apps and clear packages/ui"
   ```

### Task 2: Reset packages/ui as a shadcn host

**Files:**
- Modify: `packages/ui/package.json`
- Create: `packages/ui/src/index.ts`

**Steps:**

1. Rewrite `packages/ui/package.json`:
   ```json
   {
     "name": "@repo/ui",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "exports": {
       ".": "./src/index.ts",
       "./styles.css": "./src/styles.css",
       "./components/*": "./src/components/*.tsx",
       "./lib/*": "./src/lib/*.ts"
     },
     "devDependencies": {
       "@repo/eslint-config": "*",
       "@repo/typescript-config": "*",
       "typescript": "5.9.2"
     }
   }
   ```
2. Create `packages/ui/src/index.ts`:
   ```ts
   export {};
   ```
3. Commit:
   ```bash
   git add packages/ui
   git commit -m "chore: reset packages/ui as shared component host"
   ```

### Task 3: Root package.json + turbo.json updates

**Files:**
- Modify: `package.json`, `turbo.json`

**Steps:**

1. Replace `package.json` with:
   ```json
   {
     "name": "discord-bot-template",
     "private": true,
     "scripts": {
       "dev": "turbo run dev",
       "build": "turbo run build",
       "lint": "turbo run lint",
       "check-types": "turbo run check-types",
       "test": "turbo run test",
       "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
       "db:generate": "bun --cwd packages/db run generate",
       "db:migrate": "bun --cwd packages/db run migrate",
       "db:push": "bun --cwd packages/db run push",
       "db:studio": "bun --cwd packages/db run studio",
       "bot:register": "bun --cwd apps/bot run register",
       "bot:unregister": "bun --cwd apps/bot run unregister"
     },
     "devDependencies": {
       "prettier": "^3.7.4",
       "turbo": "^2.9.12",
       "typescript": "5.9.2"
     },
     "engines": {
       "node": ">=20"
     },
     "packageManager": "bun@1.3.13",
     "workspaces": ["apps/*", "packages/*"]
   }
   ```
2. Replace `turbo.json`:
   ```json
   {
     "$schema": "https://turborepo.dev/schema.json",
     "ui": "tui",
     "globalEnv": [
       "NODE_ENV",
       "DATABASE_URL",
       "DISCORD_TOKEN",
       "DISCORD_CLIENT_ID",
       "DISCORD_CLIENT_SECRET",
       "DISCORD_PUBLIC_KEY",
       "AUTH_SECRET",
       "AUTH_URL",
       "ERROR_CHANNEL_ID",
       "SENTRY_DSN",
       "LOG_LEVEL",
       "DEV_GUILD_ID"
     ],
     "tasks": {
       "build": {
         "dependsOn": ["^build"],
         "inputs": ["$TURBO_DEFAULT$", ".env*"],
         "outputs": [".next/**", "!.next/cache/**", "dist/**"]
       },
       "lint": { "dependsOn": ["^lint"] },
       "check-types": { "dependsOn": ["^check-types"] },
       "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
       "dev": { "cache": false, "persistent": true },
       "db:migrate": { "cache": false }
     }
   }
   ```
3. Reinstall to refresh workspaces:
   ```bash
   bun install
   ```
4. Commit:
   ```bash
   git add package.json turbo.json bun.lock
   git commit -m "chore: rewrite root package.json and turbo.json for bot template"
   ```

### Task 4: Local dev infrastructure files

**Files:**
- Create: `.env.example`, `docker-compose.yml`
- Modify: `.gitignore`

**Steps:**

1. Create `.env.example`:
   ```
   # Postgres (matches docker-compose.yml defaults)
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot

   # Discord application — https://discord.com/developers/applications
   DISCORD_TOKEN=
   DISCORD_CLIENT_ID=
   DISCORD_CLIENT_SECRET=
   DISCORD_PUBLIC_KEY=

   # Auth.js (generate with `openssl rand -base64 32`)
   AUTH_SECRET=
   AUTH_URL=http://localhost:3000

   # Optional ops
   ERROR_CHANNEL_ID=
   SENTRY_DSN=
   LOG_LEVEL=info
   DEV_GUILD_ID=
   ```
2. Create `docker-compose.yml`:
   ```yaml
   services:
     postgres:
       image: postgres:17-alpine
       restart: unless-stopped
       environment:
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
         POSTGRES_DB: bot
       ports:
         - "5432:5432"
       volumes:
         - postgres-data:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U postgres"]
         interval: 5s
         timeout: 5s
         retries: 5

   volumes:
     postgres-data:
   ```
3. Append to `.gitignore`:
   ```
   # Project
   .env
   .turbo
   dist
   ```
4. Verify Postgres comes up:
   ```bash
   docker compose up -d
   docker compose ps        # expect: postgres "running (healthy)"
   ```
5. Commit:
   ```bash
   git add .env.example docker-compose.yml .gitignore
   git commit -m "chore: add docker-compose for local Postgres and env template"
   ```

---

## Phase 2 — Shared packages

### Task 5: `@repo/config`

**Files:**
- Create: `packages/config/package.json`, `tsconfig.json`, `src/env.ts`, `src/index.ts`

**Steps:**

1. `packages/config/package.json`:
   ```json
   {
     "name": "@repo/config",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "exports": { ".": "./src/index.ts" },
     "scripts": {
       "check-types": "tsc --noEmit",
       "lint": "echo no-op"
     },
     "dependencies": { "zod": "^3.23.8" },
     "devDependencies": {
       "@repo/typescript-config": "*",
       "typescript": "5.9.2"
     }
   }
   ```
2. `packages/config/tsconfig.json`:
   ```json
   {
     "extends": "@repo/typescript-config/base.json",
     "include": ["src"],
     "compilerOptions": { "outDir": "dist" }
   }
   ```
3. `packages/config/src/env.ts`:
   ```ts
   import { z } from "zod";

   const schema = z.object({
     NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
     DATABASE_URL: z.string().url(),
     DISCORD_TOKEN: z.string().min(1),
     DISCORD_CLIENT_ID: z.string().min(1),
     DISCORD_CLIENT_SECRET: z.string().min(1).optional(),
     DISCORD_PUBLIC_KEY: z.string().min(1).optional(),
     AUTH_SECRET: z.string().min(1).optional(),
     AUTH_URL: z.string().url().optional(),
     ERROR_CHANNEL_ID: z.string().optional(),
     SENTRY_DSN: z.string().optional(),
     LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
     DEV_GUILD_ID: z.string().optional(),
   });

   const parsed = schema.safeParse(process.env);
   if (!parsed.success) {
     console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
     throw new Error("Invalid environment");
   }

   export const env = parsed.data;
   export type Env = typeof env;
   ```
4. `packages/config/src/index.ts`:
   ```ts
   export { env, type Env } from "./env.js";
   ```
5. Install + verify:
   ```bash
   bun install
   bun --cwd packages/config run check-types
   ```
6. Commit:
   ```bash
   git add packages/config bun.lock
   git commit -m "feat(config): add @repo/config with Zod env parsing"
   ```

### Task 6: `@repo/logger`

**Files:**
- Create: `packages/logger/package.json`, `tsconfig.json`, `src/index.ts`

**Steps:**

1. `packages/logger/package.json`:
   ```json
   {
     "name": "@repo/logger",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "exports": { ".": "./src/index.ts" },
     "scripts": {
       "check-types": "tsc --noEmit",
       "lint": "echo no-op"
     },
     "dependencies": {
       "@repo/config": "*",
       "pino": "^9.5.0",
       "pino-pretty": "^11.3.0"
     },
     "devDependencies": {
       "@repo/typescript-config": "*",
       "typescript": "5.9.2"
     }
   }
   ```
2. `packages/logger/tsconfig.json` extends the typescript-config base, includes `src`.
3. `packages/logger/src/index.ts`:
   ```ts
   import pino from "pino";
   import { env } from "@repo/config";

   const isDev = env.NODE_ENV !== "production";
   const root = pino({
     level: env.LOG_LEVEL,
     transport: isDev
       ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" } }
       : undefined,
   });

   export function createLogger(name: string) {
     return root.child({ name });
   }
   export type Logger = ReturnType<typeof createLogger>;
   ```
4. Verify:
   ```bash
   bun install
   bun --cwd packages/logger run check-types
   ```
5. Commit:
   ```bash
   git add packages/logger bun.lock
   git commit -m "feat(logger): add @repo/logger with pino"
   ```

### Task 7: `@repo/i18n` — locales + types

**Files:**
- Create: `packages/i18n/package.json`, `tsconfig.json`
- Create: `packages/i18n/src/locales/{en,sv}.ts`, `src/types.ts`

**Steps:**

1. `packages/i18n/package.json`:
   ```json
   {
     "name": "@repo/i18n",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "exports": { ".": "./src/index.ts" },
     "scripts": {
       "check-types": "tsc --noEmit",
       "test": "vitest run",
       "lint": "echo no-op"
     },
     "devDependencies": {
       "@repo/typescript-config": "*",
       "typescript": "5.9.2",
       "vitest": "^2.1.8"
     }
   }
   ```
2. `packages/i18n/tsconfig.json` mirrors `@repo/config`.
3. `packages/i18n/src/locales/en.ts`:
   ```ts
   export default {
     ping: { reply: "Pong! ({latency}ms)" },
     settings: {
       title: "Settings",
       localeChanged: "Locale updated to {locale}.",
       welcomeUpdated: "Welcome message updated.",
       noPermission: "You need Manage Server permission.",
     },
     errors: { unknown: "Something went wrong. The error has been logged." },
   } as const;
   ```
4. `packages/i18n/src/locales/sv.ts`:
   ```ts
   import type en from "./en.js";
   const dict: typeof en = {
     ping: { reply: "Pong! ({latency}ms)" },
     settings: {
       title: "Inställningar",
       localeChanged: "Språket har ändrats till {locale}.",
       welcomeUpdated: "Välkomstmeddelandet har uppdaterats.",
       noPermission: "Du behöver behörigheten Hantera server.",
     },
     errors: { unknown: "Något gick fel. Felet har loggats." },
   };
   export default dict;
   ```
5. `packages/i18n/src/types.ts`:
   ```ts
   import type en from "./locales/en.js";

   export type Dict = typeof en;
   export type Locale = "en" | "sv";

   type Leaves<T> = T extends object
     ? { [K in keyof T & string]: `${K}` | `${K}.${Leaves<T[K]>}` }[keyof T & string]
     : never;
   export type Key = Leaves<Dict>;
   ```
6. Commit:
   ```bash
   git add packages/i18n
   git commit -m "feat(i18n): add locale files and types"
   ```

### Task 8: `@repo/i18n` — `t()` with tests (TDD)

**Files:**
- Create: `packages/i18n/src/t.ts`, `src/index.ts`, `src/t.test.ts`, `vitest.config.ts`

**Steps:**

1. `packages/i18n/vitest.config.ts`:
   ```ts
   import { defineConfig } from "vitest/config";
   export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
   ```
2. Write the failing test (`packages/i18n/src/t.test.ts`):
   ```ts
   import { describe, expect, it } from "vitest";
   import { t } from "./t.js";

   describe("t()", () => {
     it("looks up nested keys", () => {
       expect(t("en", "settings.title")).toBe("Settings");
     });
     it("interpolates {var} placeholders", () => {
       expect(t("en", "ping.reply", { latency: 42 })).toBe("Pong! (42ms)");
     });
     it("returns the requested locale's value", () => {
       expect(t("sv", "settings.title")).toBe("Inställningar");
     });
     it("returns the key when missing in all locales", () => {
       expect(t("en", "does.not.exist" as never)).toBe("does.not.exist");
     });
   });
   ```
3. Run — expect fail with "Cannot find module './t.js'":
   ```bash
   bun --cwd packages/i18n run test
   ```
4. Implement (`packages/i18n/src/t.ts`):
   ```ts
   import en from "./locales/en.js";
   import sv from "./locales/sv.js";
   import type { Key, Locale } from "./types.js";

   const dicts = { en, sv } as const;

   function lookup(obj: unknown, path: string): string | undefined {
     return path.split(".").reduce<unknown>((acc, k) => {
       if (acc && typeof acc === "object" && k in acc) return (acc as Record<string, unknown>)[k];
       return undefined;
     }, obj) as string | undefined;
   }

   function interpolate(template: string, vars?: Record<string, string | number>): string {
     if (!vars) return template;
     return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
   }

   export function t(locale: Locale, key: Key, vars?: Record<string, string | number>): string {
     const primary = lookup(dicts[locale] ?? dicts.en, key as string);
     const fallback = primary ?? lookup(dicts.en, key as string);
     if (typeof fallback !== "string") return key as string;
     return interpolate(fallback, vars);
   }
   ```
5. `packages/i18n/src/index.ts`:
   ```ts
   export { t } from "./t.js";
   export type { Dict, Key, Locale } from "./types.js";
   export { default as en } from "./locales/en.js";
   export { default as sv } from "./locales/sv.js";
   ```
6. Re-run — expect 4 pass:
   ```bash
   bun --cwd packages/i18n run test
   ```
7. Commit:
   ```bash
   git add packages/i18n bun.lock
   git commit -m "feat(i18n): add t() with nested lookup, fallback, and interpolation"
   ```

### Task 9: `@repo/db` — package + schema

**Files:**
- Create: `packages/db/package.json`, `tsconfig.json`, `drizzle.config.ts`
- Create: `packages/db/src/schema/{guilds,users,auth,index}.ts`

**Steps:**

1. `packages/db/package.json`:
   ```json
   {
     "name": "@repo/db",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "exports": {
       ".": "./src/index.ts",
       "./schema": "./src/schema/index.ts"
     },
     "scripts": {
       "generate": "drizzle-kit generate",
       "migrate": "bun src/migrate.ts",
       "push": "drizzle-kit push",
       "studio": "drizzle-kit studio",
       "test": "vitest run",
       "check-types": "tsc --noEmit",
       "lint": "echo no-op"
     },
     "dependencies": {
       "@repo/config": "*",
       "drizzle-orm": "^0.36.4",
       "postgres": "^3.4.5"
     },
     "devDependencies": {
       "@repo/typescript-config": "*",
       "drizzle-kit": "^0.30.1",
       "typescript": "5.9.2",
       "vitest": "^2.1.8"
     }
   }
   ```
2. `packages/db/tsconfig.json` extends base, includes `src`.
3. `packages/db/drizzle.config.ts`:
   ```ts
   import { defineConfig } from "drizzle-kit";
   export default defineConfig({
     schema: "./src/schema/index.ts",
     out: "./migrations",
     dialect: "postgresql",
     dbCredentials: { url: process.env.DATABASE_URL! },
     casing: "snake_case",
   });
   ```
4. `packages/db/src/schema/guilds.ts`:
   ```ts
   import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

   export type GuildSettings = {
     welcomeMessage?: string;
     welcomeChannelId?: string;
   };

   export const guilds = pgTable("guilds", {
     id: text("id").primaryKey(),
     locale: text("locale").notNull().default("en"),
     settings: jsonb("settings").$type<GuildSettings>().notNull().default({}),
     createdAt: timestamp("created_at").notNull().defaultNow(),
     updatedAt: timestamp("updated_at").notNull().defaultNow(),
   });
   export type Guild = typeof guilds.$inferSelect;
   ```
5. `packages/db/src/schema/users.ts`:
   ```ts
   import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

   export const users = pgTable("users", {
     id: text("id").primaryKey(),
     locale: text("locale"),
     createdAt: timestamp("created_at").notNull().defaultNow(),
   });
   export type User = typeof users.$inferSelect;
   ```
6. `packages/db/src/schema/auth.ts` (Auth.js Drizzle adapter tables — `authUsers` renamed to avoid collision with Discord `users`):
   ```ts
   import { pgTable, text, timestamp, primaryKey, integer } from "drizzle-orm/pg-core";

   export const authUsers = pgTable("auth_users", {
     id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
     name: text("name"),
     email: text("email").unique(),
     emailVerified: timestamp("email_verified", { mode: "date" }),
     image: text("image"),
   });

   export const accounts = pgTable(
     "accounts",
     {
       userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
       type: text("type").notNull(),
       provider: text("provider").notNull(),
       providerAccountId: text("provider_account_id").notNull(),
       refresh_token: text("refresh_token"),
       access_token: text("access_token"),
       expires_at: integer("expires_at"),
       token_type: text("token_type"),
       scope: text("scope"),
       id_token: text("id_token"),
       session_state: text("session_state"),
     },
     (a) => ({ pk: primaryKey({ columns: [a.provider, a.providerAccountId] }) }),
   );

   export const sessions = pgTable("sessions", {
     sessionToken: text("session_token").primaryKey(),
     userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
     expires: timestamp("expires", { mode: "date" }).notNull(),
   });

   export const verificationTokens = pgTable(
     "verification_tokens",
     {
       identifier: text("identifier").notNull(),
       token: text("token").notNull(),
       expires: timestamp("expires", { mode: "date" }).notNull(),
     },
     (v) => ({ pk: primaryKey({ columns: [v.identifier, v.token] }) }),
   );
   ```
7. `packages/db/src/schema/index.ts`:
   ```ts
   export * from "./guilds.js";
   export * from "./users.js";
   export * from "./auth.js";
   ```
8. Verify types:
   ```bash
   bun install
   bun --cwd packages/db run check-types
   ```
9. Commit:
   ```bash
   git add packages/db bun.lock
   git commit -m "feat(db): add Drizzle schema (guilds, users, auth tables)"
   ```

### Task 10: `@repo/db` — client + queries + migrate runner

**Files:**
- Create: `packages/db/src/{client,index,migrate}.ts`, `src/queries/guilds.ts`

**Steps:**

1. `packages/db/src/client.ts`:
   ```ts
   import postgres from "postgres";
   import { drizzle } from "drizzle-orm/postgres-js";
   import { env } from "@repo/config";
   import * as schema from "./schema/index.js";

   const queryClient = postgres(env.DATABASE_URL);
   export const db = drizzle(queryClient, { schema, casing: "snake_case" });
   export type DB = typeof db;
   ```
2. `packages/db/src/queries/guilds.ts`:
   ```ts
   import { eq } from "drizzle-orm";
   import { db } from "../client.js";
   import { guilds, type Guild, type GuildSettings } from "../schema/guilds.js";

   export async function getGuild(id: string): Promise<Guild | undefined> {
     return db.query.guilds.findFirst({ where: eq(guilds.id, id) });
   }

   export async function upsertGuild(id: string): Promise<Guild> {
     const [row] = await db.insert(guilds).values({ id }).onConflictDoNothing().returning();
     return row ?? (await getGuild(id))!;
   }

   export async function updateGuildSettings(
     id: string,
     patch: Partial<GuildSettings> & { locale?: string },
   ): Promise<Guild> {
     const existing = await getGuild(id);
     const { locale, ...settingsPatch } = patch;
     const nextSettings: GuildSettings = { ...(existing?.settings ?? {}), ...settingsPatch };
     const [row] = await db
       .update(guilds)
       .set({
         settings: nextSettings,
         ...(locale !== undefined ? { locale } : {}),
         updatedAt: new Date(),
       })
       .where(eq(guilds.id, id))
       .returning();
     return row;
   }
   ```
3. `packages/db/src/index.ts`:
   ```ts
   export { db, type DB } from "./client.js";
   export * as schema from "./schema/index.js";
   export * from "./schema/index.js";
   export * from "./queries/guilds.js";
   ```
4. `packages/db/src/migrate.ts`:
   ```ts
   import { migrate } from "drizzle-orm/postgres-js/migrator";
   import { db } from "./client.js";
   await migrate(db, { migrationsFolder: "./migrations" });
   console.log("Migrations applied.");
   process.exit(0);
   ```
5. Verify types:
   ```bash
   bun --cwd packages/db run check-types
   ```
6. Commit:
   ```bash
   git add packages/db
   git commit -m "feat(db): add client, query helpers, and migrate runner"
   ```

### Task 11: Generate + apply first migration

**Steps:**

1. Copy `.env.example` to `.env`, set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot`. Leave Discord values blank — `drizzle-kit` reads only `DATABASE_URL`.
2. Generate migration:
   ```bash
   bun --cwd packages/db run generate
   ```
   Expected: `packages/db/migrations/0000_*.sql` created.
3. Apply via `push` (avoids needing all `@repo/config` env vars):
   ```bash
   bun --cwd packages/db run push
   ```
   Expected: "Changes applied".
4. Verify schema in DB:
   ```bash
   docker compose exec postgres psql -U postgres -d bot -c '\dt'
   ```
   Expected: 6 tables (guilds, users, auth_users, accounts, sessions, verification_tokens).
5. Commit:
   ```bash
   git add packages/db/migrations
   git commit -m "feat(db): add initial migration"
   ```

### Task 12: `@repo/db` — query tests with isolated test DB

**Files:**
- Create: `packages/db/vitest.config.ts`, `src/test-utils.ts`, `src/queries/guilds.test.ts`

**Steps:**

1. `packages/db/vitest.config.ts`:
   ```ts
   import { defineConfig } from "vitest/config";
   export default defineConfig({
     test: {
       include: ["src/**/*.test.ts"],
       globalSetup: "./src/test-utils.ts",
       hookTimeout: 30_000,
     },
   });
   ```
2. `packages/db/src/test-utils.ts` — uses `spawnSync` with array args (no shell injection surface):
   ```ts
   import { spawnSync } from "node:child_process";
   import postgres from "postgres";

   export default async function globalSetup() {
     const url = process.env.DATABASE_URL_TEST ?? "postgres://postgres:postgres@localhost:5432/bot_test";
     const admin = postgres("postgres://postgres:postgres@localhost:5432/postgres");
     const exists = await admin`SELECT 1 FROM pg_database WHERE datname = 'bot_test'`;
     if (exists.length === 0) await admin.unsafe("CREATE DATABASE bot_test");
     await admin.end();

     const r = spawnSync(
       "bun",
       ["x", "drizzle-kit", "push", "--force"],
       { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } },
     );
     if (r.status !== 0) throw new Error("drizzle-kit push failed");
     process.env.DATABASE_URL = url;
   }
   ```
3. Write the test:
   ```ts
   // packages/db/src/queries/guilds.test.ts
   import { beforeEach, describe, expect, it } from "vitest";
   import { db } from "../client.js";
   import { guilds } from "../schema/guilds.js";
   import { getGuild, upsertGuild, updateGuildSettings } from "./guilds.js";

   describe("guild queries", () => {
     beforeEach(async () => { await db.delete(guilds); });

     it("upserts and reads a guild", async () => {
       const row = await upsertGuild("123");
       expect(row.id).toBe("123");
       expect(row.locale).toBe("en");
       expect(row.settings).toEqual({});
       expect(await getGuild("123")).toMatchObject({ id: "123" });
     });

     it("updates settings without losing existing keys", async () => {
       await upsertGuild("456");
       await updateGuildSettings("456", { welcomeMessage: "hello" });
       await updateGuildSettings("456", { welcomeChannelId: "789" });
       const row = await getGuild("456");
       expect(row?.settings).toEqual({ welcomeMessage: "hello", welcomeChannelId: "789" });
     });

     it("updates locale separately", async () => {
       await upsertGuild("789");
       const row = await updateGuildSettings("789", { locale: "sv" });
       expect(row.locale).toBe("sv");
     });
   });
   ```
4. Run — expect 3 pass:
   ```bash
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot_test \
     DISCORD_TOKEN=test DISCORD_CLIENT_ID=test \
     bun --cwd packages/db run test
   ```
5. Commit:
   ```bash
   git add packages/db
   git commit -m "test(db): add guild query tests with isolated test DB"
   ```

---

## Phase 3 — Bot app skeleton

### Task 13: `apps/bot` scaffold

**Files:**
- Create: `apps/bot/package.json`, `tsconfig.json`
- Create dirs: `apps/bot/src/{lib,loaders,commands,events,components,jobs}`, `apps/bot/scripts/`

**Steps:**

1. `apps/bot/package.json`:
   ```json
   {
     "name": "bot",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "scripts": {
       "dev": "bun --watch src/index.ts",
       "start": "bun src/index.ts",
       "register": "bun scripts/register-commands.ts",
       "unregister": "bun scripts/delete-commands.ts",
       "test": "vitest run",
       "lint": "echo no-op",
       "check-types": "tsc --noEmit"
     },
     "dependencies": {
       "@repo/config": "*",
       "@repo/db": "*",
       "@repo/i18n": "*",
       "@repo/logger": "*",
       "croner": "^9.0.0",
       "discord.js": "^14.16.3"
     },
     "devDependencies": {
       "@repo/typescript-config": "*",
       "@types/bun": "latest",
       "typescript": "5.9.2",
       "vitest": "^2.1.8"
     }
   }
   ```
2. `apps/bot/tsconfig.json`:
   ```json
   {
     "extends": "@repo/typescript-config/base.json",
     "include": ["src", "scripts"],
     "compilerOptions": {
       "outDir": "dist",
       "types": ["bun"],
       "moduleResolution": "bundler"
     }
   }
   ```
3. Create directories and placeholders:
   ```bash
   mkdir -p apps/bot/src/{lib,loaders,commands,events,components,jobs} apps/bot/scripts
   touch apps/bot/src/lib/.gitkeep apps/bot/src/loaders/.gitkeep \
         apps/bot/src/commands/.gitkeep apps/bot/src/events/.gitkeep \
         apps/bot/src/components/.gitkeep apps/bot/src/jobs/.gitkeep
   ```
4. Install:
   ```bash
   bun install
   ```
5. Commit:
   ```bash
   git add apps/bot bun.lock
   git commit -m "feat(bot): scaffold apps/bot package"
   ```

### Task 14: Discord client

**Files:** `apps/bot/src/client.ts`

**Steps:**

1. Create:
   ```ts
   import { Client, GatewayIntentBits, Partials } from "discord.js";

   export function createClient() {
     return new Client({
       intents: [
         GatewayIntentBits.Guilds,
         GatewayIntentBits.GuildMembers,
         GatewayIntentBits.GuildMessages,
         GatewayIntentBits.MessageContent,
       ],
       partials: [Partials.GuildMember, Partials.Message],
     });
   }
   export type BotClient = ReturnType<typeof createClient>;
   ```
2. Verify:
   ```bash
   bun --cwd apps/bot run check-types
   ```
3. Commit:
   ```bash
   git add apps/bot/src/client.ts
   git commit -m "feat(bot): add createClient with default intents"
   ```

### Task 15: `define*` helpers

**Files:** `apps/bot/src/lib/{defineCommand,defineEvent,defineComponent,defineJob,types}.ts`

**Steps:**

1. `apps/bot/src/lib/types.ts`:
   ```ts
   import type {
     AutocompleteInteraction,
     ButtonInteraction,
     ChatInputCommandInteraction,
     MessageContextMenuCommandInteraction,
     ModalSubmitInteraction,
     StringSelectMenuInteraction,
     UserContextMenuCommandInteraction,
   } from "discord.js";
   import type { Locale } from "@repo/i18n";

   export interface Ctx {
     locale: Locale;
     t: (key: string, vars?: Record<string, string | number>) => string;
   }

   export type ChatCmdInteraction = ChatInputCommandInteraction;
   export type AnyContextMenuInteraction =
     | UserContextMenuCommandInteraction
     | MessageContextMenuCommandInteraction;
   export type ComponentInteraction =
     | ButtonInteraction
     | StringSelectMenuInteraction
     | ModalSubmitInteraction;
   export type { AutocompleteInteraction };
   ```
2. `apps/bot/src/lib/defineCommand.ts`:
   ```ts
   import type {
     SlashCommandBuilder,
     SlashCommandSubcommandsOnlyBuilder,
     SlashCommandOptionsOnlyBuilder,
     ContextMenuCommandBuilder,
   } from "discord.js";
   import type {
     AnyContextMenuInteraction,
     AutocompleteInteraction,
     ChatCmdInteraction,
     Ctx,
   } from "./types.js";

   export type ChatCommand = {
     kind: "chat";
     data:
       | SlashCommandBuilder
       | SlashCommandSubcommandsOnlyBuilder
       | SlashCommandOptionsOnlyBuilder;
     execute: (i: ChatCmdInteraction, ctx: Ctx) => Promise<void>;
     autocomplete?: (i: AutocompleteInteraction, ctx: Ctx) => Promise<void>;
   };
   export type ContextMenuCommand = {
     kind: "context";
     data: ContextMenuCommandBuilder;
     execute: (i: AnyContextMenuInteraction, ctx: Ctx) => Promise<void>;
   };
   export type AnyCommand = ChatCommand | ContextMenuCommand;

   export function defineCommand<T extends Omit<ChatCommand, "kind">>(cmd: T): ChatCommand;
   export function defineCommand<T extends Omit<ContextMenuCommand, "kind">>(
     cmd: T & { contextMenu: true },
   ): ContextMenuCommand;
   export function defineCommand(cmd: any): AnyCommand {
     return { kind: cmd.contextMenu ? "context" : "chat", ...cmd };
   }
   ```
3. `apps/bot/src/lib/defineEvent.ts`:
   ```ts
   import type { ClientEvents } from "discord.js";
   import type { BotClient } from "../client.js";

   export type EventDef<K extends keyof ClientEvents = keyof ClientEvents> = {
     name: K;
     once?: boolean;
     execute: (client: BotClient, ...args: ClientEvents[K]) => Promise<void> | void;
   };
   export function defineEvent<K extends keyof ClientEvents>(e: EventDef<K>): EventDef<K> {
     return e;
   }
   ```
4. `apps/bot/src/lib/defineComponent.ts`:
   ```ts
   import type { ComponentInteraction, Ctx } from "./types.js";

   export type ComponentHandler = {
     module: string;
     execute: (i: ComponentInteraction, parts: string[], ctx: Ctx) => Promise<void>;
   };
   export function defineComponent(c: ComponentHandler): ComponentHandler {
     return c;
   }
   ```
5. `apps/bot/src/lib/defineJob.ts`:
   ```ts
   import type { BotClient } from "../client.js";

   export type Job = {
     cron: string;
     shardZeroOnly?: boolean;
     run: (client: BotClient) => Promise<void> | void;
   };
   export function defineJob(j: Job): Job { return j; }
   ```
6. Verify:
   ```bash
   bun --cwd apps/bot run check-types
   ```
7. Commit:
   ```bash
   git add apps/bot/src/lib
   git commit -m "feat(bot): add define* helpers and shared types"
   ```

### Task 16: `customId` parser (TDD)

**Files:** `apps/bot/src/lib/customId.ts`, `customId.test.ts`, `apps/bot/vitest.config.ts`

**Steps:**

1. `apps/bot/vitest.config.ts`:
   ```ts
   import { defineConfig } from "vitest/config";
   export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
   ```
2. Write failing test:
   ```ts
   // apps/bot/src/lib/customId.test.ts
   import { describe, expect, it } from "vitest";
   import { buildCustomId, parseCustomId } from "./customId.js";

   describe("customId", () => {
     it("builds module:action[:arg…]", () => {
       expect(buildCustomId("settings", "save")).toBe("settings:save");
       expect(buildCustomId("settings", "pick", "locale", "sv")).toBe("settings:pick:locale:sv");
     });
     it("parses back to {module, action, args}", () => {
       expect(parseCustomId("settings:pick:locale:sv")).toEqual({
         module: "settings", action: "pick", args: ["locale", "sv"],
       });
     });
     it("rejects missing module/action", () => {
       expect(() => parseCustomId("only-one")).toThrow();
     });
     it("escapes colons in args", () => {
       expect(buildCustomId("m", "a", "a:b")).toBe("m:a:a%3Ab");
       expect(parseCustomId("m:a:a%3Ab").args).toEqual(["a:b"]);
     });
   });
   ```
3. Run — expect fail.
4. Implement:
   ```ts
   // apps/bot/src/lib/customId.ts
   export function buildCustomId(module: string, action: string, ...args: string[]): string {
     const safe = args.map((a) => a.replaceAll(":", "%3A"));
     return [module, action, ...safe].join(":");
   }

   export function parseCustomId(id: string): { module: string; action: string; args: string[] } {
     const parts = id.split(":");
     if (parts.length < 2) throw new Error(`invalid customId: ${id}`);
     const [module, action, ...rest] = parts;
     return { module, action, args: rest.map((a) => a.replaceAll("%3A", ":")) };
   }
   ```
5. Re-run — expect 4 pass.
6. Commit:
   ```bash
   git add apps/bot/src/lib apps/bot/vitest.config.ts
   git commit -m "feat(bot): add customId parser with tests"
   ```

### Task 17: errorHandler

**Files:** `apps/bot/src/lib/errorHandler.ts`

**Steps:**

1. Create:
   ```ts
   import { EmbedBuilder, type Client, type TextChannel } from "discord.js";
   import { env } from "@repo/config";
   import { createLogger } from "@repo/logger";

   const log = createLogger("bot:error");
   const recent = new Map<string, number>();
   const COOLDOWN_MS = 10_000;

   function fingerprint(err: unknown): string {
     if (err instanceof Error) return `${err.name}:${err.message}`.slice(0, 200);
     return String(err).slice(0, 200);
   }

   export async function handleError(
     err: unknown,
     ctx: { client?: Client; guildId?: string | null; userId?: string; where?: string } = {},
   ) {
     log.error({ err, ...ctx }, "handled error");
     const fp = fingerprint(err);
     const now = Date.now();
     const last = recent.get(fp) ?? 0;
     if (env.ERROR_CHANNEL_ID && ctx.client && now - last > COOLDOWN_MS) {
       recent.set(fp, now);
       try {
         const ch = (await ctx.client.channels.fetch(env.ERROR_CHANNEL_ID)) as TextChannel | null;
         if (ch?.isTextBased()) {
           const e = new EmbedBuilder()
             .setTitle("Bot error")
             .setColor(0xff5555)
             .setDescription("```" + String(err instanceof Error ? err.stack : err).slice(0, 1800) + "```")
             .addFields(
               { name: "Where", value: ctx.where ?? "unknown", inline: true },
               { name: "Guild", value: ctx.guildId ?? "—", inline: true },
               { name: "User", value: ctx.userId ?? "—", inline: true },
             );
           await ch.send({ embeds: [e] });
         }
       } catch (postErr) {
         log.error({ err: postErr }, "failed to post error embed");
       }
     }
     if (env.SENTRY_DSN) {
       try {
         const Sentry = await import("@sentry/node").catch(() => null);
         Sentry?.captureException?.(err);
       } catch {
         /* Sentry optional */
       }
     }
   }
   ```
2. Commit:
   ```bash
   git add apps/bot/src/lib/errorHandler.ts
   git commit -m "feat(bot): add error handler with logging, channel post, optional Sentry"
   ```

### Task 18: scheduler

**Files:** `apps/bot/src/lib/scheduler.ts`

**Steps:**

1. Create:
   ```ts
   import { Cron } from "croner";
   import type { BotClient } from "../client.js";
   import type { Job } from "./defineJob.js";
   import { handleError } from "./errorHandler.js";
   import { createLogger } from "@repo/logger";

   const log = createLogger("bot:scheduler");

   export function startScheduler(client: BotClient, jobs: Array<{ name: string; job: Job }>) {
     const shardId = client.shard?.ids[0] ?? 0;
     const handles: Cron[] = [];
     for (const { name, job } of jobs) {
       if ((job.shardZeroOnly ?? true) && shardId !== 0) {
         log.info({ name }, "skipping job (not shard 0)");
         continue;
       }
       const cron = new Cron(job.cron, async () => {
         try {
           await job.run(client);
           log.info({ name }, "job done");
         } catch (err) {
           await handleError(err, { client, where: `job:${name}` });
         }
       });
       handles.push(cron);
       log.info({ name, cron: job.cron, next: cron.nextRun()?.toISOString() }, "job scheduled");
     }
     return () => handles.forEach((h) => h.stop());
   }
   ```
2. Commit:
   ```bash
   git add apps/bot/src/lib/scheduler.ts
   git commit -m "feat(bot): add croner-backed scheduler with shard-0 guard"
   ```

### Task 19: Loaders

**Files:** `apps/bot/src/loaders/{commands,events,components,jobs}.ts`

**Steps:**

1. `apps/bot/src/loaders/commands.ts`:
   ```ts
   import { readdir } from "node:fs/promises";
   import { join } from "node:path";
   import { fileURLToPath } from "node:url";
   import type { AnyCommand } from "../lib/defineCommand.js";

   export async function loadCommands(): Promise<Map<string, AnyCommand>> {
     const dir = fileURLToPath(new URL("../commands/", import.meta.url));
     const files = (await readdir(dir)).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".test.ts"));
     const map = new Map<string, AnyCommand>();
     for (const f of files) {
       const mod = (await import(join(dir, f))) as { default: AnyCommand };
       map.set(mod.default.data.name, mod.default);
     }
     return map;
   }
   ```
2. `apps/bot/src/loaders/events.ts`:
   ```ts
   import { readdir } from "node:fs/promises";
   import { join } from "node:path";
   import { fileURLToPath } from "node:url";
   import type { BotClient } from "../client.js";
   import type { EventDef } from "../lib/defineEvent.js";
   import { handleError } from "../lib/errorHandler.js";

   export async function loadEvents(client: BotClient): Promise<void> {
     const dir = fileURLToPath(new URL("../events/", import.meta.url));
     const files = (await readdir(dir)).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".test.ts"));
     for (const f of files) {
       const mod = (await import(join(dir, f))) as { default: EventDef };
       const handler = async (...args: unknown[]) => {
         try { await mod.default.execute(client, ...(args as never)); }
         catch (err) { await handleError(err, { client, where: `event:${String(mod.default.name)}` }); }
       };
       if (mod.default.once) client.once(mod.default.name, handler);
       else client.on(mod.default.name, handler);
     }
   }
   ```
3. `apps/bot/src/loaders/components.ts`:
   ```ts
   import { readdir } from "node:fs/promises";
   import { join } from "node:path";
   import { fileURLToPath } from "node:url";
   import type { ComponentHandler } from "../lib/defineComponent.js";

   export async function loadComponents(): Promise<Map<string, ComponentHandler>> {
     const dir = fileURLToPath(new URL("../components/", import.meta.url));
     const files = (await readdir(dir)).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".test.ts"));
     const map = new Map<string, ComponentHandler>();
     for (const f of files) {
       const mod = (await import(join(dir, f))) as { default: ComponentHandler };
       map.set(mod.default.module, mod.default);
     }
     return map;
   }
   ```
4. `apps/bot/src/loaders/jobs.ts`:
   ```ts
   import { readdir } from "node:fs/promises";
   import { join, basename, extname } from "node:path";
   import { fileURLToPath } from "node:url";
   import type { Job } from "../lib/defineJob.js";

   export async function loadJobs(): Promise<Array<{ name: string; job: Job }>> {
     const dir = fileURLToPath(new URL("../jobs/", import.meta.url));
     const files = (await readdir(dir)).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".test.ts"));
     const jobs: Array<{ name: string; job: Job }> = [];
     for (const f of files) {
       const mod = (await import(join(dir, f))) as { default: Job };
       jobs.push({ name: basename(f, extname(f)), job: mod.default });
     }
     return jobs;
   }
   ```
5. Verify:
   ```bash
   bun --cwd apps/bot run check-types
   ```
6. Commit:
   ```bash
   git add apps/bot/src/loaders
   git commit -m "feat(bot): add file-based loaders for commands, events, components, jobs"
   ```

---

## Phase 4 — Bot reference examples

### Task 20: `/ping` command + test (TDD)

**Files:** `apps/bot/src/commands/ping.ts`, `ping.test.ts`

**Steps:**

1. Write failing test:
   ```ts
   // apps/bot/src/commands/ping.test.ts
   import { describe, expect, it, vi } from "vitest";
   import command from "./ping.js";

   function stub() {
     return {
       client: { ws: { ping: 42 } },
       reply: vi.fn().mockResolvedValue(undefined),
     };
   }

   describe("/ping", () => {
     it("registers as 'ping'", () => { expect(command.data.name).toBe("ping"); });
     it("replies with latency-rendered template", async () => {
       const i = stub();
       const ctx = { locale: "en" as const, t: (_: string, v?: any) => `Pong! (${v?.latency}ms)` };
       await (command as any).execute(i, ctx);
       expect(i.reply).toHaveBeenCalledWith({ content: "Pong! (42ms)", ephemeral: true });
     });
   });
   ```
2. Run — expect fail.
3. Implement:
   ```ts
   // apps/bot/src/commands/ping.ts
   import { SlashCommandBuilder } from "discord.js";
   import { defineCommand } from "../lib/defineCommand.js";

   export default defineCommand({
     data: new SlashCommandBuilder()
       .setName("ping")
       .setDescription("Replies with bot latency.")
       .setNameLocalizations({ sv: "ping" })
       .setDescriptionLocalizations({ sv: "Svarar med botens latens." }),
     async execute(i, ctx) {
       const latency = i.client.ws.ping;
       await i.reply({ content: ctx.t("ping.reply", { latency }), ephemeral: true });
     },
   });
   ```
4. Run — expect pass:
   ```bash
   bun --cwd apps/bot run test
   ```
5. Commit:
   ```bash
   git add apps/bot/src/commands/ping.ts apps/bot/src/commands/ping.test.ts
   git commit -m "feat(bot): add /ping command with test"
   ```

### Task 21: `Report message` context menu command

**Files:** `apps/bot/src/commands/report.ts`

**Steps:**

1. Create:
   ```ts
   import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
   import { defineCommand } from "../lib/defineCommand.js";

   export default defineCommand({
     contextMenu: true,
     data: new ContextMenuCommandBuilder()
       .setName("Report message")
       .setType(ApplicationCommandType.Message),
     async execute(i) {
       if (!i.isMessageContextMenuCommand()) return;
       await i.reply({
         content: `Thanks — moderators have been notified about [this message](${i.targetMessage.url}).`,
         ephemeral: true,
       });
     },
   });
   ```
2. Commit:
   ```bash
   git add apps/bot/src/commands/report.ts
   git commit -m "feat(bot): add 'Report message' context menu command"
   ```

### Task 22: `/settings` (subcommands + autocomplete)

**Files:** `apps/bot/src/commands/settings.ts`

**Steps:**

1. Create:
   ```ts
   import {
     ActionRowBuilder,
     ButtonBuilder,
     ButtonStyle,
     PermissionFlagsBits,
     SlashCommandBuilder,
     StringSelectMenuBuilder,
   } from "discord.js";
   import { getGuild, updateGuildSettings, upsertGuild } from "@repo/db";
   import { defineCommand } from "../lib/defineCommand.js";
   import { buildCustomId } from "../lib/customId.js";

   const LOCALES = [
     { name: "English", value: "en" },
     { name: "Svenska", value: "sv" },
   ];

   export default defineCommand({
     data: new SlashCommandBuilder()
       .setName("settings")
       .setDescription("Configure the bot for this server.")
       .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
       .setDMPermission(false)
       .addSubcommand((s) => s.setName("show").setDescription("Show current settings"))
       .addSubcommand((s) =>
         s.setName("locale")
           .setDescription("Set the server locale")
           .addStringOption((o) =>
             o.setName("value").setDescription("Locale").setRequired(true).setAutocomplete(true),
           ),
       )
       .addSubcommand((s) =>
         s.setName("welcome")
           .setDescription("Set the welcome message")
           .addStringOption((o) =>
             o.setName("message").setDescription("Welcome text").setRequired(true),
           ),
       ),

     async execute(i, ctx) {
       if (!i.guildId) return;
       await upsertGuild(i.guildId);
       const sub = i.options.getSubcommand();
       if (sub === "show") {
         const g = await getGuild(i.guildId);
         const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
           new StringSelectMenuBuilder()
             .setCustomId(buildCustomId("settings", "pick", "locale"))
             .setPlaceholder(`Locale: ${g?.locale ?? "en"}`)
             .addOptions(LOCALES.map((l) => ({ label: l.name, value: l.value }))),
         );
         const btns = new ActionRowBuilder<ButtonBuilder>().addComponents(
           new ButtonBuilder()
             .setCustomId(buildCustomId("settings", "clear", "welcome"))
             .setLabel("Clear welcome message")
             .setStyle(ButtonStyle.Secondary),
         );
         await i.reply({
           ephemeral: true,
           content: [
             `**${ctx.t("settings.title")}**`,
             `Locale: \`${g?.locale ?? "en"}\``,
             `Welcome: ${g?.settings?.welcomeMessage ? `\`${g.settings.welcomeMessage}\`` : "_(unset)_"}`,
           ].join("\n"),
           components: [row, btns],
         });
         return;
       }
       if (sub === "locale") {
         const value = i.options.getString("value", true);
         await updateGuildSettings(i.guildId, { locale: value });
         await i.reply({ content: ctx.t("settings.localeChanged", { locale: value }), ephemeral: true });
         return;
       }
       if (sub === "welcome") {
         const message = i.options.getString("message", true);
         await updateGuildSettings(i.guildId, { welcomeMessage: message });
         await i.reply({ content: ctx.t("settings.welcomeUpdated"), ephemeral: true });
       }
     },

     async autocomplete(i) {
       const focused = i.options.getFocused();
       const filtered = LOCALES.filter((l) =>
         l.name.toLowerCase().includes(focused.toLowerCase()),
       ).slice(0, 25);
       await i.respond(filtered);
     },
   });
   ```
2. Commit:
   ```bash
   git add apps/bot/src/commands/settings.ts
   git commit -m "feat(bot): add /settings with subcommands, autocomplete, components"
   ```

### Task 23: settings component handler

**Files:** `apps/bot/src/components/settings.ts`

**Steps:**

1. Create:
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
         await updateGuildSettings(i.guildId, { locale: value });
         await i.update({
           content: ctx.t("settings.localeChanged", { locale: value }),
           components: [],
         });
         return;
       }
       if (action === "clear" && target === "welcome") {
         await updateGuildSettings(i.guildId, { welcomeMessage: "" });
         await i.update({ content: "Welcome message cleared.", components: [] });
       }
     },
   });
   ```
2. Commit:
   ```bash
   git add apps/bot/src/components/settings.ts
   git commit -m "feat(bot): add settings component handler"
   ```

### Task 24: ready + guildCreate events

**Files:** `apps/bot/src/events/{ready,guildCreate}.ts`

**Steps:**

1. `apps/bot/src/events/ready.ts`:
   ```ts
   import { Events } from "discord.js";
   import { createLogger } from "@repo/logger";
   import { defineEvent } from "../lib/defineEvent.js";

   const log = createLogger("bot:ready");

   export default defineEvent({
     name: Events.ClientReady,
     once: true,
     execute(_client, ready) {
       log.info({ tag: ready.user.tag, guilds: ready.guilds.cache.size }, "ready");
     },
   });
   ```
2. `apps/bot/src/events/guildCreate.ts`:
   ```ts
   import { Events } from "discord.js";
   import { upsertGuild } from "@repo/db";
   import { defineEvent } from "../lib/defineEvent.js";
   import { createLogger } from "@repo/logger";

   const log = createLogger("bot:guildCreate");

   export default defineEvent({
     name: Events.GuildCreate,
     async execute(_client, guild) {
       await upsertGuild(guild.id);
       log.info({ id: guild.id, name: guild.name }, "joined guild");
     },
   });
   ```
3. Commit:
   ```bash
   git add apps/bot/src/events
   git commit -m "feat(bot): add ready and guildCreate events"
   ```

### Task 25: interactionCreate dispatcher

**Files:** `apps/bot/src/events/interactionCreate.ts`

**Steps:**

1. Create:
   ```ts
   import { Events, MessageFlags } from "discord.js";
   import { type Locale, t } from "@repo/i18n";
   import { getGuild } from "@repo/db";
   import { defineEvent } from "../lib/defineEvent.js";
   import { handleError } from "../lib/errorHandler.js";
   import { parseCustomId } from "../lib/customId.js";
   import type { AnyCommand } from "../lib/defineCommand.js";
   import type { ComponentHandler } from "../lib/defineComponent.js";

   export const registries = {
     commands: new Map<string, AnyCommand>(),
     components: new Map<string, ComponentHandler>(),
   };

   async function resolveLocale(guildId: string | null, fallback: string): Promise<Locale> {
     if (!guildId) return (fallback as Locale) ?? "en";
     const g = await getGuild(guildId);
     return ((g?.locale ?? fallback) as Locale) ?? "en";
   }

   export default defineEvent({
     name: Events.InteractionCreate,
     async execute(client, i) {
       const locale = await resolveLocale(i.guildId, i.locale);
       const ctx = {
         locale,
         t: (k: string, v?: Record<string, string | number>) => t(locale, k as never, v),
       };
       try {
         if (i.isAutocomplete()) {
           const cmd = registries.commands.get(i.commandName);
           if (cmd?.kind === "chat" && cmd.autocomplete) await cmd.autocomplete(i, ctx);
           return;
         }
         if (i.isChatInputCommand() || i.isContextMenuCommand()) {
           const cmd = registries.commands.get(i.commandName);
           if (!cmd) return;
           await cmd.execute(i as never, ctx);
           return;
         }
         if (i.isMessageComponent() || i.isModalSubmit()) {
           const { module, action, args } = parseCustomId(i.customId);
           const handler = registries.components.get(module);
           if (!handler) return;
           await handler.execute(i, [action, ...args], ctx);
         }
       } catch (err) {
         await handleError(err, {
           client,
           guildId: i.guildId,
           userId: i.user?.id,
           where: `interaction:${i.type}`,
         });
         if (i.isRepliable() && !i.replied && !i.deferred) {
           await i.reply({ content: ctx.t("errors.unknown"), flags: MessageFlags.Ephemeral }).catch(() => {});
         }
       }
     },
   });
   ```
2. Commit:
   ```bash
   git add apps/bot/src/events/interactionCreate.ts
   git commit -m "feat(bot): add interactionCreate dispatcher"
   ```

### Task 26: cleanup job

**Files:** `apps/bot/src/jobs/cleanup.ts`

**Steps:**

1. Create:
   ```ts
   import { defineJob } from "../lib/defineJob.js";
   import { createLogger } from "@repo/logger";

   const log = createLogger("bot:job:cleanup");

   export default defineJob({
     cron: "0 4 * * *",
     shardZeroOnly: true,
     async run() {
       log.info("cleanup job ran (no-op)");
     },
   });
   ```
2. Commit:
   ```bash
   git add apps/bot/src/jobs/cleanup.ts
   git commit -m "feat(bot): add example cleanup cron job"
   ```

### Task 27: Bot entrypoint

**Files:** `apps/bot/src/index.ts`

**Steps:**

1. Create:
   ```ts
   import { env } from "@repo/config";
   import { createLogger } from "@repo/logger";
   import { createClient } from "./client.js";
   import { handleError } from "./lib/errorHandler.js";
   import { loadCommands } from "./loaders/commands.js";
   import { loadComponents } from "./loaders/components.js";
   import { loadEvents } from "./loaders/events.js";
   import { loadJobs } from "./loaders/jobs.js";
   import { registries } from "./events/interactionCreate.js";
   import { startScheduler } from "./lib/scheduler.js";

   const log = createLogger("bot:main");

   async function main() {
     const client = createClient();
     registries.commands = await loadCommands();
     registries.components = await loadComponents();
     await loadEvents(client);
     const jobs = await loadJobs();
     client.once("ready", () => { startScheduler(client, jobs); });
     process.on("unhandledRejection", (err) => void handleError(err, { client, where: "unhandledRejection" }));
     process.on("uncaughtException", (err) => void handleError(err, { client, where: "uncaughtException" }));
     await client.login(env.DISCORD_TOKEN);
     log.info("logged in");
   }

   void main();
   ```
2. Type-check:
   ```bash
   bun --cwd apps/bot run check-types
   ```
3. Smoke boot (requires real Discord creds in `.env`):
   ```bash
   bun --cwd apps/bot run dev
   ```
   Expected (real creds): "logged in" + "ready" log lines, then Ctrl-C.
   Expected (no creds): Zod env error — confirms env parsing works.
4. Commit:
   ```bash
   git add apps/bot/src/index.ts
   git commit -m "feat(bot): wire up entrypoint with loaders, dispatcher, scheduler"
   ```

### Task 28: register / unregister scripts

**Files:** `apps/bot/scripts/{register-commands,delete-commands}.ts`

**Steps:**

1. `apps/bot/scripts/register-commands.ts`:
   ```ts
   import { REST, Routes } from "discord.js";
   import { env } from "@repo/config";
   import { createLogger } from "@repo/logger";
   import { loadCommands } from "../src/loaders/commands.js";

   const log = createLogger("bot:register");
   const args = process.argv.slice(2);
   const gIdx = args.findIndex((a) => a === "--guild");
   const guildId = gIdx >= 0 ? args[gIdx + 1] : env.DEV_GUILD_ID;

   const commands = await loadCommands();
   const body = [...commands.values()].map((c) => c.data.toJSON());
   const rest = new REST().setToken(env.DISCORD_TOKEN);

   if (guildId) {
     await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId), { body });
     log.info({ count: body.length, guildId }, "registered (guild)");
   } else {
     await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
     log.info({ count: body.length }, "registered (global)");
   }
   process.exit(0);
   ```
2. `apps/bot/scripts/delete-commands.ts`:
   ```ts
   import { REST, Routes } from "discord.js";
   import { env } from "@repo/config";
   import { createLogger } from "@repo/logger";

   const log = createLogger("bot:unregister");
   const args = process.argv.slice(2);
   const gIdx = args.findIndex((a) => a === "--guild");
   const guildId = gIdx >= 0 ? args[gIdx + 1] : env.DEV_GUILD_ID;

   const rest = new REST().setToken(env.DISCORD_TOKEN);
   if (guildId) {
     await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId), { body: [] });
     log.info({ guildId }, "cleared guild commands");
   } else {
     await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: [] });
     log.info("cleared global commands");
   }
   process.exit(0);
   ```
3. Commit:
   ```bash
   git add apps/bot/scripts
   git commit -m "feat(bot): add command register/unregister scripts"
   ```

### Task 29: Sharding entry

**Files:** `apps/bot/src/sharding.ts`

**Steps:**

1. Create:
   ```ts
   import { ShardingManager } from "discord.js";
   import { fileURLToPath } from "node:url";
   import { env } from "@repo/config";
   import { createLogger } from "@repo/logger";

   const log = createLogger("bot:shard");
   const file = fileURLToPath(new URL("./index.ts", import.meta.url));
   const manager = new ShardingManager(file, {
     token: env.DISCORD_TOKEN,
     execArgv: ["--enable-source-maps"],
     mode: "process",
   });
   manager.on("shardCreate", (s) => log.info({ id: s.id }, "shard spawned"));
   await manager.spawn();
   ```
2. Commit:
   ```bash
   git add apps/bot/src/sharding.ts
   git commit -m "feat(bot): add ShardingManager entrypoint (opt-in)"
   ```

---

## Phase 5 — Dashboard

### Task 30: `apps/dashboard` scaffold

**Files:**
- Create: `apps/dashboard/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
- Create: `apps/dashboard/src/app/{layout,page}.tsx`, `globals.css`

**Steps:**

1. `apps/dashboard/package.json`:
   ```json
   {
     "name": "dashboard",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "scripts": {
       "dev": "next dev --turbopack -p 3000",
       "start": "next start -p 3000",
       "build": "next build",
       "test": "vitest run",
       "lint": "next lint",
       "check-types": "tsc --noEmit"
     },
     "dependencies": {
       "@auth/drizzle-adapter": "^1.7.4",
       "@repo/config": "*",
       "@repo/db": "*",
       "@repo/i18n": "*",
       "@repo/logger": "*",
       "@repo/ui": "*",
       "next": "15.1.6",
       "next-auth": "5.0.0-beta.25",
       "react": "19.0.0",
       "react-dom": "19.0.0",
       "zod": "^3.23.8"
     },
     "devDependencies": {
       "@repo/typescript-config": "*",
       "@tailwindcss/postcss": "^4.0.0",
       "@types/node": "^22.10.0",
       "@types/react": "19.0.0",
       "@types/react-dom": "19.0.0",
       "tailwindcss": "^4.0.0",
       "typescript": "5.9.2",
       "vitest": "^2.1.8"
     }
   }
   ```
2. `apps/dashboard/tsconfig.json`:
   ```json
   {
     "extends": "@repo/typescript-config/base.json",
     "include": ["next-env.d.ts", "src/**/*", ".next/types/**/*.ts"],
     "exclude": ["node_modules"],
     "compilerOptions": {
       "jsx": "preserve",
       "allowJs": true,
       "incremental": true,
       "moduleResolution": "bundler",
       "plugins": [{ "name": "next" }],
       "paths": { "@/*": ["./src/*"] }
     }
   }
   ```
3. `apps/dashboard/next.config.ts`:
   ```ts
   import type { NextConfig } from "next";
   const config: NextConfig = {
     transpilePackages: ["@repo/db", "@repo/config", "@repo/i18n", "@repo/logger", "@repo/ui"],
   };
   export default config;
   ```
4. `apps/dashboard/postcss.config.mjs`:
   ```js
   export default { plugins: { "@tailwindcss/postcss": {} } };
   ```
5. `apps/dashboard/src/app/globals.css`:
   ```css
   @import "tailwindcss";
   ```
6. `apps/dashboard/src/app/layout.tsx`:
   ```tsx
   import "./globals.css";
   import type { ReactNode } from "react";

   export const metadata = { title: "Bot Dashboard" };

   export default function RootLayout({ children }: { children: ReactNode }) {
     return (
       <html lang="en">
         <body className="bg-zinc-950 text-zinc-50 min-h-dvh">{children}</body>
       </html>
     );
   }
   ```
7. `apps/dashboard/src/app/page.tsx`:
   ```tsx
   import Link from "next/link";
   export default function Home() {
     return (
       <main className="mx-auto max-w-3xl px-6 py-20">
         <h1 className="text-4xl font-semibold">Bot Dashboard</h1>
         <p className="mt-4 text-zinc-400">Sign in with Discord to configure your servers.</p>
         <Link
           href="/login"
           className="mt-8 inline-flex rounded-md bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400"
         >
           Sign in
         </Link>
       </main>
     );
   }
   ```
8. Install + verify:
   ```bash
   bun install
   bun --cwd apps/dashboard run check-types
   bun --cwd apps/dashboard run build
   ```
9. Commit:
   ```bash
   git add apps/dashboard bun.lock
   git commit -m "feat(dashboard): scaffold Next.js 15 + Tailwind v4"
   ```

### Task 31: shadcn/ui init + base components

**Files:**
- Modify: `packages/ui/package.json`
- Create: `packages/ui/src/styles.css`, `packages/ui/src/lib/cn.ts`
- Create: components via shadcn CLI (or hand-write minimal versions)

**Steps:**

1. Install shadcn/ui deps in `packages/ui`:
   ```bash
   bun add -W class-variance-authority clsx tailwind-merge --filter @repo/ui
   bun add -W -d @types/react@19.0.0 react@19.0.0 --filter @repo/ui
   ```
2. `packages/ui/src/lib/cn.ts`:
   ```ts
   import { clsx, type ClassValue } from "clsx";
   import { twMerge } from "tailwind-merge";
   export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
   ```
3. `packages/ui/src/styles.css`:
   ```css
   @import "tailwindcss";
   ```
4. `packages/ui/src/components/button.tsx` (minimal shadcn-style Button — paste from https://ui.shadcn.com/docs/components/button "Manual" tab):
   ```tsx
   import { Slot } from "@radix-ui/react-slot";
   import { cva, type VariantProps } from "class-variance-authority";
   import * as React from "react";
   import { cn } from "../lib/cn.js";

   const buttonVariants = cva(
     "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50",
     {
       variants: {
         variant: {
           default: "bg-indigo-500 text-white hover:bg-indigo-400",
           outline: "border border-zinc-800 hover:bg-zinc-900",
           ghost: "hover:bg-zinc-900",
         },
         size: { sm: "h-8 px-3", md: "h-9 px-4", lg: "h-10 px-6" },
       },
       defaultVariants: { variant: "default", size: "md" },
     },
   );

   export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
     VariantProps<typeof buttonVariants> & { asChild?: boolean };

   export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
     ({ className, variant, size, asChild, ...props }, ref) => {
       const Comp = asChild ? Slot : "button";
       return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
     },
   );
   Button.displayName = "Button";
   ```
5. Add `@radix-ui/react-slot` dep:
   ```bash
   bun add -W @radix-ui/react-slot --filter @repo/ui
   ```
6. Repeat the manual-component pattern from shadcn docs for: `input.tsx`, `label.tsx`, `card.tsx`, `select.tsx`, `form.tsx` (uses `react-hook-form` — add deps `react-hook-form @hookform/resolvers @radix-ui/react-label @radix-ui/react-select`). Keep code lifted directly from shadcn docs.
7. `packages/ui/src/index.ts`:
   ```ts
   export * from "./components/button.js";
   export * from "./components/input.js";
   export * from "./components/label.js";
   export * from "./components/card.js";
   export * from "./components/select.js";
   export * from "./components/form.js";
   export { cn } from "./lib/cn.js";
   ```
8. Wire `@repo/ui/styles.css` into the dashboard — add to `apps/dashboard/src/app/globals.css`:
   ```css
   @import "tailwindcss";
   @source "../../../../packages/ui/src/**/*.{ts,tsx}";
   ```
9. Verify dashboard still builds:
   ```bash
   bun install
   bun --cwd apps/dashboard run build
   ```
10. Commit:
    ```bash
    git add packages/ui apps/dashboard bun.lock
    git commit -m "feat(ui): add shadcn/ui base components (Button, Input, Label, Card, Select, Form)"
    ```

### Task 32: Auth.js v5 + Discord provider + Drizzle adapter

**Files:**
- Create: `apps/dashboard/src/auth.ts`
- Create: `apps/dashboard/src/middleware.ts`
- Create: `apps/dashboard/src/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/dashboard/src/app/login/page.tsx`

**Steps:**

1. `apps/dashboard/src/auth.ts`:
   ```ts
   import NextAuth from "next-auth";
   import Discord from "next-auth/providers/discord";
   import { DrizzleAdapter } from "@auth/drizzle-adapter";
   import { db, schema } from "@repo/db";
   import { env } from "@repo/config";

   export const { auth, handlers, signIn, signOut } = NextAuth({
     adapter: DrizzleAdapter(db, {
       usersTable: schema.authUsers,
       accountsTable: schema.accounts,
       sessionsTable: schema.sessions,
       verificationTokensTable: schema.verificationTokens,
     }),
     providers: [
       Discord({
         clientId: env.DISCORD_CLIENT_ID,
         clientSecret: env.DISCORD_CLIENT_SECRET!,
         authorization: { params: { scope: "identify guilds" } },
       }),
     ],
     callbacks: {
       async session({ session, user }) {
         (session.user as { id?: string }).id = user.id;
         return session;
       },
     },
     session: { strategy: "database" },
   });
   ```
2. `apps/dashboard/src/app/api/auth/[...nextauth]/route.ts`:
   ```ts
   import { handlers } from "@/auth";
   export const { GET, POST } = handlers;
   ```
3. `apps/dashboard/src/app/login/page.tsx`:
   ```tsx
   import { signIn } from "@/auth";
   import { Button } from "@repo/ui/components/button";

   export default function Login() {
     return (
       <main className="mx-auto max-w-md px-6 py-20">
         <h1 className="text-3xl font-semibold">Sign in</h1>
         <form
           action={async () => {
             "use server";
             await signIn("discord", { redirectTo: "/guilds" });
           }}
         >
           <Button className="mt-6">Continue with Discord</Button>
         </form>
       </main>
     );
   }
   ```
4. `apps/dashboard/src/middleware.ts`:
   ```ts
   export { auth as middleware } from "@/auth";
   export const config = { matcher: ["/guilds/:path*"] };
   ```
5. Verify build:
   ```bash
   bun --cwd apps/dashboard run build
   ```
6. Commit:
   ```bash
   git add apps/dashboard
   git commit -m "feat(dashboard): add Auth.js v5 with Discord OAuth and Drizzle adapter"
   ```

### Task 33: Discord guild fetch + guards

**Files:** `apps/dashboard/src/lib/{discord,guards}.ts`

**Steps:**

1. `apps/dashboard/src/lib/discord.ts`:
   ```ts
   import { db, schema } from "@repo/db";
   import { eq } from "drizzle-orm";

   const MANAGE_GUILD = 0x20n;

   export type GuildSummary = {
     id: string;
     name: string;
     icon: string | null;
     botPresent: boolean;
     canManage: boolean;
   };

   async function getDiscordToken(userId: string): Promise<string | null> {
     const row = await db.query.accounts.findFirst({
       where: eq(schema.accounts.userId, userId),
     });
     return row?.access_token ?? null;
   }

   export async function listAdminGuilds(userId: string): Promise<GuildSummary[]> {
     const token = await getDiscordToken(userId);
     if (!token) return [];
     const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
       headers: { Authorization: `Bearer ${token}` },
       next: { revalidate: 30 },
     });
     if (!res.ok) return [];
     const raw = (await res.json()) as Array<{
       id: string; name: string; icon: string | null; permissions: string;
     }>;
     const present = new Set(
       (await db.select({ id: schema.guilds.id }).from(schema.guilds)).map((g) => g.id),
     );
     return raw
       .filter((g) => (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD)
       .map((g) => ({
         id: g.id,
         name: g.name,
         icon: g.icon,
         botPresent: present.has(g.id),
         canManage: true,
       }));
   }
   ```
2. `apps/dashboard/src/lib/guards.ts`:
   ```ts
   import { redirect } from "next/navigation";
   import { auth } from "@/auth";
   import { listAdminGuilds } from "./discord.js";

   export async function requireUser() {
     const session = await auth();
     if (!session?.user) redirect("/login");
     return session;
   }

   export async function requireGuildAdmin(guildId: string) {
     const session = await requireUser();
     const userId = (session.user as { id: string }).id;
     const guilds = await listAdminGuilds(userId);
     const guild = guilds.find((g) => g.id === guildId);
     if (!guild?.canManage) redirect("/guilds");
     return { session, guild };
   }
   ```
3. Commit:
   ```bash
   git add apps/dashboard/src/lib
   git commit -m "feat(dashboard): add Discord guild fetcher and route guards"
   ```

### Task 34: Guilds list page

**Files:** `apps/dashboard/src/app/(app)/layout.tsx`, `apps/dashboard/src/app/guilds/page.tsx`

**Steps:**

1. `apps/dashboard/src/app/(app)/layout.tsx`:
   ```tsx
   import type { ReactNode } from "react";
   import { requireUser } from "@/lib/guards";
   export default async function AppLayout({ children }: { children: ReactNode }) {
     await requireUser();
     return <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>;
   }
   ```
2. `apps/dashboard/src/app/guilds/page.tsx`:
   ```tsx
   import Link from "next/link";
   import { env } from "@repo/config";
   import { Button } from "@repo/ui/components/button";
   import { requireUser } from "@/lib/guards";
   import { listAdminGuilds } from "@/lib/discord";

   export default async function GuildsPage() {
     const session = await requireUser();
     const guilds = await listAdminGuilds((session.user as { id: string }).id);
     return (
       <main>
         <h1 className="text-3xl font-semibold">Your servers</h1>
         <ul className="mt-8 grid gap-3">
           {guilds.map((g) => (
             <li key={g.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3">
               <div className="flex items-center gap-3">
                 <div className="size-8 rounded bg-zinc-800" />
                 <span className="font-medium">{g.name}</span>
               </div>
               {g.botPresent ? (
                 <Button asChild size="sm"><Link href={`/guilds/${g.id}/settings`}>Manage</Link></Button>
               ) : (
                 <Button asChild size="sm" variant="outline">
                   <a href={`https://discord.com/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&permissions=8&scope=bot+applications.commands&guild_id=${g.id}`}>
                     Invite bot
                   </a>
                 </Button>
               )}
             </li>
           ))}
         </ul>
       </main>
     );
   }
   ```
3. Commit:
   ```bash
   git add apps/dashboard/src/app
   git commit -m "feat(dashboard): add guilds list page"
   ```

### Task 35: Guild settings page + server action

**Files:**
- Create: `apps/dashboard/src/app/guilds/[id]/settings/page.tsx`
- Create: `apps/dashboard/src/actions/settings.ts`

**Steps:**

1. `apps/dashboard/src/actions/settings.ts`:
   ```ts
   "use server";
   import { revalidatePath } from "next/cache";
   import { z } from "zod";
   import { updateGuildSettings, upsertGuild } from "@repo/db";
   import { requireGuildAdmin } from "@/lib/guards";

   const Input = z.object({
     guildId: z.string().min(1),
     locale: z.enum(["en", "sv"]),
     welcomeMessage: z.string().max(500).default(""),
   });

   export async function saveGuildSettings(formData: FormData) {
     const parsed = Input.parse({
       guildId: formData.get("guildId"),
       locale: formData.get("locale"),
       welcomeMessage: formData.get("welcomeMessage") ?? "",
     });
     await requireGuildAdmin(parsed.guildId);
     await upsertGuild(parsed.guildId);
     await updateGuildSettings(parsed.guildId, {
       locale: parsed.locale,
       welcomeMessage: parsed.welcomeMessage,
     });
     revalidatePath(`/guilds/${parsed.guildId}/settings`);
   }
   ```
2. `apps/dashboard/src/app/guilds/[id]/settings/page.tsx`:
   ```tsx
   import { getGuild, upsertGuild } from "@repo/db";
   import { Button } from "@repo/ui/components/button";
   import { requireGuildAdmin } from "@/lib/guards";
   import { saveGuildSettings } from "@/actions/settings";

   export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     await requireGuildAdmin(id);
     await upsertGuild(id);
     const g = await getGuild(id);

     return (
       <main>
         <h1 className="text-3xl font-semibold">Settings</h1>
         <form action={saveGuildSettings} className="mt-8 grid gap-4 max-w-lg">
           <input type="hidden" name="guildId" value={id} />
           <label className="grid gap-1">
             <span className="text-sm text-zinc-400">Locale</span>
             <select
               name="locale"
               defaultValue={g?.locale ?? "en"}
               className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
             >
               <option value="en">English</option>
               <option value="sv">Svenska</option>
             </select>
           </label>
           <label className="grid gap-1">
             <span className="text-sm text-zinc-400">Welcome message</span>
             <textarea
               name="welcomeMessage"
               defaultValue={g?.settings?.welcomeMessage ?? ""}
               rows={3}
               className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
             />
           </label>
           <Button type="submit" className="justify-self-start">Save</Button>
         </form>
       </main>
     );
   }
   ```
3. Verify build:
   ```bash
   bun --cwd apps/dashboard run build
   ```
4. Commit:
   ```bash
   git add apps/dashboard
   git commit -m "feat(dashboard): add guild settings page and server action"
   ```

### Task 36: Server-action test

**Files:**
- Create: `apps/dashboard/vitest.config.ts`, `src/test-setup.ts`, `src/actions/settings.test.ts`

**Steps:**

1. `apps/dashboard/vitest.config.ts`:
   ```ts
   import { defineConfig } from "vitest/config";
   export default defineConfig({
     test: {
       include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
       environment: "node",
       setupFiles: ["./src/test-setup.ts"],
     },
     resolve: { alias: { "@": new URL("./src/", import.meta.url).pathname } },
   });
   ```
2. `apps/dashboard/src/test-setup.ts` (bypass auth in tests):
   ```ts
   import { vi } from "vitest";
   vi.mock("@/lib/guards", () => ({
     requireUser: async () => ({ user: { id: "test-user" } }),
     requireGuildAdmin: async (id: string) => ({
       session: { user: { id: "test-user" } },
       guild: { id, name: "T", icon: null, botPresent: true, canManage: true },
     }),
   }));
   ```
3. Write the test:
   ```ts
   // apps/dashboard/src/actions/settings.test.ts
   import { beforeEach, describe, expect, it } from "vitest";
   import { db, guilds } from "@repo/db";
   import { saveGuildSettings } from "./settings.js";

   describe("saveGuildSettings", () => {
     beforeEach(async () => { await db.delete(guilds); });

     it("persists locale and welcome message", async () => {
       const fd = new FormData();
       fd.set("guildId", "g1");
       fd.set("locale", "sv");
       fd.set("welcomeMessage", "Welcome friend");
       await saveGuildSettings(fd);
       const row = await db.query.guilds.findFirst({ where: (g, { eq }) => eq(g.id, "g1") });
       expect(row?.locale).toBe("sv");
       expect(row?.settings).toMatchObject({ welcomeMessage: "Welcome friend" });
     });

     it("rejects invalid locale via Zod", async () => {
       const fd = new FormData();
       fd.set("guildId", "g2");
       fd.set("locale", "fr");
       fd.set("welcomeMessage", "x");
       await expect(saveGuildSettings(fd)).rejects.toThrow();
     });
   });
   ```
4. Run — expect 2 pass:
   ```bash
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot_test \
     DISCORD_TOKEN=test DISCORD_CLIENT_ID=test \
     bun --cwd apps/dashboard run test
   ```
5. Commit:
   ```bash
   git add apps/dashboard
   git commit -m "test(dashboard): add saveGuildSettings server action tests"
   ```

---

## Phase 6 — Docker, deploy hooks, README

### Task 37: Bot Dockerfile

**Files:** `apps/bot/Dockerfile`, `.dockerignore`

**Steps:**

1. `apps/bot/.dockerignore`:
   ```
   node_modules
   .turbo
   .next
   dist
   .env*
   ```
2. `apps/bot/Dockerfile`:
   ```dockerfile
   # syntax=docker/dockerfile:1.7
   FROM oven/bun:1-alpine AS deps
   WORKDIR /repo
   COPY package.json bun.lock turbo.json ./
   COPY apps/bot/package.json apps/bot/
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
   ```
3. Verify:
   ```bash
   docker build -f apps/bot/Dockerfile -t bot-template:bot .
   ```
4. Commit:
   ```bash
   git add apps/bot/Dockerfile apps/bot/.dockerignore
   git commit -m "feat(bot): add Dockerfile"
   ```

### Task 38: Dashboard Dockerfile + /api/health

**Files:** `apps/dashboard/Dockerfile`, `.dockerignore`, `src/app/api/health/route.ts`

**Steps:**

1. `apps/dashboard/src/app/api/health/route.ts`:
   ```ts
   export const dynamic = "force-dynamic";
   export function GET() { return new Response("ok", { status: 200 }); }
   ```
2. `apps/dashboard/.dockerignore`:
   ```
   node_modules
   .turbo
   .next
   .env*
   ```
3. `apps/dashboard/Dockerfile`:
   ```dockerfile
   # syntax=docker/dockerfile:1.7
   FROM oven/bun:1-alpine AS deps
   WORKDIR /repo
   COPY package.json bun.lock turbo.json ./
   COPY apps/dashboard/package.json apps/dashboard/
   COPY packages packages
   RUN bun install --frozen-lockfile

   FROM deps AS build
   COPY apps/dashboard apps/dashboard
   RUN bun run --filter=dashboard build

   FROM oven/bun:1-alpine AS runtime
   RUN addgroup -S app && adduser -S app -G app
   WORKDIR /app
   COPY --from=build /repo /app
   USER app
   ENV NODE_ENV=production
   EXPOSE 3000
   HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O- http://localhost:3000/api/health || exit 1
   CMD ["bun", "--cwd", "apps/dashboard", "start"]
   ```
4. Commit:
   ```bash
   git add apps/dashboard
   git commit -m "feat(dashboard): add Dockerfile and /api/health route"
   ```

### Task 39: README rewrite

**Files:** `README.md`

**Steps:**

1. Replace `README.md` with template-focused doc. Sections (in order):
   - **Title** + 1-paragraph description
   - **Stack** table (copy from design doc)
   - **Quick start** — 5 commands:
     ```bash
     bun install
     cp .env.example .env       # fill in Discord creds, AUTH_SECRET
     docker compose up -d
     bun run db:push
     bun run bot:register --guild "$DEV_GUILD_ID"
     bun run dev
     ```
   - **Adding a slash command** — show `defineCommand` example, point to `apps/bot/src/commands/ping.ts`
   - **Adding an event** — `defineEvent`, point to `apps/bot/src/events/guildCreate.ts`
   - **Adding a component** — custom-id pattern + handler
   - **Adding a job** — `defineJob`, mention shard-0 caveat
   - **Adding a per-guild setting** — extend `GuildSettings` type, use in command + dashboard
   - **i18n** — add a key to `packages/i18n/src/locales/*.ts`
   - **Deployment** — three one-paragraph hints: Docker (`docker compose build && deploy`), Railway (Bun buildpack), Fly.io (`fly launch` per app)
   - **Sharding** — switch start command from `apps/bot/src/index.ts` to `apps/bot/src/sharding.ts` past ~2,000 guilds
   - **FAQ** — command not appearing? Run `bun run bot:register`. Env errors? Check `packages/config/src/env.ts`. Migration vs push?
   Target ~250 lines.
2. Commit:
   ```bash
   git add README.md
   git commit -m "docs: rewrite README for the Discord bot template"
   ```

---

## Phase 7 — Final integration

### Task 40: Full-stack smoke test

**Steps:**

1. Fresh-start verification:
   ```bash
   docker compose down -v && docker compose up -d
   bun install
   # ensure .env has real DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET,
   # DISCORD_PUBLIC_KEY, AUTH_SECRET, DEV_GUILD_ID
   bun run db:push
   bun run bot:register --guild "$DEV_GUILD_ID"
   bun run dev
   ```
2. Manually verify in Discord (in `$DEV_GUILD_ID`):
   - `/ping` → "Pong! (Xms)" (ephemeral)
   - `/settings show` → embed + select + button
   - Pick `Svenska` from select → message updates to Swedish confirmation
   - `/settings welcome message:"Hi {user}!"` → confirmation
   - Right-click a message → "Report message" appears in Apps
3. Verify dashboard at http://localhost:3000:
   - Landing renders
   - Sign in → Discord OAuth → redirect to `/guilds`
   - Guild list shows admin guilds; bot-present → "Manage"; otherwise → "Invite bot"
   - Manage → settings page renders; change locale + Save → refresh confirms persisted
4. Run all tests:
   ```bash
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot_test \
     DISCORD_TOKEN=test DISCORD_CLIENT_ID=test \
     bun run test
   ```
   Expected green: i18n (4), customId (4), ping (2), db queries (3), server action (2) = 15 total.
5. Type-check + lint:
   ```bash
   bun run check-types
   bun run lint
   ```
6. Open PR:
   ```bash
   git status        # expect clean (.env is gitignored)
   gh pr create --title "feat: Discord bot template" \
     --body "Implements docs/plans/2026-05-11-discord-bot-template-design.md"
   ```

---

## Implementation notes & gotchas

- **postgres-js + Bun on macOS**: if you see DNS errors, swap `localhost` → `127.0.0.1` in `DATABASE_URL`.
- **Auth.js v5 beta**: pinned to `5.0.0-beta.25`. Future betas may rename exports — re-pin rather than chase `latest`.
- **shadcn components**: lift code from https://ui.shadcn.com/docs/components manually (the CLI is opinionated about file layout). Each component should be ~30-80 lines.
- **What "welcome message" does**: stored in `guilds.settings.welcomeMessage`, editable from `/settings` and the dashboard. No event handler sends it yet — README's "Adding a setting" section guides the executor to add `events/guildMemberAdd.ts` if they want it actually delivered.
- **Sentry SDK**: not installed. The optional dynamic import in `errorHandler.ts` resolves to `null` if the package isn't present — Sentry stays opt-in.
- **No CI workflow shipped**. README has a 10-line GitHub Actions example.

---

## Done criteria

- [ ] All 40 tasks committed in order on `feat/discord-bot-template`.
- [ ] All 15 tests green.
- [ ] `docker compose up -d && bun run dev` boots both apps without errors.
- [ ] `/ping`, `/settings`, and "Report message" work in a real test guild.
- [ ] Dashboard sign-in → guild list → settings save round-trips and persists.
- [ ] Type-check + lint pass repo-wide.
- [ ] README reads as a usable getting-started for someone cloning fresh.
- [ ] PR opened linking to the design doc.
