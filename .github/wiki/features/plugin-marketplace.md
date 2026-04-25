# Plugin Marketplace

The Plugin Marketplace in Admin UI lets you browse, install, upgrade, and uninstall plugins without opening a terminal.

---

## Accessing the Marketplace

Go to **Plugins → Marketplace** (Zone Z06) in the Admin sidebar.

---

## PluginInstallMatrix

The PluginInstallMatrix is the main view. It shows all available plugins in a grid:

| Column   | Description                                                   |
| -------- | ------------------------------------------------------------- |
| Name     | Plugin display name (ɳ-prefixed for paid)                     |
| Category | One of the 13 official categories                             |
| Status   | Installed / Not installed / Upgrade available                 |
| Tier     | Free / Any bundle ($0.99/mo) / ɳSelf+ ($3.99/mo or $39.99/yr) |
| Price    | $0 (free) or bundle price                                     |
| Action   | Install / Upgrade / Uninstall button                          |

---

## Install Flow

1. Click **Install** on any plugin row.
2. For free plugins: install starts immediately. Output Viewer shows `nself plugin install <name>` progress.
3. For paid plugins: the License panel checks your active license tier. If your tier includes the plugin, install proceeds. If not, you see an upgrade prompt.
4. After install: Admin runs `nself build` to regenerate `docker-compose.yml`. Output Viewer shows build progress.
5. You are prompted to restart services: **Restart Now** or **Restart Later**.

---

## Upgrade Flow

When a newer version of an installed plugin is available:

1. An **Upgrade** badge appears on the plugin row.
2. Click **Upgrade**. The upgrade runs `nself plugin upgrade <name>`.
3. After upgrade: rebuild + optional restart (same as install flow).

---

## Uninstall Flow

1. Click **Uninstall** on an installed plugin.
2. Confirmation dialog: "This will remove the plugin and run nself build. Continue?"
3. On confirm: runs `nself plugin uninstall <name>` → rebuild → optional restart.

---

## License Check

The Admin UI calls `ping.nself.org/license/validate` to check the current license tier before any paid plugin install. If the license check fails (network error), install is blocked with a "Could not validate license — check your connection" error.
