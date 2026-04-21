# License Management

The License Management pages in Admin UI let you set, view, and revoke your nSelf plugin license without using the terminal.

---

## Accessing License Pages

Go to **License** (Zone Z07) in the Admin sidebar.

---

## LicensePanel

The LicensePanel shows:

| Field             | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| License key       | Truncated key (`nself_pro_xxxxx...****`)                         |
| Tier              | Free / Basic / Pro / Elite / Business / Business+ / Enterprise   |
| Status            | Active / Expired / Revoked                                       |
| Expiry            | Date (for annual subscriptions) or "Monthly — renews MM/DD/YYYY" |
| Installed plugins | Count of pro plugins currently installed                         |

---

## Setting a License

1. Go to **License → Set License**.
2. Paste your license key (starts with `nself_pro_`).
3. Click **Activate**. The Admin UI runs `nself license set <key>`.
4. The LicensePanel refreshes to show the new tier.

---

## License Tiers

| Tier       | Monthly   | Annual     | Plugins included             |
| ---------- | --------- | ---------- | ---------------------------- |
| Free       | $0        | $0         | 25 free plugins only         |
| Basic      | $0.99/mo  | $9.99/yr   | 55 standard pro plugins      |
| Pro        | $1.99/mo  | $19.99/yr  | Basic + AI suite             |
| Elite      | $4.99/mo  | $49.99/yr  | Pro + email support          |
| Business   | $9.99/mo  | $99.99/yr  | Elite + 24h support          |
| Business+  | $49.99/mo | $499.99/yr | Business + dedicated channel |
| Enterprise | $99.99/mo | $999.99/yr | Business+ + managed DevOps   |

---

## Revoking / Removing a License

1. Go to **License → Remove License**.
2. Confirm: "This will remove your license key and disable paid plugins on next build."
3. On confirm: runs `nself license revoke`. Paid plugins go dormant on the next `nself build`.

Dormant plugins remain installed on disk but do not start with the stack. They show a "License required" status in the Plugin Marketplace.

---

## Buying a License

The License page includes a link to `nself.org/pricing` for purchasing. Licenses are managed on nself.org — the Admin UI does not handle billing directly.
