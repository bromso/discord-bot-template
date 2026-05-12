# Project hygiene — implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the OSS hygiene file set, Changesets-based repo versioning, and a curated agent-skill bundle under `.claude/skills/`, as one PR with two commits.

**Architecture:** Two-commit PR stacked on `feat/tooling-upgrade`. Commit 1 lands every static document plus the Changesets initialization. Commit 2 installs find-skills + skill-creator via the skills.sh CLI, then uses them to discover and install ~5–8 stack-targeted skills, all committed under `.claude/skills/`. Verification gates after each commit: `bunx biome check .`, `bun run check-types`, and `bunx turbo test --force`.

**Tech Stack:** Changesets (`@changesets/cli`, `@changesets/changelog-github`), Contributor Covenant v2.1, GitHub dependabot, GitHub issue/PR templates, skills.sh CLI (`npx skills`).

**Design reference:** `docs/plans/2026-05-12-project-hygiene-design.md` (commit `9990be0`).

**Branch:** `feat/project-hygiene` (stacked on `feat/tooling-upgrade`).

---

## Pre-work

Verify starting state:

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
git status                                # expect: clean
git branch --show-current                 # expect: feat/project-hygiene
git log -1 --pretty=format:"%H %s"        # expect: 9990be0 (the design doc commit)
ls LICENSE 2>&1 | head -1                 # expect: ls: LICENSE: No such file or directory
```

If anything diverges, stop and report.

---

## Task 1: Hygiene docs + Changesets

**Files:**
- Create: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`
- Create: `.changeset/config.json`, `.changeset/README.md`, `.changeset/0001-initial-template-setup.md`
- Modify: root `package.json` (scripts + devDependencies)

### Step 1.1: Create `LICENSE`

Path: `/Users/jonasbroms/Sites/discord-bot-template/LICENSE`

Standard MIT text. Copyright line: `Copyright (c) 2026 Jonas Broms`. Use the canonical text from https://opensource.org/licenses/MIT — three paragraphs (permission grant, conditions, warranty disclaimer).

Final file content:
```
MIT License

Copyright (c) 2026 Jonas Broms

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Step 1.2: Create `SECURITY.md`

Path: `/Users/jonasbroms/Sites/discord-bot-template/SECURITY.md`

```markdown
# Security Policy

## Supported versions

Only the `main` branch and the latest tagged release receive security updates.

| Version | Supported |
|---|---|
| Latest release | ✅ |
| `main` branch  | ✅ |
| All others     | ❌ |

## Reporting a vulnerability

