# Plugin Management in nself Admin

## Overview

nself Admin provides a **visual interface** for managing plugins installed via the nself CLI. While the CLI handles all plugin operations (install, remove, sync), nself Admin gives you dashboards, monitoring, and point-and-click management.

> **Note**: For complete CLI plugin documentation, see the [nself CLI docs](https://github.com/nself-org/cli). For plugin development, see [nself-plugins](https://github.com/nself-org/plugins).

---

## What nself Admin Provides

| Feature               | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| **Plugin Dashboard**  | Visual overview of installed and available plugins                |
| **Install Wizard**    | Guided installation with environment variable forms               |
| **Configuration UI**  | Edit plugin settings without touching .env files                  |
| **Sync Controls**     | One-click sync with real-time progress                            |
| **Webhook Monitor**   | View and retry webhook events                                     |
| **Plugin Dashboards** | Plugin-specific analytics (Stripe revenue, GitHub activity, etc.) |
| **Schema Viewer**     | Browse tables created by plugins                                  |

---

## Plugin Dashboard (`/plugins`)

The main plugin page shows:

### Installed Plugins Grid

Each installed plugin displays:

- Plugin name and version
- Status indicator (active, syncing, error)
- Last sync timestamp
- Quick action buttons (Sync, Configure, Remove)

### Available Plugins

Browse the plugin registry:

- Filter by category (billing, ecommerce, devops, etc.)
- Search plugins
- View plugin details before installing
- One-click install

### Health Overview

At-a-glance monitoring:

- Webhook handler status for each plugin
- Recent webhook event counts
- Sync success/failure rates
- API connection health

---

## Installing Plugins via UI

### Step 1: Browse Registry

Navigate to `/plugins` and click "Install Plugin" or browse the available plugins section.

### Step 2: Configure Environment Variables

The install wizard shows required environment variables:

```
┌─────────────────────────────────────────────────────┐
│ Install Stripe Plugin                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Required Environment Variables:                      │
│                                                      │
│ STRIPE_API_KEY *                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ sk_test_...                                     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ Optional:                                            │
│                                                      │
│ STRIPE_WEBHOOK_SECRET                               │
│ ┌─────────────────────────────────────────────────┐ │
│ │ whsec_...                                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ [Cancel]                        [Install Plugin →]  │
└─────────────────────────────────────────────────────┘
```

### Step 3: Watch Installation Progress

Real-time output from the CLI:

```
Installing stripe plugin...
✓ Downloading plugin from registry
✓ Creating database tables (8 tables)
✓ Tracking tables in Hasura
✓ Configuring relationships
✓ Starting webhook handler
✓ Updating Nginx routing
✓ Plugin installed successfully!

[Run Initial Sync]  [Go to Plugin Dashboard →]
```

---

## Plugin Detail Pages (`/plugins/[name]`)

Each installed plugin has a detail page with tabs:

### Overview Tab

- Plugin info (name, version, description)
- Status and health indicators
- Quick stats (records synced, last sync, etc.)
- Action buttons (Sync Now, Configure, Remove)

### Configuration Tab

Edit plugin settings through the UI:

- Environment variables (masked for secrets)
- Webhook URL with copy button
- Sync schedule configuration
- Test connection button

### Schema Tab

Browse database tables created by the plugin:

- Table list with row counts
- Click to view table structure
- Quick link to Hasura console
- Column types and relationships

### Sync Tab

- **Sync Now** button with real-time progress
- Sync history timeline
- Last sync details (duration, records updated)
- Schedule automatic syncs

### Webhooks Tab

Monitor incoming webhooks:

- Recent events table
- Event type, timestamp, status
- Payload preview (expandable)
- Retry failed webhooks
- Filter by status (success, failed, pending)

---

## Stripe Plugin Dashboard (`/plugins/stripe`)

When the Stripe plugin is installed, you get a dedicated revenue dashboard:

### Revenue Metrics

- **MRR** (Monthly Recurring Revenue)
- **ARR** (Annual Recurring Revenue)
- Active subscriptions count
- New vs churned this month
- Revenue chart (7/30/90 day views)

### Customer Management

- Searchable customer list
- Customer details with subscription history
- Quick link to Stripe dashboard

### Subscription Viewer

- Active subscriptions with status
- Filter by status (active, canceled, past_due)
- Subscription details and timeline

### Invoice List

- Recent invoices
- Filter by status (paid, open, overdue)
- Invoice amounts and dates

---

## GitHub Plugin Dashboard (`/plugins/github`)

DevOps overview when GitHub plugin is installed:

### Repository Overview

- Synced repositories with health indicators
- Open issues and PRs count
- Recent commits

### CI/CD Status

- GitHub Actions workflow runs
- Build success/failure rates
- Deployment status

### Activity Feed

- Recent commits, issues, PRs
- Filter by repository
- Activity timeline

---

## Shopify Plugin Dashboard (`/plugins/shopify`)

E-commerce dashboard when Shopify plugin is installed:

### Store Overview

- Total products and variants
- Active orders
- Revenue summary

### Product Catalog

- Product list with images
- Inventory levels
- Low stock alerts

### Order Management

- Recent orders table
- Filter by status
- Order details

---

## API Routes

nself Admin exposes these API routes for plugin management:

### Plugin Management

```
GET  /api/plugins                    List all plugins (installed + available)
GET  /api/plugins/installed          List installed plugins only
GET  /api/plugins/available          List available from registry
POST /api/plugins/install            Install a plugin
POST /api/plugins/remove             Remove a plugin
GET  /api/plugins/updates            Check for plugin updates
POST /api/plugins/update             Update plugin(s)
```

### Plugin Details

```
GET  /api/plugins/[name]             Plugin details and status
GET  /api/plugins/[name]/config      Get configuration
PUT  /api/plugins/[name]/config      Update configuration
GET  /api/plugins/[name]/schema      Get schema info (tables)
GET  /api/plugins/[name]/webhooks    List webhook events
POST /api/plugins/[name]/sync        Trigger sync
POST /api/plugins/[name]/action      Execute plugin action
```

### Response Format

```typescript
// Plugin list response
{
  "success": true,
  "plugins": [
    {
      "name": "stripe",
      "version": "1.2.0",
      "status": "installed",
      "lastSync": "2026-01-24T08:00:00Z",
      "health": "healthy"
    }
  ]
}

// Plugin status response
{
  "success": true,
  "plugin": {
    "name": "stripe",
    "version": "1.2.0",
    "installedAt": "2026-01-20T14:30:00Z",
    "lastSync": "2026-01-24T08:00:00Z",
    "tables": [
      { "name": "stripe_customers", "rows": 1234 },
      { "name": "stripe_subscriptions", "rows": 567 }
    ],
    "webhook": {
      "url": "https://your-domain.com/webhooks/stripe",
      "status": "active",
      "eventsToday": 234
    }
  }
}
```

---

## CLI Commands (Reference)

nself Admin wraps these CLI commands via API routes:

```bash
# These CLI commands are executed by nself-admin API routes
nself plugin list              → GET /api/plugins
nself plugin install <name>    → POST /api/plugins/install
nself plugin remove <name>     → POST /api/plugins/remove
nself plugin status <name>     → GET /api/plugins/[name]
nself plugin <name> sync       → POST /api/plugins/[name]/sync
```

For full CLI documentation, see [nself CLI Integration](CLI_INTEGRATION.md).

---

## TypeScript Interfaces

```typescript
interface Plugin {
  name: string
  version: string
  description: string
  category: 'billing' | 'ecommerce' | 'devops' | 'productivity'
  status: 'installed' | 'available' | 'update-available'
  installedAt?: string
  lastSync?: string
  health?: 'healthy' | 'warning' | 'error'
}

interface PluginTable {
  name: string
  rows: number
  size?: string
}

interface WebhookEvent {
  id: string
  type: string
  timestamp: string
  status: 'success' | 'failed' | 'pending'
  error?: string
}

interface PluginConfig {
  env: Record<string, string> // Masked values for secrets
  webhookUrl: string
  syncSchedule?: string // Cron expression
}
```

---

## Coming in v0.0.8

- [ ] Plugin dashboard page (`/plugins`)
- [ ] Plugin installation wizard
- [ ] Plugin configuration UI
- [ ] Plugin detail pages
- [ ] Webhook event monitoring
- [ ] Sync controls with progress
- [ ] Stripe revenue dashboard
- [ ] GitHub activity dashboard
- [ ] Shopify store dashboard

---

## Related Documentation

- [CLI Integration](CLI_INTEGRATION.md) - How nself-admin wraps CLI commands
- [API Reference](API.md) - Complete API documentation
- [next.md](next.md) - v0.0.8 development plan

## External Resources

- [nself CLI](https://github.com/nself-org/cli) - Full CLI documentation
- [nself Plugins](https://github.com/nself-org/plugins) - Plugin development and registry

---

_This documentation covers nself-admin's UI for plugin management. For CLI plugin commands and plugin development, see the nself CLI and nself-plugins repositories._
