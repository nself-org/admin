# Admin URL Shortener, Design Spec

This document describes the URL shortener design for shareable admin deep-links. The shortener is **not built in v1.0.9**, it is a ready-to-build spec for a future minor release.

## Problem

Admin URLs can become long when multiple params are combined:

```
/monitor?tab=metrics&since=6h&filter.status=critical&selected=abc123&cursor=eyJpZCI6MTAwfQ
```

While fully functional, these URLs are awkward to paste in Slack or copy into incident tickets. A shortener would let users share `/admin/s/abc12` instead.

## Design Goals

1. Lossless, the short URL must expand to the exact original URL, including all params
2. Self-contained, the shortener state lives in the admin's LokiJS database, no external service
3. Operator-only, short links are scoped to the same admin instance (single-user, not multi-tenant)
4. Expiring, short links expire after 30 days by default (configurable)
5. No external dependency, must work fully offline

## Data Model (LokiJS)

```typescript
interface AdminShortLink {
  id: string // 6-char alphanumeric slug (e.g., 'abc123')
  fullPath: string // original path + search string (e.g., '/monitor?tab=metrics&since=6h')
  createdAt: number // Unix ms
  expiresAt: number // Unix ms (default: createdAt + 30d)
  accessCount: number // how many times the short link was clicked
}
```

## API Routes

| Method | Path                         | Purpose                                                                   |
| ------ | ---------------------------- | ------------------------------------------------------------------------- |
| `POST` | `/api/admin/shortlink`       | Create a short link; body: `{ path: string }`; returns `{ slug: string }` |
| `GET`  | `/api/admin/shortlink/:slug` | Resolve a slug; returns `{ fullPath: string }` or 404                     |

## Redirect Route

```
GET /s/:slug
```

The Next.js route `/app/s/[slug]/route.ts` resolves the slug and returns a `302` redirect to the full path. If the slug is expired or unknown, redirects to `/` with a toast param `?error=link_expired`.

## UI Integration

The `<CopyLinkButton />` component in `<PageHeader />` gains an optional **shorten** mode. When `NSELF_ADMIN_SHORTLINKS=true` (env var, default: `false`):

1. On click, `CopyLinkButton` fires `POST /api/admin/shortlink` with the current full path
2. On success, copies the short URL (`http://localhost:3021/s/abc123`) to clipboard
3. Toast reads: "Short link copied. Recipient must be signed in to view."
4. On failure, falls back to copying the full URL (current behavior)

When `NSELF_ADMIN_SHORTLINKS=false` (default), `CopyLinkButton` copies the full URL as it does today. No API call is made.

## Slug Generation

```typescript
import { randomBytes } from 'node:crypto'

function generateSlug(len = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(len)
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('')
}
```

Collision probability at 6 chars (36^6 = ~2.2B combinations) is negligible for a single-operator tool.

## Expiry Cleanup

A Next.js route handler scheduled on `setInterval` (or via the `cron` plugin if available) runs every 24h to delete expired short links from LokiJS. Alternatively, expiry is checked lazily on each resolve (if `expiresAt < Date.now()`, respond 404 and delete).

## Security Considerations

- Short links resolve only within the same admin instance (localhost:3021). No cross-instance sharing.
- The operator is authenticated before any short link is created (existing session check).
- Short link slugs contain no embedded path info, cannot be enumerated for path discovery without a valid session to resolve them.
- `NSELF_ADMIN_SHORTLINKS` is `false` by default. Opt-in only.

## Implementation Order

When building this feature:

1. Add `AdminShortLink` collection to LokiJS schema in `src/lib/database.ts`
2. Add `POST /api/admin/shortlink/route.ts` and `GET /api/admin/shortlink/[slug]/route.ts`
3. Add `src/app/s/[slug]/route.ts` for the redirect
4. Update `<CopyLinkButton />` to check `NSELF_ADMIN_SHORTLINKS` and call the API
5. Add `NSELF_ADMIN_SHORTLINKS` to `admin/.env.example` and `F09-ENV-VAR-INVENTORY.md`
6. Add expiry cleanup (lazy or scheduled)
7. Update this doc to reflect actual implementation

## Related Files

- `src/components/ui/copy-link-button.tsx`, the button that will trigger shortening
- `src/lib/database.ts`, LokiJS schema
- `.github/wiki/url-state.md`, 6-param URL vocabulary and `useUrlState` hook reference
