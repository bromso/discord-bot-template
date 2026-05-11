# Tooling upgrade — implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate to Biome (replacing eslint+prettier), bump Next.js to 16 + auth deps to latest beta, add Iconify with lucide icons, and ship a VS Code devcontainer linked to Postgres — as one PR with four sequential commits.

**Architecture:** Each task produces exactly one commit. Sequence: Biome → Next 16 → Iconify → devcontainer. The Biome migration lands first so subsequent commits inherit Biome-formatted code. Verification gates after each task: `biome check`, `check-types`, the test suite, and (where applicable) the dashboard build.

**Tech Stack:** Biome 2.4.x, Next.js 16, next-auth 5.0.0-beta.31, @auth/drizzle-adapter 1.11.x, @iconify/react, @iconify-json/lucide, VS Code Dev Containers spec, Docker Compose.

**Design reference:** `docs/plans/2026-05-12-tooling-upgrade-design.md` (commit `bee771f`). Read it first.

**Branch:** `feat/tooling-upgrade` (already checked out as of this plan's commit).

---

## Pre-work

Verify your starting state:

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
git status                       # expect: clean
git branch --show-current        # expect: feat/tooling-upgrade
git log -1 --pretty=format:"%H %s"   # expect: bee771f (design doc commit)
docker compose ps                # expect: postgres healthy
```

If anything diverges, stop and report before proceeding.

---

## Task 1: Biome migration

**Files:**
- Create: `biome.json`
- Modify: root `package.json`, `turbo.json`, every workspace `package.json` that has `@repo/eslint-config` or `lint` script
- Delete: `packages/eslint-config/` (entire directory), `packages/ui/eslint.config.mjs`
- Reformat: every `.ts`/`.tsx`/`.json`/`.md` file in the repo (by `biome check --write`)

### Step 1.1: Install Biome at the root

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
bun add -D --filter=. @biomejs/biome
```

If `--filter=.` doesn't target the root workspace correctly in Bun 1.3.13, alternative:

```bash
bun add -D @biomejs/biome  # from the repo root, adds to root package.json
```

Verify the version: `cat package.json | grep biome` should show `"@biomejs/biome": "^2.4.x"` (where x is the latest 2.4 patch — currently 15).

### Step 1.2: Write `biome.json` at repo root

Create `/Users/jonasbroms/Sites/discord-bot-template/biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.15/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "includes": [
      "**",
      "!**/dist",
      "!**/.next",
      "!**/.turbo",
      "!**/node_modules",
      "!**/migrations"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "assist": {
    "actions": {
      "source": { "organizeImports": "on" }
    }
  }
}
```

Pin `$schema` to whichever 2.4.x version Bun actually installed (check `bun.lock` for the exact resolved version). If the schema URL 404s, drop the `$schema` line — it's only for editor support.

### Step 1.3: Update root `package.json` scripts

In `/Users/jonasbroms/Sites/discord-bot-template/package.json`:

**Remove** the existing `prettier` devDep line and the `format` script line:
```json
"format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
```
```json
"prettier": "^3.7.4",
```

**Add** these scripts (replace `lint`):
```json
"format": "biome format --write .",
"lint": "biome lint .",
"check": "biome check --write ."
```

Final root `scripts` object should be:
```json
{
  "dev": "turbo run dev",
  "build": "turbo run build",
  "lint": "biome lint .",
  "format": "biome format --write .",
  "check": "biome check --write .",
  "check-types": "turbo run check-types",
  "test": "turbo run test",
  "db:generate": "bun --cwd=packages/db run generate",
  "db:migrate": "bun --cwd=packages/db run migrate",
  "db:push": "bun --cwd=packages/db run push",
  "db:studio": "bun --cwd=packages/db run studio",
  "bot:register": "bun --cwd=apps/bot run register",
  "bot:unregister": "bun --cwd=apps/bot run unregister"
}
```

### Step 1.4: Update `turbo.json` to drop the `lint` task

In `/Users/jonasbroms/Sites/discord-bot-template/turbo.json`, remove the `"lint": { ... }` entry from the `tasks` object. Biome runs repo-wide from the root, not per-workspace. Final `tasks` object:

```json
{
  "build": {
    "dependsOn": ["^build"],
    "inputs": ["$TURBO_DEFAULT$", ".env*"],
    "outputs": [".next/**", "!**/.next/cache/**", "dist/**"]
  },
  "check-types": { "dependsOn": ["^check-types"] },
  "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
  "dev": { "cache": false, "persistent": true },
  "db:migrate": { "cache": false }
}
```

### Step 1.5: Delete the eslint-config workspace package

```bash
rm -rf /Users/jonasbroms/Sites/discord-bot-template/packages/eslint-config
```

### Step 1.6: Delete the workspace-level eslint config in packages/ui

```bash
rm -f /Users/jonasbroms/Sites/discord-bot-template/packages/ui/eslint.config.mjs
```

Check for any other stray eslint configs that might exist:

```bash
find /Users/jonasbroms/Sites/discord-bot-template -name 'eslint.config*' -not -path '*/node_modules/*'
find /Users/jonasbroms/Sites/discord-bot-template -name '.eslintrc*' -not -path '*/node_modules/*'
find /Users/jonasbroms/Sites/discord-bot-template -name '.prettierrc*' -not -path '*/node_modules/*'
```

Delete anything those commands surface (none expected).

### Step 1.7: Remove `@repo/eslint-config` and `lint` script from each workspace

Workspaces that may reference `@repo/eslint-config` in their `package.json` `devDependencies`:
- `packages/ui/package.json`

Workspaces that have a `lint` script that calls eslint:
- `apps/bot/package.json` — `"lint": "echo no-op"` (this is fine, can stay or be removed)
- `apps/dashboard/package.json` — `"lint": "next lint"` (must be removed; `next lint` is deprecated in Next 16 anyway)
- `packages/config/package.json`, `packages/logger/package.json`, `packages/i18n/package.json`, `packages/db/package.json` — all have `"lint": "echo no-op"` (fine to leave or remove)

Action: remove the `lint` script from `apps/dashboard/package.json`. The `echo no-op` lints in the other workspaces can stay — they're harmless and Turbo's no-op step is fine to leave behind even though we removed the `lint` task from turbo.json (Turbo will just complain "no script found" if invoked, which it won't be). Actually since we removed the `lint` task from `turbo.json` entirely, leftover `lint` scripts in workspace package.jsons are inert. Leave them.

For `packages/ui/package.json`, remove `"@repo/eslint-config": "*"` from `devDependencies`.

### Step 1.8: Run `bun install` to refresh the lockfile

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
bun install
```

Expect: lockfile updates (drops eslint chain, drops prettier, adds @biomejs/biome).

### Step 1.9: Reformat the entire repo with Biome

```bash
bunx @biomejs/biome check --write .
```

Expect: a LARGE diff. Biome will:
- Change quote style to double quotes
- Add trailing commas
- Add semicolons consistently
- Sort imports
- Apply lint fixes where automatic (e.g., remove unused imports)

If Biome reports any errors that it can't auto-fix, paste them and stop. The recommended ruleset is mostly auto-fixable. Common unfixable: a real unused variable that you should delete, or a usage that legitimately needs `// biome-ignore` annotation.

### Step 1.10: Verify Biome is happy

```bash
bunx @biomejs/biome check .
```

Expect: exit 0, no diagnostics.

### Step 1.11: Verify types still pass

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
bun run check-types
```

Expect: 4 successful, 4 total (db, i18n, bot, dashboard).

### Step 1.12: Verify tests still pass

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot_test \
  DISCORD_TOKEN=test DISCORD_CLIENT_ID=test DISCORD_CLIENT_SECRET=test \
  AUTH_SECRET=test AUTH_URL=http://localhost:3000 \
  bunx turbo test --force
```

Expect: 4 successful, 15 tests pass (i18n 4, db 3, bot 6, dashboard 2).

(We use `--force` to bypass Turbo cache so the test run is real, not a cache replay.)

### Step 1.13: Commit

```bash
git add -A
git commit -m "chore: migrate from eslint + prettier to Biome"
```

Expect: a single commit with hundreds of files touched (the reformat) plus the config swap. The commit will be visually noisy but mechanically clean — the actual logic changes are confined to the deletions and the new biome.json.

---

## Task 2: Next 16 + auth deps update

**Files:**
- Modify: `apps/dashboard/package.json`, `apps/dashboard/next.config.ts`, possibly source files touched by the codemod
- Possibly: bun.lock

### Step 2.1: Run Next.js codemod

```bash
cd /Users/jonasbroms/Sites/discord-bot-template/apps/dashboard
bunx @next/codemod@latest upgrade latest
```

The codemod prompts for the upgrade target. Choose Next 16 (latest stable). It will:
- Update `next`, `react`, `react-dom`, `@types/react`, `@types/react-dom` in `package.json`
- Run code transforms (async params, deprecated APIs, etc.)
- Possibly add Turbopack config to `next.config.ts`

If the prompt requires interactive input that doesn't work in your shell, fall back to manual updates in Step 2.3.

If the codemod completes, review the diff with `git diff` before continuing.

### Step 2.2: Verify the codemod's `package.json` changes

Open `apps/dashboard/package.json`. Confirm:
- `next` is at `^16.2.6` (or latest 16.x)
- `react` and `react-dom` are at `^19.x`
- `@types/react`, `@types/react-dom` are at `^19.x`

If the codemod didn't run, do these updates manually:

```bash
bun --cwd=apps/dashboard add next@latest react@latest react-dom@latest
bun --cwd=apps/dashboard add -D @types/react@latest @types/react-dom@latest
```

### Step 2.3: Bump Auth.js deps

```bash
bun --cwd=apps/dashboard add next-auth@beta @auth/drizzle-adapter@latest
```

This pulls `next-auth@5.0.0-beta.31` (or later — whichever is the current beta) and `@auth/drizzle-adapter@^1.11.x`.

Verify:
```bash
grep -E '"(next|next-auth|@auth/drizzle-adapter|react)":' /Users/jonasbroms/Sites/discord-bot-template/apps/dashboard/package.json
```

### Step 2.4: Inspect `apps/dashboard/next.config.ts`

Open `/Users/jonasbroms/Sites/discord-bot-template/apps/dashboard/next.config.ts`. From Task 32 of the original build, this file has a `webpack` block that adds `resolve.extensionAlias: { ".js": [".ts", ".tsx", ".js"] }` for our `.js`-suffixed monorepo imports.

If the codemod has already converted it to Turbopack (look for a `turbopack` block), good — proceed to Step 2.5.

If the webpack block is still there, rewrite the config to:

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@repo/db", "@repo/config", "@repo/i18n", "@repo/logger", "@repo/ui"],
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  },
  // Keep webpack config as fallback in case --webpack is used
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default config;
```

The `turbopack.resolveExtensions` is the canonical way to teach Turbopack about extension fallbacks. Note: as of Next 16, the option is `resolveExtensions` (no alias semantics like webpack's `extensionAlias`). If our `.js`-suffixed imports break, the alternative is to remove `.js` extensions from relative imports across `packages/*` — but that's a much bigger change and we'd rather keep NodeNext-compatible imports.

### Step 2.5: Run install to refresh

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
bun install
```

### Step 2.6: Verify types

```bash
bun --cwd=apps/dashboard run check-types
```

Expect: exit 0. If Auth.js v5 beta.31 changed any types (especially `NextAuthConfig` or callback signatures), TS errors will surface here. Paste any errors and stop — we'll fix in a step we add.

### Step 2.7: Verify build

```bash
cd /Users/jonasbroms/Sites/discord-bot-template/apps/dashboard
DISCORD_TOKEN=test DISCORD_CLIENT_ID=test DISCORD_CLIENT_SECRET=test \
  AUTH_SECRET=test AUTH_URL=http://localhost:3000 \
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot \
  bun run build 2>&1 | tail -30
```

Expect: clean build with the full route table (`/`, `/login`, `/guilds`, `/guilds/[id]/settings`, `/api/auth/[...nextauth]`, `/api/health`, plus `Middleware`).

If the build fails with a Turbopack error about `.js` imports, fall back to webpack:

```bash
bun run build --webpack
```

If `--webpack` also fails, paste the error and stop.

### Step 2.8: Verify dashboard tests

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot_test_dashboard \
  DISCORD_TOKEN=test DISCORD_CLIENT_ID=test DISCORD_CLIENT_SECRET=test \
  AUTH_SECRET=test AUTH_URL=http://localhost:3000 \
  bun --cwd=apps/dashboard run test
```

Expect: 2/2 pass.

### Step 2.9: Run Biome over the dashboard to format any codemod artifacts

```bash
bunx @biomejs/biome check --write apps/dashboard
```

The codemod's output formatting may not match Biome's preferences. This pass normalizes it.

### Step 2.10: Commit

```bash
git add -A
git commit -m "chore(dashboard): upgrade to Next 16 + next-auth beta.31 + drizzle-adapter 1.11.x"
```

---

## Task 3: Iconify

**Files:**
- Modify: `packages/ui/package.json`, `packages/ui/src/index.ts`, `apps/dashboard/src/app/(app)/guilds/page.tsx`
- Create: `packages/ui/src/components/icon.tsx`

### Step 3.1: Add deps to packages/ui

```bash
bun --cwd=packages/ui add @iconify/react @iconify-json/lucide
```

Verify the additions in `packages/ui/package.json` under `dependencies`. The `@iconify-json/lucide` package is data-only (~3 MB on disk).

### Step 3.2: Create `packages/ui/src/components/icon.tsx`

```tsx
import { Icon as IconifyIcon, addCollection } from "@iconify/react";
import lucide from "@iconify-json/lucide/icons.json" with { type: "json" };
import type { SVGProps } from "react";

let initialized = false;
function init() {
  if (initialized) return;
  // @ts-expect-error — iconify json shape from disk is broader than addCollection's input type
  addCollection(lucide);
  initialized = true;
}

export type IconProps = SVGProps<SVGSVGElement> & {
  name: string;
  size?: number;
};

export function Icon({ name, size = 16, ...rest }: IconProps) {
  init();
  return (
    <IconifyIcon
      icon={name}
      width={size}
      height={size}
      aria-hidden={rest["aria-label"] ? undefined : true}
      {...rest}
    />
  );
}
```

The `@ts-expect-error` comment is there because `@iconify-json/lucide/icons.json` is typed as `unknown` (or generic JSON shape) when imported with `with { type: "json" }`, but `addCollection` expects `IconifyJSON`. The runtime shape matches; the type assertion is the smallest deviation we can make.

If TypeScript doesn't emit an error on that line (newer iconify versions ship better types), the `@ts-expect-error` itself becomes an error. In that case, remove the comment.

### Step 3.3: Re-export `Icon` from packages/ui

In `/Users/jonasbroms/Sites/discord-bot-template/packages/ui/src/index.ts`, add:

```ts
export * from "./components/icon.js";
```

Final `packages/ui/src/index.ts` should look like:
```ts
export * from "./components/button.js";
export * from "./components/icon.js";
export { cn } from "./lib/cn.js";
```

### Step 3.4: Use `<Icon />` in the dashboard guilds page

Open `/Users/jonasbroms/Sites/discord-bot-template/apps/dashboard/src/app/(app)/guilds/page.tsx`. Find the placeholder:

```tsx
<div className="size-8 rounded bg-zinc-800" />
```

Replace with:

```tsx
<Icon name="lucide:server" size={32} className="text-zinc-500" />
```

Add the import at the top:

```tsx
import { Icon } from "@repo/ui/components/icon";
```

### Step 3.5: Verify types

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
bun --cwd=apps/dashboard run check-types
```

Expect: exit 0.

### Step 3.6: Verify build

```bash
cd /Users/jonasbroms/Sites/discord-bot-template/apps/dashboard
DISCORD_TOKEN=test DISCORD_CLIENT_ID=test DISCORD_CLIENT_SECRET=test \
  AUTH_SECRET=test AUTH_URL=http://localhost:3000 \
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot \
  bun run build 2>&1 | tail -15
```

Expect: clean build. Bundle sizes may grow a bit (lucide JSON ~50 KB gzipped).

### Step 3.7: Run Biome

```bash
bunx @biomejs/biome check --write packages/ui apps/dashboard
```

### Step 3.8: Tests still pass

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot_test \
  DISCORD_TOKEN=test DISCORD_CLIENT_ID=test DISCORD_CLIENT_SECRET=test \
  AUTH_SECRET=test AUTH_URL=http://localhost:3000 \
  bunx turbo test --force
```

Expect: 15/15 across 4 workspaces.

### Step 3.9: Commit

```bash
git add -A
git commit -m "feat(ui): add Iconify wrapper component with lucide icon set"
```

---

## Task 4: Devcontainer

**Files:**
- Create: `.devcontainer/devcontainer.json`, `.devcontainer/docker-compose.yml`, `.devcontainer/Dockerfile`
- Modify: `README.md` (add "Reopen in Container" note under Quick start)

### Step 4.1: Create the directory

```bash
mkdir -p /Users/jonasbroms/Sites/discord-bot-template/.devcontainer
```

### Step 4.2: Create `.devcontainer/Dockerfile`

```dockerfile
FROM oven/bun:1-debian

RUN apt-get update && apt-get install -y --no-install-recommends \
      git \
      curl \
      wget \
      ca-certificates \
      postgresql-client \
    && rm -rf /var/lib/apt/lists/*

USER bun
WORKDIR /workspaces/discord-bot-template
```

### Step 4.3: Create `.devcontainer/docker-compose.yml`

```yaml
services:
  workspace:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspaces/discord-bot-template:cached
      - bun-cache:/home/bun/.bun/install/cache
    command: sleep infinity
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - default

volumes:
  bun-cache:
```

The root `docker-compose.yml` already defines the `postgres` service with a healthcheck. The overlay's `depends_on: postgres: condition: service_healthy` ensures the workspace doesn't start until Postgres is ready. The compose overlay pattern (`dockerComposeFile: [...]` in devcontainer.json) merges the two compose files.

### Step 4.4: Create `.devcontainer/devcontainer.json`

```jsonc
{
  "name": "discord-bot-template",
  "dockerComposeFile": ["../docker-compose.yml", "docker-compose.yml"],
  "service": "workspace",
  "workspaceFolder": "/workspaces/discord-bot-template",
  "remoteUser": "bun",
  "containerEnv": {
    "DATABASE_URL": "postgres://postgres:postgres@postgres:5432/bot"
  },
  "forwardPorts": [3000],
  "postCreateCommand": "bun install --frozen-lockfile && bun --cwd=packages/db run migrate || true",
  "customizations": {
    "vscode": {
      "extensions": [
        "biomejs.biome",
        "bradlc.vscode-tailwindcss",
        "ms-azuretools.vscode-docker"
      ],
      "settings": {
        "editor.defaultFormatter": "biomejs.biome",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.organizeImports.biome": "explicit"
        }
      }
    }
  }
}
```

### Step 4.5: Update the README

Open `/Users/jonasbroms/Sites/discord-bot-template/README.md`. Find the "Quick start" section. Right after the fenced command block, add a paragraph:

```markdown
**VS Code users:** Press <kbd>F1</kbd> and run "Dev Containers: Reopen in Container" instead of the steps above — Postgres, Bun, and `bun install` are wired automatically via `.devcontainer/`. You still need to fill `.env` with Discord credentials before running `bun run dev`.
```

(If `<kbd>` tags clash with your README's tone, plain text "F1" is fine.)

### Step 4.6: Smoke-test that the workspace image builds

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
docker build -f .devcontainer/Dockerfile -t discord-bot-template-devcontainer:test .
```

Expect: successful build, ~200-300 MB image. We're not running the full devcontainer stack from CLI (that's VS Code's job), just verifying the Dockerfile is valid.

### Step 4.7: Smoke-test the compose overlay parses

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
docker compose -f docker-compose.yml -f .devcontainer/docker-compose.yml config > /dev/null
```

Expect: silent success. If `docker compose config` prints an error, the YAML is malformed or the overlay can't resolve.

### Step 4.8: Run Biome over the changes

```bash
bunx @biomejs/biome check --write .devcontainer README.md
```

Note: Biome handles JSON5/JSONC (`devcontainer.json` allows comments) and Markdown. If Biome refuses to format `.devcontainer/devcontainer.json` because of the comments, that's expected — the comments are intentional documentation; leave the file as-is.

### Step 4.9: Final commit

```bash
git add -A
git commit -m "feat(devcontainer): add compose-based VS Code devcontainer with Postgres link"
```

---

## Verification — final pass before PR

After all four commits land:

### Step F.1: Repo-wide checks

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
bunx @biomejs/biome check .
bun run check-types
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot_test \
  DISCORD_TOKEN=test DISCORD_CLIENT_ID=test DISCORD_CLIENT_SECRET=test \
  AUTH_SECRET=test AUTH_URL=http://localhost:3000 \
  bunx turbo test --force
```

Expect: all three commands exit 0; test summary shows 4 successful tasks / 15 tests.

### Step F.2: Both Docker images still build

```bash
docker build -f apps/bot/Dockerfile -t bot-template:bot .
docker build -f apps/dashboard/Dockerfile -t bot-template:dashboard .
```

Expect: success on both. The Next 16 bump may slightly change the dashboard image size.

### Step F.3: Inspect commit history

```bash
git log --oneline main..HEAD
```

Expect exactly 5 commits on top of the design doc:
- `chore: migrate from eslint + prettier to Biome`
- `chore(dashboard): upgrade to Next 16 + next-auth beta.31 + drizzle-adapter 1.11.x`
- `feat(ui): add Iconify wrapper component with lucide icon set`
- `feat(devcontainer): add compose-based VS Code devcontainer with Postgres link`
- (plus the design doc commit `bee771f`)

### Step F.4: Open PR

```bash
git push -u origin feat/tooling-upgrade
gh pr create --title "chore: tooling upgrade — Biome, Next 16, Iconify, devcontainer" --body "$(cat <<'EOF'
## Summary

- Replace eslint + prettier with Biome (single config at repo root, formatter + linter + import organizer).
- Bump Next.js 15.1.6 → 16.2.6, next-auth 5.0.0-beta.25 → 5.0.0-beta.31, @auth/drizzle-adapter 1.7.4 → 1.11.x.
- Add Iconify wrapper component (`<Icon name="lucide:server" />`) with the lucide offline set; replace the dashboard's placeholder guild-icon div.
- Add `.devcontainer/` (compose overlay on the existing docker-compose.yml) so VS Code "Reopen in Container" produces a zero-setup dev environment with Postgres healthy.

Design and implementation plans in `docs/plans/2026-05-12-tooling-upgrade-{design,implementation}.md`.

## Test plan

- [x] `bunx biome check .` clean
- [x] `bun run check-types` clean across all 4 workspaces
- [x] `bunx turbo test --force` — 4/4 workspace tasks, 15/15 tests
- [x] `bun --cwd=apps/dashboard run build` clean under Next 16
- [x] `docker build -f apps/bot/Dockerfile .` and `docker build -f apps/dashboard/Dockerfile .` both succeed
- [x] `docker compose -f docker-compose.yml -f .devcontainer/docker-compose.yml config` parses
- [ ] **Manual:** "Dev Containers: Reopen in Container" → Postgres healthy, `bun install` done, dashboard reachable on forwarded port 3000

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Implementation notes & gotchas

- **Biome formatter touches everything.** The Task 1 commit will look enormous in GitHub's UI. That's normal and intentional — it's a one-time tax for a permanently faster + simpler tool. Reviewers should focus on `biome.json`, deleted files, and `package.json`/`turbo.json` diffs; the rest is mechanical.

- **Next 16 codemod interactivity.** `bunx @next/codemod@latest upgrade latest` may prompt interactively. If it does, choose Next 16 and accept all default codemod selections. If interactivity is impossible, fall back to manual version bumps in Step 2.3.

- **Turbopack vs webpack.** Next 16 defaults to Turbopack for builds. If our `.js`-suffixed monorepo imports break under Turbopack, the fallback is `next build --webpack`. We'd ideally not need this; if we do, document in README that the dashboard's build command is `next build --webpack` and update `apps/dashboard/package.json`.

- **Auth.js beta.31.** Minor patch from .25. No code changes expected to `auth.ts` / `auth.config.ts` / `middleware.ts`. If types break, the most likely change is the `session()` callback signature — check Auth.js v5 changelog.

- **Iconify's JSON import.** `with { type: "json" }` is the modern syntax. If Bun's TS resolver complains, fall back to `import lucide from "@iconify-json/lucide/icons.json"` (no assertion) — Bun handles JSON imports natively.

- **Devcontainer postCreateCommand failures.** If `bun --cwd=packages/db run migrate` fails because `.env` lacks Discord values, the `|| true` catches it. Devs can re-run manually after filling `.env`.

- **Biome on `.devcontainer/devcontainer.json`.** JSONC (JSON with comments) may confuse Biome's JSON formatter. If it refuses, leave the file alone — the comments are intentional documentation.

---

## Done criteria

- [ ] All 4 task commits land in order on `feat/tooling-upgrade`.
- [ ] `bunx biome check .` clean.
- [ ] `bun run check-types` clean.
- [ ] All 15 tests across 4 workspaces pass.
- [ ] `bun --cwd=apps/dashboard run build` clean under Next 16.
- [ ] Both production Dockerfiles still build.
- [ ] `.devcontainer/` compose overlay parses cleanly via `docker compose config`.
- [ ] README has the "Reopen in Container" note.
- [ ] PR opened linking to the design doc.
