# License Management

The License Management pages in Admin UI let you set, view, and revoke your ɳSelf plugin license without using the terminal.

---

## Accessing License Pages

Go to **License** (Zone Z07) in the Admin sidebar.

---

## LicensePanel

The LicensePanel shows:

| Field             | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| License key       | Truncated key (`nself_pro_xxxxx...****`)                         |
| Tier              | Free / Any bundle ($0.99/mo) / ɳSelf+ ($3.99/mo or $39.99/yr)    |
| Status            | Active / Expired / Revoked                                       |
| Expiry            | Date (for annual subscriptions) or "Monthly , renews MM/DD/YYYY" |
| Installed plugins | Count of pro plugins currently installed                         |

---

## Setting a License

1. Go to **License → Set License**.
2. Paste your license key (starts with `nself_pro_`).
3. Click **Activate**. The Admin UI runs `nself license set <key>`.
4. The LicensePanel refreshes to show the new tier.

---

## License Tiers

| Tier       | Monthly  | Annual    | Plugins included                     |
| ---------- | -------- | --------- | ------------------------------------ |
| Free       | $0       | $0        | 25 free plugins only                 |
| Any bundle | $0.99/mo | $9.99/yr  | All plugins in that bundle (per F06) |
| ɳSelf+     | $3.99/mo | $39.99/yr | All 5 bundles + all apps + support   |

---

## Revoking / Removing a License

1. Go to **License → Remove License**.
2. Confirm: "This will remove your license key and disable paid plugins on next build."
3. On confirm: runs `nself license revoke`. Paid plugins go dormant on the next `nself build`.

Dormant plugins remain installed on disk but do not start with the stack. They show a "License required" status in the Plugin Marketplace.

---

## Buying a License

The License page includes a link to `nself.org/pricing` for purchasing. Licenses are managed on nself.org, the Admin UI does not handle billing directly.
