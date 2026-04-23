# Account Panel

The account panel in ɳSelf Admin provides pages for managing your nSelf account, licenses, team seats, and audit events. All pages require an active session and delegate data fetches to the O04 auth service via `NSELF_AUTH_URL`.

## Pages

### /account

Shows the authenticated operator's account summary:

- Email address
- Subscription tier
- License count (with link to /licenses when count is 0)
- Last login timestamp

Handles 7 UI states: loading skeleton, populated data, empty (no licenses), error, offline (auth service unreachable), permission-denied (session expired), and rate-limited.

### /licenses

Sortable table of license keys:

| Column | Sortable |
|--------|---------|
| Key prefix | Yes |
| Tier | Yes |
| Status | Yes |
| Machine-bound | No |
| Expires | No |
| Action | No |

Activate binds the license to the instance device-id (read from `~/.config/nself/device-id`). Deactivate releases the binding.

### /team

Available only when `NSELF_ADMIN_MULTIUSER=true`. Shows a table of team seats with role selector and revoke button. An invite form sits above the table.

When `NSELF_ADMIN_MULTIUSER=false` (default), the page shows a "Multi-user admin is disabled" message with a link to the docs.

### /audit-log

Cursor-paginated table of account-scoped security events from the auth service. Filters: event type, actor email, date range. Exports to CSV via the Export button in the page header.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NSELF_AUTH_URL` | (empty) | Base URL of the O04 auth service. When empty, all account pages return stub/offline data. |

When `NSELF_AUTH_URL` is not set, all account pages render with `offline: true` — they show stub data or empty lists rather than errors, so standalone installs (no cloud auth service) still work.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/account/me` | GET | Operator email, tier, license count, last login |
| `/api/account/licenses` | GET | License list |
| `/api/account/licenses/[id]/activate` | POST | Bind license to device |
| `/api/account/licenses/[id]/deactivate` | POST | Release license binding |
| `/api/account/team` | GET | Team seats (requires NSELF_ADMIN_MULTIUSER=true) |
| `/api/account/team/invite` | POST | Invite a team member |
| `/api/account/team/[userId]` | DELETE | Revoke a seat |
| `/api/account/team/[userId]` | PATCH | Change seat role |
| `/api/account/audit` | GET | Cursor-paginated audit events |

## Accessibility

All account panel pages follow WCAG 2.1 AA:

- Skip navigation link on every page
- Heading focused on mount via `tabIndex={-1}` for screen reader page announcement
- `aria-live="polite"` on offline status messages
- `aria-live="assertive"` on error alerts with `role="alert"`
- `aria-sort` on sortable table columns (/licenses)
- `aria-label` on all icon-only buttons
- Skeleton loaders carry `aria-busy="true"` and `aria-label`
- Pagination has `role="navigation"` and per-button `aria-label`
