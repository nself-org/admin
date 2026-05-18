# ADR-003: admin/ Next.js Permanent Exception

**Status:** Accepted
**Date:** 2026-05-14
**Phase:** P102 S35
**Decision-makers:** nSelf maintainers (per PPI Flutter-elimination directive 2026-05-14)
**Supersedes:** None
**Superseded-by:** None
**Related:** Stack Standard (S39 F16-STACK-STANDARD.md), ADR-001 (Tauri 2 desktop migration), ADR-002 (React+Vite SPA convergence)

## Status

Accepted. This decision is **permanent**. No migration of `admin/` to Vite, Tauri 2, or any other framework is planned.

## Context

As of 2026-05-14, the nSelf ecosystem has converged on a single client-app stack: **React 19 + Vite 6 + Tauri 2 for desktop, React 19 + Vite 6 + Capacitor for mobile, with all shared UI/state/data primitives delivered via the `@nself/*` package family**. Flutter is being eliminated from every nSelf client app (nclaw, nchat, ntask, nfamily, ntv, clawde).

`admin/` is the lone exception. It is the **local GUI companion for the nSelf CLI**, distributed as the `nself/nself-admin` Docker image and started via `nself admin start`. It runs at `http://localhost:3021` on the operator's own machine. It is not a hosted website, not a desktop app, not a mobile app, not a published SPA. It is a **server-rendered admin GUI that owns a real Node.js process**.

Five load-bearing dependencies make `admin/` architecturally incompatible with a client-only SPA bundle (Vite + Tauri):

