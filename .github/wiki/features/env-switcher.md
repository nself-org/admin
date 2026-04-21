# Environment Switcher

The Admin UI environment switcher lets you control a local, staging, or production nSelf backend from a single Admin UI running on your laptop.

---

## Environments

| Environment | Default URL                                               | Notes                                    |
| ----------- | --------------------------------------------------------- | ---------------------------------------- |
| Local       | `http://localhost`                                        | `nself start` stack on developer machine |
| Staging     | configurable (default: `https://staging.your-domain.com`) | Hetzner staging server                   |
| Production  | configurable                                              | **Red-tint guard active**                |

---

## Production Guard

When Production is selected:

1. A persistent red-tint overlay appears on all destructive action buttons (Stop, Delete, Revoke, Reset).
2. A banner at the top of every page reads: "You are targeting PRODUCTION. Changes are immediate and may be irreversible."
3. Any CLI command that modifies state (not reads) requires a second click after the production warning dialog.

The guard cannot be disabled in the UI settings. It is a hard safety feature.

---

## How It Works

The switcher sets the `NSELF_ADMIN_TARGET_ENV` env var for the Admin Docker container. The CLI wrapper inside the container reads this var and sets the appropriate `--env` flag on every `nself` command it dispatches.

```
Admin UI (localhost:3021)
  → sets NSELF_ADMIN_TARGET_ENV=production
  → CLI wrapper reads var
  → nself build --env production
  → nself deploy --env production
```

---

## Switching Environments

1. Open Admin UI at `http://localhost:3021`.
2. Click the environment badge in the top-right corner (shows `LOCAL`, `STAGING`, or `PRODUCTION`).
3. Select the target environment.
4. If switching to Production, confirm the production warning dialog.
5. All subsequent CLI commands target the new environment until you switch again.
