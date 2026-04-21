# Admin UI — 17-Zone Information Architecture

The Admin UI v2 (P94 modernization) is organized into 17 distinct zones. Each zone corresponds to a section of the nSelf CLI surface. The goal is full 47-command CLI surface coverage — every CLI command must be reachable through the Admin UI.

---

## Zone Map

| Zone | Name            | CLI surface covered                   | Route                  |
| ---- | --------------- | ------------------------------------- | ---------------------- |
| Z01  | Dashboard       | status, health, doctor                | `/`                    |
| Z02  | Services        | start, stop, restart, service         | `/services`            |
| Z03  | Build           | build                                 | `/build`               |
| Z04  | Config          | config, env                           | `/config`              |
| Z05  | Plugins         | plugin install/uninstall/upgrade/list | `/plugins`             |
| Z06  | Marketplace     | plugin marketplace                    | `/plugins/marketplace` |
| Z07  | License         | license set/revoke/status             | `/license`             |
| Z08  | Deploy          | deploy, promote                       | `/deploy`              |
| Z09  | Logs            | logs, monitor                         | `/logs`                |
| Z10  | Database        | db, migrate                           | `/database`            |
| Z11  | Backup & DR     | backup, dr                            | `/backup`              |
| Z12  | Security        | security, waf, trust, secrets         | `/security`            |
| Z13  | Monitoring      | Grafana embed, alerts                 | `/monitoring`          |
| Z14  | AI              | ai, claw                              | `/ai`                  |
| Z15  | Custom Services | custom-service (CS_N management)      | `/services/custom`     |
| Z16  | Audit           | audit                                 | `/audit`               |
| Z17  | Settings        | admin UI preferences, env switcher    | `/settings`            |

---

## Environment Switcher (Z17)

The environment switcher allows the Admin UI (running locally) to target three backend environments:

- **Local** — `nself start` stack on the user's machine
- **Staging** — Hetzner `167.235.233.65`
- **Production** — Hetzner `5.75.235.42` (red-tint guard active)

When targeting Production, the UI activates a red-tint overlay on all destructive action buttons. The user must confirm a "You are in PRODUCTION" banner before any state-changing CLI command is dispatched.

---

## 7-State Page System

Every Admin UI page implements 7 states:

| State     | Trigger                                | UI                       |
| --------- | -------------------------------------- | ------------------------ |
| Loading   | Data fetch in progress                 | Skeleton loader          |
| Populated | Data loaded successfully               | Normal view              |
| Empty     | No data (e.g., no plugins installed)   | Empty state with CTA     |
| Error     | Network error / CLI command failed     | Error card with retry    |
| Offline   | No connection to target backend        | Offline banner           |
| Mismatch  | Admin version differs from CLI version | Version mismatch warning |
| Revoked   | License revoked / plugin dormant       | Revoked state card       |

---

## State Management

- **Zustand** — React state stores for UI-side state (modal open, selected env, active zone)
- **LokiJS** — Local in-memory DB for sessions, activity_log, saved_queries, ui_preferences
- LokiJS data persists to `localStorage` (IndexedDB adapter) and survives page refresh

---

## Related

- `features/env-switcher.md` — env switcher detail
- `features/output-viewer.md` — SSE streaming output
- `features/plugin-marketplace.md` — plugin install/upgrade UI
- `features/license-management.md` — license pages
- `development/components.md` — UI component library
