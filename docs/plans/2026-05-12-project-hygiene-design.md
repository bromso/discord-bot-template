# Project hygiene — design

**Date:** 2026-05-12
**Status:** Approved, ready for implementation planning
**Goal:** Add the standard OSS hygiene files, repo-level versioning via Changesets, and a curated set of agent skills under `.claude/skills/` so the template ships with everything an LLM-driven user needs out of the box.

## Summary

Two commits in one PR. Commit 1 lands all the hygiene docs (LICENSE, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, GitHub issue/PR templates, dependabot) plus the Changesets initialization (config + a seed changeset for `0.1.0`). Commit 2 installs the two meta-skills (find-skills, skill-creator) and a stack-targeted skill set discovered via `find-skills`, all committed under `.claude/skills/`.

## Branch & stacking

This PR stacks on top of `feat/tooling-upgrade` (PR #2). Once PR #2 merges to `main`, rebase this branch. No file conflicts beyond `package.json` and `README.md` (additive in both PRs).

## §1. Hygiene docs (Commit 1, part A)

### Files

```
LICENSE
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
.github/
  ISSUE_TEMPLATE/
    bug_report.md
    feature_request.md
  PULL_REQUEST_TEMPLATE.md
  dependabot.yml
```

### Content

- **`LICENSE`** — MIT, `2026 Jonas Broms`. Standard text from https://opensource.org/licenses/MIT.
- **`SECURITY.md`** — Three sections: supported versions (`main` + latest release only), reporting via GitHub private security advisories, response timeline (ack within 7 days, fix within 30 days for high-severity).
- **`CONTRIBUTING.md`** — Practical: quick start pointer, dev workflow (`bun run check-types && bunx biome check . && bunx turbo test --force` before PR), changeset requirement, Conventional Commits convention, file-layout map.
- **`CODE_OF_CONDUCT.md`** — Contributor Covenant v2.1, contact = SECURITY.md advisory link.
- **`.github/ISSUE_TEMPLATE/bug_report.md`** — Markdown frontmatter (`name`, `about`, `labels: bug`); asks for description, repro steps, expected vs actual, environment (Bun version, OS, Discord library version).
- **`.github/ISSUE_TEMPLATE/feature_request.md`** — Frontmatter + problem/solution/alternatives.
- **`.github/PULL_REQUEST_TEMPLATE.md`** — Summary bullets, test plan checklist, changeset confirmation.
- **`.github/dependabot.yml`** — `npm` (weekly Mondays, grouped minor/patch, individual majors) + `github-actions` (weekly).

### Why these choices

- Private security advisories instead of an email address: GitHub-native flow, no separate inbox to monitor.
- Contributor Covenant 2.1: current standard as of 2026.
- Dependabot groups minor/patch: keeps notification volume manageable for a template that accrues many dep updates.

## §2. Changesets setup (Commit 1, part B)

### Files

```
.changeset/
  config.json
  README.md                        # boilerplate from `changeset init`
  0001-initial-template-setup.md
```

### `.changeset/config.json`

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.4/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "bromso/discord-bot-template" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

Key settings:
- `access: "restricted"` — explicitly no npm publishing.
- `changelog: @changesets/changelog-github` — rich CHANGELOG with PR links and author handles. Needs `GITHUB_TOKEN` at `bunx changeset version` time only.
- `commit: false` — versions and tags are committed by humans/CI, not auto-committed by the tool.

### Initial seed changeset

`.changeset/0001-initial-template-setup.md`:

```markdown
---
"discord-bot-template": minor
---

Initial template release: Discord bot + Next.js 16 dashboard + Drizzle + Auth.js + Biome + devcontainer + Iconify.
```

Bumps root version `0.0.0` → `0.1.0` on first `changeset version` run.

### Root `package.json` additions

```json
"changeset": "changeset",
"version": "changeset version",
"release": "changeset tag"
```

Plus `@changesets/cli` and `@changesets/changelog-github` as `devDependencies`.

### Workflow (documented in CONTRIBUTING.md)

1. PR-author runs `bunx changeset` after making changes.
2. Interactive prompt asks for bump level + summary.
3. Commit the generated `.changeset/*.md` with the PR.
4. After merge to main, run `bunx changeset version` to consume the entries, bump versions, update `CHANGELOG.md`, then commit + push.
5. `bunx changeset tag` creates the git tag for the release.

### Trade-off accepted

Internal `@repo/*` packages stay at `0.0.0` forever since they're `"private": true`. Only the root `discord-bot-template` version moves. This is intentional — the template is the shipping unit, not the internal workspaces.

## §3. Skills installation (Commit 2)

### Meta-skills (always installed)

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
npx skills add https://github.com/anthropics/skills --skill skill-creator
```

Land in `.claude/skills/find-skills/` and `.claude/skills/skill-creator/`. Commit those directories.

### Stack-targeted curation

Use `find-skills` to discover top-rated skills for each major stack item. For each, install only if a high-quality match exists (`high install count`, `reputable source`, `actively maintained`). Skip silently if no good match.

| Stack area | Search query |
|---|---|
| Bun runtime | "bun" |
| Next.js 16 / React 19 | "nextjs" / "react server components" |
| Auth.js v5 | "auth.js" / "next-auth" |
| Drizzle ORM | "drizzle" |
| discord.js | "discord.js" / "discord bot" |
| Tailwind CSS v4 | "tailwind" |
| Biome | "biome" |
| Vitest | "vitest" |
| Postgres | "postgres" |
| Docker / devcontainer | "devcontainer" / "docker" |

### Quality filters

- Documented install path on skills.sh
- Reasonable install count or GitHub star count
- Maintained by reputable sources (anthropics, vercel-labs, etc.)
- No bundled binaries / large datasets

### What we don't do here

- **Run `skill-creator`'s eval workflow.** Deferred — bloats this PR.
- **Author custom skills.** The meta-skill is installed for future authoring; we don't author one now.
- **Install skills for stack we don't use** (Python, Rust, Vue, etc.). YAGNI.

### README addition

A short "Agent skills" section documenting the install path, the included skills, and pointers to `npx skills find` / `add` / `check` / `update` for adding more. Once Claude has access to the skills in the repo, asking "find me a skill for X" triggers the find-skills workflow.

### `.gitignore` tweak

If `npx skills add` creates a `.skills-cache` or similar transient directory, add it to `.gitignore`. Verify during implementation; skip if no such artifact appears.

### Failure mode

If a stack-item search returns nothing usable, skip + document the gap in the README. No placeholder skill installs.

## Commit plan

**Commit 1** — `docs: add LICENSE, SECURITY, CONTRIBUTING, GitHub templates, and Changesets`
- All hygiene docs (§1)
- Changesets init (§2)
- `bun install` lockfile update for `@changesets/*` deps

**Commit 2** — `feat: install find-skills, skill-creator, and stack-targeted skills via skills.sh`
- `.claude/skills/find-skills/` and `.claude/skills/skill-creator/`
- Curated skill directories under `.claude/skills/<name>/`
- README "Agent skills" section
- `.gitignore` tweak if needed

## Verification gates

- `bunx changeset status` — confirms there's an entry pending.
- `bunx changeset version --snapshot dry-run` — simulates the version bump without writing.
- `bunx biome check .` clean across all new files.
- `bun run check-types` still clean.
- `npx skills check` (if available) reports installed skills as healthy.
- All existing 15 tests still pass.

## Out of scope

- npm publishing automation (we'd need a publish workflow + secrets — not needed for a template).
- CI workflow for changesets (the bot.yml that auto-opens release PRs). The README has a manual workflow; CI is a follow-up.
- Skill authoring beyond the meta-skill install.
- Per-package CHANGELOGs (internal packages stay at 0.0.0 with no changelog).

## Done criteria

- [ ] Both commits land on `feat/project-hygiene`.
- [ ] All hygiene docs render correctly in GitHub's UI (LICENSE in side panel, SECURITY tab, CONTRIBUTING surfaced in issue/PR forms).
- [ ] `bunx changeset status` shows the seed entry.
- [ ] `npx skills check` clean (or manual verification that skills work).
- [ ] `bunx biome check .` clean.
- [ ] `bun run check-types` clean.
- [ ] All 15 tests still pass.
- [ ] PR opened against `feat/tooling-upgrade` (or `main` once PR #2 merges).
