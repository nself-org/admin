# Admin Guide (Vite SPA)

The nSelf admin companion (`localhost:3021`) is a local-only Vite SPA for
managing your nSelf installation. It connects to the nSelf stack via the
nginx health endpoint and API routes.

---

## Prerequisites

- nSelf stack running: `nself start`
- Admin available at: http://localhost:3021
- Session TTL: 24 hours (password-based, LokiJS store)

---

## 7-State UI Contract

Every admin panel implements the **7-state AsyncScreen contract**. Regardless
of which panel you open, you will see one of these states:

| State | When shown | What to do |
|---|---|---|
| **Loading** | Data fetch in progress | Wait |
| **Offline** | nSelf stack not running | Run `nself start` in your terminal, then click **Check again** |
| **Auth-expired** | 24h session ended | Enter password in the login overlay |
| **Error** | Fetch or API failure | Click **Retry**; check logs if persistent |
| **Empty** | No data to display | Follow the in-panel CTA |
| **Rate-limited** | Too many requests | Wait for the timer, then retry |
| **Ready** | Data loaded | Use the panel normally |

The "Offline" state means the **nSelf stack is not running** — not a network
or permission problem. Run `nself start` to resolve it.

---

## Panels

### Service Health

Displays all nSelf services (postgres, hasura, nginx, redis, etc.) with their
current status: Running, Starting, Stopped, Error.

Empty state: "No services running — run `nself start`."

### Database Console

Run arbitrary SQL against the nSelf Postgres database. Admin has full SQL
access — no query-type restrictions.

- Input validated: non-empty only (Zod)
- Results displayed in a scrollable table
- Row count and execution time shown

### Backup Panel

Create and list nSelf backups.

- Backup name: alphanumeric, hyphens, underscores; max 50 chars
- Each backup shows: name, date, type, size, status
- Empty state: "No backups yet — create your first backup above."

### Deployment UI

Multi-environment deployment status and control.

- Environment switcher: Local / Staging / Production
- Deployment timeline with step-by-step status
- Shows version and last-deployed timestamp per environment

### SSL Panel

Certificate status for all configured domains.

- Status: Valid, Expiring soon, Expired, Missing
- Shows expiry date and days remaining
- Issuer displayed where available

### GraphQL Playground

Embedded Hasura GraphQL console (iframe).

- Opens the Hasura console URL proxied through the admin
- "Open in new tab" link available for full-screen use

### Web Terminal

Browser-based terminal for nSelf CLI commands.

- Commands run via `/api/terminal/exec` (not a direct shell)
- Enter key submits; exit code shown on failure
- Output history persists for the browser session

### Grafana Integration

Embedded Grafana dashboard for nSelf metrics.

- Shows system metrics: CPU, memory, request rates, error rates
- "Open in new tab" for full Grafana experience

### Plugin Config

View and toggle all installed nSelf plugins.

- Toggle enabled/disabled per plugin
- Shows tier (free/paid) and description
- Optimistic UI update on toggle

---

## Smoke Test Checklist

Run these to verify admin works after a stack update:

1. **SQL**: Open Database Console → type `SELECT 1;` → click Run → verify a result row appears.
2. **Backup**: Open Backup Panel → enter a name → click Create backup → verify it appears in the list.
3. **Health**: Open Service Health → verify running containers are listed with green status.
4. **Grafana**: Open Grafana Panel → verify the iframe loads with metrics data.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| All panels show "offline" | nSelf stack not running | `nself start` |
| Login overlay appears | Session expired (24h) | Re-enter admin password |
| SQL returns an error | Invalid query | Check syntax; admin has full access so all queries are forwarded as-is |
| Backup fails | Disk space | `df -h` on the host; free space or adjust retention |
| Grafana iframe blank | Grafana service not healthy | `nself status grafana`; check logs |
