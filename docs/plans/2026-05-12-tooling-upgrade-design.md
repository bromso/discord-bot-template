# Tooling upgrade — design

**Date:** 2026-05-12
**Status:** Approved, ready for implementation planning
**Goal:** Modernize the template's tooling without changing its feature surface: swap eslint+prettier for Biome, bump Next.js to 16 and auth deps to their latest betas, add Iconify with one offline icon set, and add a compose-based devcontainer.

## Summary

Four orthogonal upgrades bundled into one PR. Each is one commit, applied in the order Biome → Next 16 → Iconify → devcontainer so subsequent diffs land already-formatted. The PR is mostly mechanical (formatting churn, version bumps) plus four new directories/files (`biome.json`, `packages/ui/src/components/icon.tsx`, `.devcontainer/*`).

## Sequencing

1. **Biome migration** (largest mechanical diff — formatting churn touches every file)
2. **Next 16 + auth deps** (codemod + version bumps in `apps/dashboard`)
3. **Iconify** (new wrapper component + one icon use in guilds page)
4. **Devcontainer** (new top-level directory, no source changes)

## §1. Biome migration

### Files added
- `biome.json` at repo root.

### Files removed
- `packages/eslint-config/` (entire workspace package — including its `package.json`, `base.js`, `next.js`, `react-internal.js`).
- `packages/ui/eslint.config.mjs` and any other workspace-level eslint configs.
- `prettier` devDep in root `package.json`.
- `@repo/eslint-config` workspace dependency from every consumer's `package.json`.
- Each workspace's `lint` script (replaced with `biome lint`).

### `biome.json`
```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.15/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "ignoreUnknown": true,
    "includes": ["**", "!**/dist", "!**/.next", "!**/.turbo", "!**/node_modules", "!**/migrations"]
  },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "javascript": { "formatter": { "quoteStyle": "double", "trailingCommas": "all", "semicolons": "always" } },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

### Root scripts
- `"format": "biome format --write ."`
- `"lint": "biome lint ."`
- `"check": "biome check --write ."` (formatter + linter + organize-imports in one pass)
- Drop `turbo run lint` from per-task orchestration; Biome runs fast enough repo-wide.

### Migration step
Run `bunx @biomejs/biome check --write .` once. The resulting large diff (quote style, semicolons, import ordering) lands in the same commit as the config + deletions, so subsequent commits begin from a Biome-formatted baseline.

### Trade-offs accepted
- Lose `@next/eslint-plugin-next` rules (no-html-link-for-pages, image alt). Biome's `recommended` covers `no-explicit-any`, `no-unused-vars`, `react/jsx-key`, `react-hooks/exhaustive-deps`, and import sorting — the load-bearing ones.
- Single root `biome.json`. No per-workspace overrides.

### Commit message
`chore: migrate from eslint + prettier to Biome`

## §2. Next 16 + auth deps update

### Versions
| Package | Before | After |
|---|---|---|
| `next` | 15.1.6 | 16.2.6 |
| `next-auth` | 5.0.0-beta.25 | 5.0.0-beta.31 |
| `@auth/drizzle-adapter` | 1.7.4 | 1.11.2 |
| `react`, `react-dom` | 19.0.0 | 19.0.0 (unchanged) |
| `@types/react`, `@types/react-dom` | 19.0.0 | bump to whatever Next 16 declares |

### Breaking changes checked against our code
- **Async `params`** — already done in 15. ✅
- **Async `headers()`/`cookies()`** — already done in 15. ✅
- **`cache: 'no-store'` default for fetch** — we use explicit `next: { revalidate: 30 }`. ✅
- **`unstable_*` removals** — we don't use any. ✅
- **Webpack config in `next.config.ts`** — our `resolve.extensionAlias` for `.js`-suffixed NodeNext imports was added during Task 32. Next 16 defaults to Turbopack. We translate the alias to `turbopack.resolveAlias` in `next.config.ts`. Webpack stays as opt-in fallback if Turbopack chokes (`next build --webpack`).

### Codemod
Run `bunx @next/codemod@latest upgrade latest` from `apps/dashboard/`. Accept its diff. Manually convert the webpack extension-alias config to its Turbopack equivalent if the codemod doesn't.

### Verification
- `bun --cwd=apps/dashboard run build` (with placeholder env) compiles.
- All 2 dashboard tests pass.
- Manual: `/login` → OAuth → `/guilds` → setting save round-trip.

### Commit message
`chore(dashboard): upgrade to Next 16 + next-auth beta.31 + drizzle-adapter 1.11.2`

## §3. Iconify

### Packages added (in `packages/ui`)
- `@iconify/react`
- `@iconify-json/lucide` (single offline icon set)

### New file: `packages/ui/src/components/icon.tsx`
```tsx
import { Icon as IconifyIcon, addCollection } from "@iconify/react";
import lucide from "@iconify-json/lucide/icons.json" with { type: "json" };

