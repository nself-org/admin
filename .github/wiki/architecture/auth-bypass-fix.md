# Auth Bypass Fix — Service Absence Gate

**Introduced:** P98 T13 (2026-04-30)
**Severity:** Critical
**Status:** Fixed

## Summary

Two API route groups in nAdmin previously returned synthetic ("stub") data when their upstream services were absent or misconfigured. This created a security and correctness hazard:

- `/api/account/me` — returned a fake `admin@localhost` operator record when `NSELF_AUTH_URL` was unset or when the auth service was unreachable. A user who missed this could believe they were operating as a legitimate authenticated operator.
- `/api/vibe/{generate,stream,session}` — returned stub generation results (including a `np_stub_feature` SQL migration and a `StubFeature.tsx` component) when `vibe_api` CS_2 was not running. A user who missed the `_stub: true` flag could apply a stub migration to a live database.

## Fix

Both route groups now return **503 Service Unavailable** with an `X-Service-Required` header when the upstream is absent or unreachable. Stub data is never returned.

### `/api/account/me`

| Condition | Before | After |
|-----------|--------|-------|
| `NSELF_AUTH_URL` unset | 200 with fake operator record | 503 `X-Service-Required: auth` |
| Auth service unreachable | 503 (already correct) | 503 `X-Service-Required: auth` |
| Auth service returns non-OK | Upstream status (already correct) | Upstream status (unchanged) |

Response shape on 503:

```json
{
  "success": false,
  "error": "Auth service not configured or unreachable.",
  "service": "auth"
}
```

### `/api/vibe/{generate,stream,session}`

| Route | Condition | Before | After |
|-------|-----------|--------|-------|
| POST `/vibe/session` | vibe_api unreachable | 200 with `_stub: true` session | 503 `X-Service-Required: vibe_api` |
| POST `/vibe/generate` | vibe_api unreachable | 200 with stub SQL + TSX | 503 `X-Service-Required: vibe_api` |
| GET `/vibe/stream` | vibe_api unreachable | 200 SSE stub stream | 503 `X-Service-Required: vibe_api` |
| GET `/vibe/session` (list) | vibe_api unreachable | 200 empty list | 503 `X-Service-Required: vibe_api` |

Response shape on 503:

```json
{
  "error": "Vibe AI service is offline. Start the vibe_api custom service (CS_2) to use Vibe-Code.",
  "service": "vibe_api"
}
```

## UI Handler

The admin UI reads the `X-Service-Required` response header and shows a contextual banner when a 503 is received from a service-gated route:

- `X-Service-Required: auth` → "Auth service offline — check `NSELF_AUTH_URL` in your `.env` file."
- `X-Service-Required: vibe_api` → "Vibe AI offline — start vibe_api custom service (CS_2)."

The banner includes a link to the Services page so the operator can start the required service without leaving their current workflow.

## Env Vars

| Var | Default | Purpose |
|-----|---------|---------|
| `NSELF_AUTH_URL` | *(unset)* | URL of the O04 auth service. When unset, `/api/account/me` returns 503. |
| `NSELF_VIBE_ENABLED` | `false` | Must be `true` for vibe routes to attempt upstream contact. |
| `NSELF_VIBE_PORT` | `8003` | Port where vibe_api CS_2 listens. |

## Testing

Integration tests verify 503 + header for all four affected routes when the upstream is unavailable:

- `src/app/api/vibe/__tests__/service-offline.test.ts`
- `src/app/api/account/me/__tests__/route.test.ts`

Run: `pnpm test --testPathPattern="service-offline|account/me"`
