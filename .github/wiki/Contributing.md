# Contributing to nSelf Admin

Admin is the local companion web UI for the nSelf CLI. It runs at `localhost:3021` on your machine and is distributed as a Docker image — it is not a hosted website.

## Before You Start

- Read the [Code of Conduct](Code-of-Conduct.md). All contributors must follow it.
- Read the [Governance model](https://github.com/nself-org/admin/blob/main/.github/GOVERNANCE.md) — it explains how decisions get made.
- Check [open issues](https://github.com/nself-org/admin/issues) and [Discussions](https://github.com/nself-org/admin/discussions) before opening a new one.

## What Admin Is (and Isn't)

Admin is a **local GUI wrapper** for the nSelf CLI. It:

- Runs on the user's machine, not on any server
- Communicates with a locally running nSelf backend stack
- Delegates all backend operations to the nSelf CLI binary
- Is distributed as `nself/nself-admin` Docker image, launched via `nself admin start`

It is **not** a web app you deploy. Do not add server-side features or API routes that bypass the CLI.

## Reporting Bugs

1. Search [existing issues](https://github.com/nself-org/admin/issues) first.
2. Open a new issue using the **Bug Report** template.
3. Include: Admin version, nSelf CLI version (`nself version`), OS, browser, steps to reproduce.

## Requesting Features

1. Check [existing feature requests](https://github.com/nself-org/admin/issues?q=label%3Afeature).
2. Open a new issue using the **Feature Request** template.
3. Note: Admin features must map to existing CLI commands. If you need a new CLI capability first, file that in the `cli` repo.

## Development Setup

### Requirements

- Node.js 22 or later
- pnpm 9 or later (no npm or yarn)
- Docker (to test the final image)
- nSelf CLI (for integration testing)

### First-time setup

```bash
git clone https://github.com/nself-org/admin.git
cd admin
pnpm install
pnpm dev        # starts at http://localhost:3021
```

### Running tests

```bash
pnpm test           # Jest unit tests
pnpm typecheck      # TypeScript strict check
pnpm lint           # ESLint
pnpm build          # production build (verifies no type errors)
```

### Testing the Docker image

```bash
docker build -t nself/nself-admin:local .
nself admin start   # uses the installed image; swap for local image to test
```

## Branching Model

| Branch      | Purpose            |
| ----------- | ------------------ |
| `main`      | Latest stable      |
| `feat/xxx`  | New features       |
| `fix/xxx`   | Bug fixes          |
| `chore/xxx` | Maintenance        |
| `docs/xxx`  | Documentation only |

Always branch from `main`. Target `main` in your PR.

## Pull Request Process

```bash
# 1. Fork and clone
git clone https://github.com/YOUR-USERNAME/admin.git
cd admin
pnpm install

# 2. Create a branch
git checkout -b feat/my-feature

# 3. Make changes, then verify
pnpm test
pnpm typecheck
pnpm lint

# 4. Commit
git commit -m "feat: add my feature"

# 5. Push and open a PR
git push origin feat/my-feature
```

- Fill in the PR template completely.
- All CI checks must pass before review.
- One review from a CODEOWNER is required to merge (see [CODEOWNERS](https://github.com/nself-org/admin/blob/main/.github/CODEOWNERS)).

## Code Style

- **TypeScript strict mode** — no `any`. Every component and API boundary must be fully typed.
- **Formatting:** Prettier — runs via `pnpm format`. CI fails on unformatted code.
- **Lint:** ESLint — `pnpm lint` must pass with zero warnings.
- **Tests:** all existing tests must pass. New UI components need at least a render test.
- **No direct backend calls** — all server operations go through CLI delegation layer.

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance
- `docs:` — documentation only
- `test:` — tests only

## Security Disclosures

Do not open a public issue for security vulnerabilities. Follow the process in [SECURITY.md](https://github.com/nself-org/admin/blob/main/.github/SECURITY.md).

## Translations / Internationalisation

Internationalisation strategy for Admin is under review. Translation contributions are deferred until the strategy is documented. Watch [Discussions](https://github.com/nself-org/admin/discussions) for updates.

## Questions

- [GitHub Discussions](https://github.com/nself-org/admin/discussions) — preferred for questions
- Community: [nself.org](https://nself.org)

## Related

- [GOVERNANCE.md](https://github.com/nself-org/admin/blob/main/.github/GOVERNANCE.md) — decision model
- [ENFORCEMENT.md](https://github.com/nself-org/admin/blob/main/.github/ENFORCEMENT.md) — code of conduct enforcement
- [CODEOWNERS](https://github.com/nself-org/admin/blob/main/.github/CODEOWNERS) — who reviews what
- [[Dev-Setup]] — local environment setup
- [[Release-Process]] — release workflow
- [[Architecture]] — how Admin's pages and CLI delegation fit together
- [nSelf CLI repo](https://github.com/nself-org/cli) — backend CLI that Admin delegates to

---

← [[Home]] | [[_Sidebar]]
