# Admin — Environment Variables Reference

This document lists all environment variables used by ɳSelf Admin.

## Configuration Variables

### Service

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `ADMIN_PORT` | integer | `3021` | No | Port for the admin UI web server |
| `ADMIN_EMAIL` | string | — | No | Admin login email address |
| `ADMIN_PASSWORD_HASH` | string | — | No | bcrypt hash of the admin password |
| `ADMIN_SECRET_KEY` | string | — | No | Secret key for signing sessions |
| `NSELF_ADMIN_VERSION` | string | — | No | Admin Docker image tag |
| `NSELF_ADMIN_ROUTE` | string | — | No | nginx route override |

### Features (v1.2 Preview)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `NSELF_ADMIN_MULTIUSER` | boolean | `false` | No | Enable multi-user Admin UI (v1.2 preview). When `false` (default), the `/users`, `/tenant/*`, and `/auth/roles` pages are hidden and API endpoints return HTTP 404. Multi-user Admin is not wired in v1.0.9; pages show a "preview" banner when enabled. Full multi-user GA target: v1.2.0 (Q3 2026). |

## See Also

- **Full ecosystem reference:** [F09 — Environment Variable Inventory](https://github.com/nself-org/nself/blob/main/.claude/docs/sport/F09-ENV-VAR-INVENTORY.md)
- **Admin architecture:** [Architecture.md](./Architecture.md)
- **Single-user posture:** [Docs — Single-User Posture](https://docs.nself.org/admin/single-user-posture)