let initialized = false;
function init() {
  if (initialized) return;
  addCollection(lucide);
  initialized = true;
}

export function Icon({
  name,
  size = 16,
  ...rest
}: { name: string; size?: number } & React.SVGProps<SVGSVGElement>) {
  init();
  return (
    <IconifyIcon
      icon={name}
      width={size}
      height={size}
      aria-hidden={!rest["aria-label"]}
      {...rest}
    />
  );
}
```

### Surfaces
- Re-export `Icon` from `packages/ui/src/index.ts`.
- Replace the placeholder `<div className="size-8 rounded bg-zinc-800" />` in `apps/dashboard/src/app/(app)/guilds/page.tsx` with `<Icon name="lucide:server" size={32} />` (rendered alongside Discord-CDN icon when available).

### Why offline-only
- No network at runtime → no flash, no CDN dependency, no privacy concern.
- Tree-shake-friendly: only the lucide collection ships (~50 KB gzipped).
- Adding more sets is one `bun add @iconify-json/<set>` plus one `addCollection()` line in `icon.tsx`.

### Commit message
`feat(ui): add Iconify wrapper component with lucide icon set`

## §4. Devcontainer

### Files added
```
.devcontainer/
├── devcontainer.json
├── docker-compose.yml      # overlay that adds a `workspace` service
└── Dockerfile              # the workspace image (Debian-based)
```

### `.devcontainer/Dockerfile`
```dockerfile
FROM oven/bun:1-debian
RUN apt-get update && apt-get install -y --no-install-recommends \
      git curl wget ca-certificates postgresql-client \
    && rm -rf /var/lib/apt/lists/*
USER bun
WORKDIR /workspaces/discord-bot-template
```

Debian (not Alpine) for VS Code remote server compatibility. `postgresql-client` for `psql` access. `bun` user (image default).

### `.devcontainer/docker-compose.yml` (overlay)
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

### `.devcontainer/devcontainer.json`
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
        "editor.codeActionsOnSave": { "source.organizeImports.biome": "explicit" }
      }
    }
  }
}
```

### Key plumbing
1. **Compose overlay**: `dockerComposeFile` array merges the root `docker-compose.yml` (postgres) with the overlay (workspace). Workspace and postgres share the Docker network → workspace reaches postgres at hostname `postgres`. The host still reaches postgres at `localhost:5432`.
2. **`containerEnv.DATABASE_URL`** overrides whatever the host's `.env` says. No `.env.devcontainer` needed.
3. **`postCreateCommand`** auto-installs deps and runs migrations on first container create. `|| true` keeps the container alive if `.env` lacks Discord values (Zod env validation fails).

### README addition
Under "Quick start", a one-paragraph note: "VS Code users can 'Reopen in Container' for a zero-setup environment — Postgres, Bun, and migrations are wired automatically. Fill `.env` with Discord credentials before running `bun run dev`."

### Commit message
`feat(devcontainer): add compose-based VS Code devcontainer with Postgres link`

## Out of scope

- CI updates to use Biome (a one-line README addendum is enough — actual CI workflow isn't shipped).
- Next 16 codemods for our `apps/bot` Bun scripts (those don't go through Next).
- Additional Iconify icon sets beyond lucide.
- JetBrains-specific devcontainer tooling (the `.devcontainer/` spec works for Gateway out of the box).
- Conversion of the existing eslint plugin rules that don't have Biome equivalents (image alt, no-html-link-for-pages).

## Done criteria

- One PR, four commits in the order above.
- `bunx biome check .` clean across the repo.
- `bun --cwd=apps/dashboard run build` clean under Next 16.
- All 15 tests across 4 workspaces still pass.
- `<Icon name="lucide:server" />` renders in the dashboard.
- `Dev Containers: Reopen in Container` brings up a working environment with `bun install` complete and a healthy Postgres.
