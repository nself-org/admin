# Contributing to nSelf Admin

## What This Is

Admin is a local companion UI for the nSelf CLI. It runs at `localhost:3021` on your machine and is distributed as a Docker image. It is not a hosted website.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (to test the final image)
- nSelf CLI (for integration testing)

## Setup

```bash
git clone https://github.com/nself-org/admin
cd admin
pnpm install
pnpm dev        # starts on http://localhost:3021
```

## Development

```bash
pnpm dev        # dev server with hot reload
pnpm build      # production build
pnpm test       # run Jest tests
pnpm lint       # lint
pnpm typecheck  # TypeScript checks
```

## Pull Requests

1. Fork the repo and create a branch
2. All new components need TypeScript strict types — no `any`
3. Run `pnpm test` and `pnpm typecheck` before submitting
4. Submit a PR against `main`

## Commit Style

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
