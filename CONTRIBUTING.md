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