Please **do not** open a public issue for security reports. Instead, open a private
[GitHub security advisory](https://github.com/bromso/discord-bot-template/security/advisories/new).

Include in your report:

- A description of the vulnerability and its impact
- Steps to reproduce, or a proof-of-concept
- The affected version (commit SHA or release tag)
- Any suggested mitigations

## Response timeline

- **Acknowledgement:** within 7 days of report
- **Triage decision:** within 14 days
- **Fix or coordinated disclosure plan:** within 30 days for high-severity issues

Reporters are credited in the resulting CHANGELOG entry unless they prefer otherwise.
```

### Step 1.3: Create `CONTRIBUTING.md`

Path: `/Users/jonasbroms/Sites/discord-bot-template/CONTRIBUTING.md`

```markdown
# Contributing

Thanks for considering a contribution. This template is small enough that there is no
formal RFC process — open an issue to discuss anything non-trivial before writing code,
or open a PR directly for focused fixes.

## Quick start

See the [Quick start in the README](README.md#quick-start) for getting a local environment running.

## Development workflow

1. Fork the repo and create a feature branch from `main`: `git checkout -b feat/your-thing`.
2. Make changes. Keep commits small and conventionally named (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
3. Add a Changeset for any user-visible change:
   ```bash
   bunx changeset
   ```
   Pick a bump level (`patch` for fixes, `minor` for additions, `major` for breaking). Commit the generated `.changeset/*.md` with your PR.
4. Before pushing, run the local quality gates:
   ```bash
   bun run check-types
   bunx biome check .
   bunx turbo test --force
   ```
   All three must pass.
5. Open a PR. Fill in the PR template (Summary, Test plan, Changeset).

Documentation-only or internal-refactor PRs can skip the Changeset step.

## Where things live

- `apps/bot/` — discord.js client, commands, events, components, jobs.
- `apps/dashboard/` — Next.js 16 + Auth.js v5 + Tailwind + Iconify.
- `packages/db/` — Drizzle schema, queries, migrations.
- `packages/config/`, `packages/logger/`, `packages/i18n/`, `packages/ui/` — shared infrastructure.

## Commit convention

We use [Conventional Commits](https://www.conventionalcommits.org/). Examples:

- `feat(bot): add /report command`
- `fix(dashboard): handle empty guild list`
- `docs: clarify quick start`

This isn't enforced by a hook (yet); just match the existing history.

## Reporting bugs / requesting features

Use the [issue templates](.github/ISSUE_TEMPLATE) — they ask for the minimum needed to act on a report.

## Security issues

See [SECURITY.md](SECURITY.md). Use private security advisories, not public issues.

## License

By contributing, you agree your work is licensed under the [MIT License](LICENSE).
```

### Step 1.4: Create `CODE_OF_CONDUCT.md`

Path: `/Users/jonasbroms/Sites/discord-bot-template/CODE_OF_CONDUCT.md`

Use Contributor Covenant v2.1. Canonical text at https://www.contributor-covenant.org/version/2/1/code_of_conduct/. Replace the `[INSERT CONTACT METHOD]` placeholder near "Enforcement" with the SECURITY.md private advisory link:

```
Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at
https://github.com/bromso/discord-bot-template/security/advisories/new.
```

The full file is ~150 lines. Don't paraphrase — paste the canonical text verbatim and only change the contact line. Keep the attribution footer to Contributor Covenant intact (it's required by their license).

### Step 1.5: Create `.github/ISSUE_TEMPLATE/bug_report.md`

```bash
mkdir -p /Users/jonasbroms/Sites/discord-bot-template/.github/ISSUE_TEMPLATE
```

Path: `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Bug report
about: Report something that's broken
title: ""
labels: bug
assignees: ""
---

## Description

What's broken? One or two sentences.

## Reproduction steps

1. ...
2. ...
3. ...

## Expected behavior

What did you expect to happen?

## Actual behavior

What happened instead? Include error messages or screenshots if useful.

## Environment

- Bun version: `bun --version`
- OS:
- discord.js version: (from `apps/bot/package.json`)
- Commit SHA or release tag:

## Additional context

Anything else worth knowing.
```

### Step 1.6: Create `.github/ISSUE_TEMPLATE/feature_request.md`

```markdown
---
name: Feature request
about: Suggest a new feature or enhancement
title: ""
labels: enhancement
assignees: ""
---

## Problem

What problem does this feature solve? Who's affected?

## Proposed solution

How might this work? Sketch the API or UX.

## Alternatives considered

Other approaches you thought about and why they're worse.

## Additional context

Links, screenshots, related issues.
```

### Step 1.7: Create `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Summary

- ...
- ...

## Test plan

- [ ] `bun run check-types` clean
- [ ] `bunx biome check .` clean
- [ ] `bunx turbo test --force` — all tests pass
- [ ] Manual verification (describe what you tested):

## Changeset

- [ ] Added via `bunx changeset` (or marked as docs-only / internal refactor — explain below)
```

### Step 1.8: Create `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    groups:
      all-deps:
        patterns: ["*"]
        update-types: ["minor", "patch"]
    commit-message:
      prefix: "chore(deps)"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "chore(ci)"
```

### Step 1.9: Install Changesets

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
bun add -D @changesets/cli @changesets/changelog-github
```

Verify `@changesets/cli` and `@changesets/changelog-github` appear in root `package.json` `devDependencies`.

### Step 1.10: Initialize Changesets

```bash
bunx changeset init
```

This creates `.changeset/config.json` and `.changeset/README.md`. The default `config.json` is for npm-publishing setups; we'll override it in the next step.

### Step 1.11: Replace `.changeset/config.json` with the spec'd config

Overwrite `/Users/jonasbroms/Sites/discord-bot-template/.changeset/config.json` with:

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

Pin `$schema` to whichever `@changesets/config` version was actually installed by `bunx changeset init` (check `bun.lock`). If the unpkg URL 404s, drop the `$schema` line.

### Step 1.12: Create the seed changeset

Path: `/Users/jonasbroms/Sites/discord-bot-template/.changeset/0001-initial-template-setup.md`

```markdown
---
"discord-bot-template": minor
---

Initial template release: Discord bot + Next.js 16 dashboard + Drizzle + Auth.js + Biome + devcontainer + Iconify.
```

### Step 1.13: Add Changeset scripts to root `package.json`

In `/Users/jonasbroms/Sites/discord-bot-template/package.json`, add to the `scripts` object:

```json
"changeset": "changeset",
"version": "changeset version",
"release": "changeset tag"
```

The exact order doesn't matter for npm/Bun, but put them between the existing scripts (alphabetical-ish to match the file's prevailing style).

### Step 1.14: Verify Changesets can read the config

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
bunx changeset status
```

Expected output: lists the seed changeset and says something like "Changes to be applied to the following packages: discord-bot-template (minor)". Exit 0.

If `changeset status` complains about missing `name` or `version` on the root package, add them to root `package.json`:
- `"name": "discord-bot-template"` (likely already present from Task 3 of the original PR)
- `"version": "0.0.0"` (probably absent — add it)

Re-run `bunx changeset status` to confirm.

### Step 1.15: Run Biome over the new files

```bash
bunx @biomejs/biome check --write .
```

Biome will:
- Format any non-Markdown files it touches (`.github/dependabot.yml`, `.changeset/config.json`, root `package.json`).
- Possibly format Markdown if Biome's Markdown formatter is enabled — but we've kept it on `recommended` defaults which generally don't reformat Markdown. Verify with `git diff` after.

If Biome touches any file beyond what we created/modified in this task, paste the diff and stop — that signals a config issue.

### Step 1.16: Verify the full health gate

```bash
bun run check-types
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot_test \
  DISCORD_TOKEN=test DISCORD_CLIENT_ID=test DISCORD_CLIENT_SECRET=test \
  AUTH_SECRET=test AUTH_URL=http://localhost:3000 \
  bunx turbo test --force
```

Expect: types clean, 15/15 tests pass.

### Step 1.17: Commit

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
git add -A
git commit -m "docs: add LICENSE, SECURITY, CONTRIBUTING, GitHub templates, and Changesets"
```

Expected diff: ~12 new files, root `package.json` + `bun.lock` modified.

---

## Task 2: Skills installation

**Files:**
- Create: `.claude/skills/find-skills/`, `.claude/skills/skill-creator/`, plus N curated skill directories.
- Modify: `README.md` (add Agent skills section), possibly `.gitignore`.

### Step 2.1: Install `find-skills`

```bash
cd /Users/jonasbroms/Sites/discord-bot-template
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

Expect: creates `.claude/skills/find-skills/` with a SKILL.md and any supporting files.

If `npx skills` prompts for confirmation, accept defaults. If it asks where to install, choose the project-level / repo location (`.claude/skills/`).

Verify after: `ls .claude/skills/find-skills/` should show at least one file.

### Step 2.2: Install `skill-creator`

```bash
npx skills add https://github.com/anthropics/skills --skill skill-creator
```

Same expectations as above. Verify with `ls .claude/skills/skill-creator/`.

### Step 2.3: Run the skill discovery loop

For each stack area, run `npx skills find <query>` (or use the find-skills workflow once it's loaded in Claude). For each query, evaluate the top result:

| Query | Look for |
|---|---|
| `bun` | A Bun runtime / package management skill |
| `nextjs` or `next.js` | Next.js App Router / Server Components skill |
| `react server components` | Variant on the above if a dedicated RSC skill exists |
| `auth.js` or `next-auth` | Auth.js v5 skill |
| `drizzle` | Drizzle ORM skill |
| `discord.js` or `discord bot` | discord.js skill (likely niche) |
| `tailwind` | Tailwind CSS skill |
| `biome` | Biome linter/formatter skill |
| `vitest` | Vitest test-runner skill |
| `postgres` | Postgres / pg / SQL skill |

For each, before installing:
- **Install count** — favor skills with documented usage signals.
- **Source repo** — prefer `anthropics/skills`, `vercel-labs/skills`, and well-starred community repos.
- **Last updated** — prefer recently-maintained (< 6 months stale).
- **No bundled binaries** — skip skills that bundle large assets.

If the top hit fails any of these checks, search for alternatives. If no good match exists for a stack area, skip and document the gap.

Aim for **5–8 total skills** beyond the two meta-skills. Don't pad.

### Step 2.4: Install the curated skill set

For each skill that passed Step 2.3's filter:

```bash
npx skills add <repo-url> --skill <skill-name>
```

After each install, verify a SKILL.md (or equivalent entry-point file) landed in `.claude/skills/<skill-name>/`.

### Step 2.5: Run `npx skills check` (if available)

```bash
npx skills check
```

If the CLI supports a health check, run it and confirm all installed skills are valid. If the command doesn't exist or errors out, skip — `find-skills`' description mentioned this exists but it may be a future-tense feature.

### Step 2.6: Update `.gitignore` if needed

After all installs, run:

```bash
git status
```

If `git status` shows any untracked files outside `.claude/skills/<name>/` (e.g., a `.skills-cache/` or `.skills-state.json` at repo root), add those paths to `.gitignore`:

```bash
# Append to /Users/jonasbroms/Sites/discord-bot-template/.gitignore if needed
.skills-cache
```

If no extraneous files appear, skip this step.

### Step 2.7: Add the "Agent skills" section to the README

Insert this section in `/Users/jonasbroms/Sites/discord-bot-template/README.md`, right before the "License" section (which is the last section currently):

```markdown
## Agent skills

This template ships with curated [agent skills](https://skills.sh) for Claude Code under `.claude/skills/`. They auto-activate when you ask Claude to work on the matching part of the stack — for example, a Drizzle query triggers the drizzle skill if installed.

Included out of the box:

- **find-skills** — `npx skills find <query>` to search for more.
- **skill-creator** — interactive skill authoring + evaluation workflow.
- (Plus the stack-targeted skills discovered at install time — see `.claude/skills/` for the full list.)

To add more or update existing:

\`\`\`bash
npx skills find <query>                          # search the registry
npx skills add <repo> --skill <name>             # install a specific skill
npx skills check                                 # health-check installed skills
npx skills update                                # pull updates
\`\`\`

Once `find-skills` is loaded, you can simply ask Claude in this repo: *"find me a skill for X"* — the workflow will run the discovery and present install commands.
```

If the actual list of skills installed differs from the bullets above (e.g., only 4 of the 8 candidates were found), update the bullet list to reflect reality.

### Step 2.8: Run Biome over the README

```bash
bunx @biomejs/biome check --write README.md
```

### Step 2.9: Run the full health gate

```bash
bunx @biomejs/biome check .                   # exit 0
bun run check-types                           # 4 successful
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bot_test \
  DISCORD_TOKEN=test DISCORD_CLIENT_ID=test DISCORD_CLIENT_SECRET=test \
  AUTH_SECRET=test AUTH_URL=http://localhost:3000 \
  bunx turbo test --force                     # 15/15 pass
```

### Step 2.10: Confirm Biome ignores `.claude/skills/`

Skills are likely Markdown files; Biome's default Markdown handling either skips formatting or applies light formatting. If Biome's check reports any errors inside `.claude/skills/`, add `"!**/.claude"` to `biome.json`'s `files.includes`:

```json
"includes": [
  "**",
  "!**/dist",
  "!**/.next",
  "!**/.turbo",
  "!**/node_modules",
  "!**/migrations",
  "!**/coverage",
  "!**/.claude",
  "!**/*.css"
]
```

Only add this if Biome actually complains. Skills are user-vendored content; we don't want our linter changing them.

### Step 2.11: Commit

```bash
git add -A
git commit -m "feat: install find-skills, skill-creator, and stack-targeted skills via skills.sh"
```

Expected diff: `.claude/skills/<name>/` for each installed skill, possibly `.gitignore` and `biome.json` if Step 2.6/2.10 triggered, README.md.

---

## Verification — final pass

After both commits land:

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

Expect: all three exit 0; 15 tests across 4 workspaces.

### Step F.2: Changesets dry-run

```bash
bunx changeset status
```

Expect: lists the seed changeset and the `discord-bot-template: minor` bump.

### Step F.3: Inspect commit history

```bash
git log --oneline feat/tooling-upgrade..HEAD
```

Expect three commits:
- `9990be0 docs: add design for project hygiene PR (docs, changesets, skills)` (the design doc — already present)
- `docs: add LICENSE, SECURITY, CONTRIBUTING, GitHub templates, and Changesets`
- `feat: install find-skills, skill-creator, and stack-targeted skills via skills.sh`

### Step F.4: Open PR (after PR #2 merges)

```bash
git push -u origin feat/project-hygiene
# Wait for PR #2 (feat/tooling-upgrade) to merge into main, then:
git fetch origin main
git rebase origin/main
git push --force-with-lease
gh pr create --title "chore: project hygiene — LICENSE, Changesets, agent skills" --body "..."
```

If PR #2 has merged before this PR's branch is pushed, the rebase + force-push step won't be needed — the branch can target `main` directly.

---

## Implementation notes & gotchas

- **`bunx changeset` interactive prompts.** The `bunx changeset` command for adding a new changeset is interactive. The seed changeset in Step 1.12 is created by hand to avoid the interactive flow during automated execution.

- **Contributor Covenant attribution.** The Contributor Covenant license requires keeping the attribution footer when distributing or modifying the text. Don't paraphrase, don't strip the footer. Replace only the contact-method line.

- **`npx skills add` install path.** The skills.sh CLI installs to `.claude/skills/<name>/` by default when run from a project root. If it asks where to install, choose project-level. If it asks for confirmation to overwrite, accept (the directory shouldn't pre-exist).

- **Skill quality is uneven.** find-skills' own description says it ranks by install count + GitHub stars + source reputation. Take those signals seriously — a low-rated skill can be net-negative (wrong patterns, outdated APIs). Skip rather than install something dubious.

- **Skills CLI errors.** If `npx skills` itself fails to install or run, fall back to manual `git clone` of the skill repo into `.claude/skills/<name>/`. Document the deviation in the report.

- **README "Agent skills" section may need to be honest about gaps.** If only 3 of the 10 stack areas had usable skills, the section should say so — e.g., "No skill found for Auth.js v5 yet; consider authoring one via `skill-creator`."

---

## Done criteria

- [ ] Both commits land on `feat/project-hygiene`.
- [ ] LICENSE renders in GitHub's side panel as MIT.
- [ ] SECURITY tab on GitHub picks up `SECURITY.md`.
- [ ] Opening a new issue offers the bug/feature templates.
- [ ] Opening a new PR pre-fills the PR template.
- [ ] dependabot is enabled (verify in repo Settings → Code security after merge).
- [ ] `bunx changeset status` shows the seed.
- [ ] `.claude/skills/find-skills/` and `.claude/skills/skill-creator/` exist with content.
- [ ] At least 3 additional stack-targeted skills are installed (5–8 is the target, 3 is the minimum acceptable).
- [ ] README's "Agent skills" section accurately lists what's installed.
- [ ] All quality gates (`biome`, `check-types`, tests) pass.
- [ ] PR opened.