| Dependency                             | What it does                                                                                                                  | Why a browser SPA cannot host it                                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server.js`                            | Custom Node.js HTTP server wrapping `next` for graceful shutdown + standalone Docker build                                    | Vite produces a static bundle. No server process exists to wrap.                                                                                      |
| Docker socket (`/var/run/docker.sock`) | Reads container state, runs `docker exec`, streams logs via Unix socket                                                       | Browsers cannot open Unix sockets. The Node.js `net`/`fs` modules have no browser equivalent.                                                         |
| LokiJS                                 | Embedded in-process document DB used for activity tracking, session state, audit log buffering                                | The browser equivalents (IndexedDB, localStorage) have fundamentally different semantics. Moving this to the browser would change the trust boundary. |
| `pg` (node-postgres)                   | Direct PostgreSQL TCP connection for queries that bypass Hasura (admin housekeeping, migration status, raw schema inspection) | PostgreSQL wire protocol is TCP. Browsers cannot speak TCP directly. WebSocket bridges exist but are not used here.                                   |
| `socket.io` (server)                   | Persistent server-side WebSocket emitter pushing container/service updates to the admin UI                                    | The browser is the WebSocket _client_. A SPA bundle cannot itself be a WebSocket server.                                                              |

## Decision

`admin/` stays on **Next.js (App Router)** permanently. The framework's File Conventions, Server Actions, API Routes, and middleware are load-bearing for the admin product. Next.js's hybrid server+client model is exactly what this product needs.

`admin/` will continue to be:

- Distributed as the `nself/nself-admin` Docker image
- Started via `nself admin start` (CLI integration)
- Run at `localhost:3021` on the operator's own machine
- Updated in version-lockstep with `cli/` from P93 onward

## Rationale

1. **Server-side rendering is a feature, not an obstacle.** The admin GUI renders DB-/Docker-state-dependent views server-side, which keeps secrets (DB password, Docker socket) server-side. Moving to a browser SPA would force secrets into the client or require a separate API tier — a strictly larger surface.
2. **Single-process simplicity.** One Node.js process owns HTTP, WebSocket, Docker socket, LokiJS, pg — all sharing connection pools and lifecycle. Splitting this into "API server + SPA frontend" doubles the moving parts for a local-only product.
3. **Next.js File Conventions deliver routing + layouts + loading/error boundaries out of the box.** Replicating these in Vite would require hand-rolling a routing library and SSR layer (e.g. Vite SSR + a router) for no user-visible benefit.
4. **Next.js 16 already satisfies our security requirements.** Server Actions, App Router middleware, CSP headers via `next.config.js`, and the built-in CSRF for Server Actions cover the admin attack surface.
5. **Migration cost is unbounded and benefit is zero.** No `@nself/*` SPA package is unavailable to admin because of Next.js — admin can import them in client components. The only thing it cannot share is the single-bundle delivery model, which is not a goal for admin.

## Consequences

### Positive

- `admin/` keeps its proven, working architecture
- No migration risk during P102's already-aggressive Flutter elimination
- Server-side trust boundary preserved (DB password / Docker socket never reach the browser)
- Next.js community resources, security advisories, and tooling continue to apply

### Negative

- `admin/` cannot share the SPA-only bits of `@nself/*` packages (e.g. Vite-specific plugins, Tauri-only IPC helpers). This is acceptable: admin has no need for them.
- `admin/` is the lone Next.js codebase in the ecosystem after P102 ships. The maintenance overhead of "one Next.js repo" is small but real (separate Next.js upgrade cycle, separate ESLint config flavor).
- Shared tooling (`@nself/config`, `@nself/eslint-config`) must publish a Next.js-flavored entry alongside the SPA entry so admin can consume it without forking config.

### Neutral

- `admin/` remains its own git repository (`nself-org/admin`). It cannot use `workspace:*` references and must consume published `@nself/*` packages from npm. This is already handled (see `eslint.config.mjs` stub-fallback pattern).
- `admin/` retains its own release cycle locked to `cli/` (CLI = Admin version lockstep from P93 onward).

## Alternatives Considered

### Alternative 1: Vite SSR (`vite-plugin-ssr` / Vike)

**Rejected.** Vite SSR is production-capable but the migration cost (rewriting File Conventions routing, middleware, Server Actions, and the `server.js` integration) is enormous for zero user benefit. Next.js delivers these out of the box.

### Alternative 2: Split admin into "API server" + "Vite SPA frontend"

**Rejected for P102.** This is the only architecturally clean path to a SPA frontend, but it doubles deployment complexity (two processes inside one Docker image), forces a versioned API contract between the two halves, and requires a new auth flow for the SPA. The current monolith works and has no user-facing issues. A future P10x phase MAY revisit this if a compelling reason emerges (e.g. embedding the admin UI inside a Tauri shell for cross-platform native distribution) — but that is out of P102 scope and is captured as an idea, not a commitment.

### Alternative 3: Tauri 2 with embedded Node sidecar

**Rejected.** Tauri 2 sidecars can host a Node.js process, but distributing admin as a desktop binary changes its deployment model (Docker image becomes one of many distribution targets). For a local-only operator tool already happy in Docker, this is added complexity, not subtraction.

### Alternative 4: Pure Node.js + Handlebars/EJS

**Rejected.** Would require rewriting the entire React component tree. The React tree is shared (in spirit, if not literally) with the rest of the ecosystem's design language. Throwing it away has no upside.

## Review Cadence

This ADR is reviewed:

- At the start of every major phase (P103, P104, ...) — confirm "Accepted, no migration planned"
- If any of the five incompatible dependencies (server.js / Docker socket / LokiJS / pg / socket.io) is replaced by something browser-compatible
- If the nSelf ecosystem standard stack itself changes (e.g. ecosystem-wide move away from React)

Next scheduled review: **P104 architecture review**.

## References

- PPI: `~/Sites/nself/.claude/CLAUDE.md` § Flutter-Elimination Directive (2026-05-14)
- Sprint: P102 S35 — admin/ Next.js Permanent Exception Audit
- Stack Standard: `cli/.github/wiki/standards/F16-STACK-STANDARD.md`
- admin Architecture: `admin/.github/wiki/Architecture.md`
