export interface NavLink {
  title: string
  href: string
  icon?: string
  badge?: string | { text: string; color: string }
  description?: string
  external?: boolean
  disabled?: boolean
  status?: 'running' | 'stopped' | 'error' | 'healthy' | 'unhealthy'
  submenu?: Array<{
    label?: string
    href?: string
    status?: 'running' | 'stopped' | 'error'
    separator?: boolean
    external?: boolean
  }>
}

export interface NavGroup {
  title: string
  collapsed?: boolean
  position?: 'top' | 'bottom'
  links: Array<NavLink>
}

export const navigation: Array<NavGroup> = [
  // ── Overview ──────────────────────────────────────────────
  {
    title: 'Overview',
    links: [
      {
        title: 'Dashboard',
        href: '/',
        icon: 'layout-dashboard',
        description: 'System overview and metrics',
      },
      {
        title: 'Search',
        href: '/search',
        icon: 'search',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Advanced search across all data',
      },
      {
        title: 'Services',
        href: '/services',
        icon: 'box',
        description: 'Service management and monitoring',
        submenu: [
          { label: 'All Services', href: '/services' },
          { label: 'Service Health', href: '/services/health' },
          { label: 'Service Logs', href: '/services/logs' },
          { separator: true },
          { label: 'Scaffold', href: '/services/scaffold' },
          { label: 'Discovery', href: '/services/discovery' },
        ],
      },
      {
        title: 'Configuration',
        href: '/config',
        icon: 'settings',
        description: 'System configuration',
        submenu: [
          { label: 'Environment', href: '/config/env' },
          { label: 'Secrets', href: '/config/secrets' },
          { label: 'Vault', href: '/config/vault' },
          { label: 'SSL/TLS', href: '/config/ssl' },
          { label: 'CORS', href: '/config/cors' },
          { label: 'Rate Limits', href: '/config/rate-limits' },
          { label: 'Email', href: '/config/email' },
          { label: 'Docker', href: '/config/docker' },
          { label: 'Validate', href: '/config/validate' },
          { separator: true },
          { label: 'Sync', href: '/config/sync' },
          { label: 'Export', href: '/config/export' },
          { label: 'Import', href: '/config/import' },
        ],
      },
      {
        title: 'Doctor',
        href: '/doctor',
        icon: 'heart-pulse',
        description: 'System diagnostics and health',
      },
    ],
  },
  // ── Data ──────────────────────────────────────────────────
  {
    title: 'Data',
    links: [
      {
        title: 'Database',
        href: '/database',
        icon: 'database',
        description: 'Database management tools',
        submenu: [
          { label: 'Overview', href: '/database' },
          { label: 'SQL Console', href: '/database/sql' },
          { label: 'Schema', href: '/database/schema' },
          { label: 'Migrations', href: '/database/migrations' },
          { label: 'Seeds', href: '/database/seed' },
          { label: 'Backup', href: '/database/backup' },
          { label: 'Restore', href: '/database/restore' },
          { label: 'Inspect', href: '/database/inspect' },
          { label: 'Types', href: '/database/types' },
          { label: 'Mock Data', href: '/database/mock' },
        ],
      },
      {
        title: 'Storage',
        href: '/stack/minio',
        icon: 'hard-drive',
        description: 'Object storage (MinIO)',
      },
      {
        title: 'Cache',
        href: '/stack/redis',
        icon: 'zap',
        description: 'Cache service (Redis)',
      },
    ],
  },
  // ── Core Stack ────────────────────────────────────────────
  {
    title: 'Core Stack',
    collapsed: true,
    links: [
      {
        title: 'PostgreSQL',
        href: '/stack/postgresql',
        icon: 'database',
        status: 'running',
        description: 'PostgreSQL database',
      },
      {
        title: 'Hasura',
        href: '/stack/hasura',
        icon: 'git-branch',
        status: 'running',
        description: 'GraphQL Engine',
      },
      {
        title: 'Auth',
        href: '/stack/auth',
        icon: 'shield',
        status: 'running',
        description: 'Authentication service',
      },
      {
        title: 'MinIO',
        href: '/stack/minio',
        icon: 'hard-drive',
        status: 'running',
        description: 'Object storage',
      },
      {
        title: 'Redis',
        href: '/stack/redis',
        icon: 'zap',
        status: 'running',
        description: 'Cache service',
      },
      {
        title: 'Nginx',
        href: '/stack/nginx',
        icon: 'server',
        status: 'running',
        description: 'Reverse proxy',
      },
      {
        title: 'MailHog',
        href: '/stack/mailhog',
        icon: 'mail',
        description: 'Email testing',
      },
    ],
  },
  // ── Services ─────────────────────────────────────────────
  {
    title: 'Services',
    collapsed: true,
    links: [
      {
        title: 'Service Scaffold',
        href: '/services/scaffold',
        icon: 'blocks',
        description: 'Scaffold new services',
      },
      {
        title: 'Storage',
        href: '/services/storage',
        icon: 'hard-drive',
        description: 'Object storage management',
      },
      {
        title: 'Email',
        href: '/services/email',
        icon: 'mail',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Email service management',
      },
      {
        title: 'Search Engine',
        href: '/services/search-engine',
        icon: 'search',
        description: 'Full-text search service',
      },
      {
        title: 'Cache',
        href: '/services/cache',
        icon: 'database',
        description: 'Cache service management',
      },
      {
        title: 'Functions',
        href: '/services/functions',
        icon: 'function-square',
        description: 'Serverless functions',
      },
      {
        title: 'MLflow',
        href: '/services/mlflow',
        icon: 'brain',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'ML experiment tracking',
      },
      {
        title: 'Real-Time',
        href: '/services/realtime',
        icon: 'radio',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'WebSocket & real-time messaging',
      },
    ],
  },
  // ── Auth & Security ───────────────────────────────────────
  {
    title: 'Auth & Security',
    collapsed: true,
    links: [
      {
        title: 'OAuth Providers',
        href: '/auth/oauth',
        icon: 'key',
        description: 'OAuth providers',
      },
      {
        title: 'MFA Setup',
        href: '/auth/mfa',
        icon: 'smartphone',
        description: 'Multi-factor authentication',
      },
      {
        title: 'Roles',
        href: '/auth/roles',
        icon: 'users',
        description: 'User roles and permissions',
      },
      {
        title: 'Devices',
        href: '/auth/devices',
        icon: 'monitor',
        description: 'Device management',
      },
      {
        title: 'Security',
        href: '/auth/security',
        icon: 'shield-check',
        description: 'Security settings',
      },
      {
        title: 'Rate Limits',
        href: '/auth/rate-limits',
        icon: 'gauge',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'API rate limiting',
      },
      {
        title: 'Webhooks',
        href: '/auth/webhooks',
        icon: 'webhook',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Auth webhooks',
      },
      {
        title: 'API Keys',
        href: '/settings/api-keys',
        icon: 'key',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'API key management',
        submenu: [
          { label: 'All Keys', href: '/settings/api-keys' },
          { label: 'Create Key', href: '/settings/api-keys/new' },
        ],
      },
      {
        title: 'Audit Log',
        href: '/audit',
        icon: 'scroll-text',
        description: 'Authentication audit log',
      },
    ],
  },
  // ── Multi-Tenancy ─────────────────────────────────────────
  {
    title: 'Multi-Tenancy',
    collapsed: true,
    links: [
      {
        title: 'Tenants',
        href: '/tenant',
        icon: 'building-2',
        description: 'Tenant management',
        submenu: [
          { label: 'All Tenants', href: '/tenant' },
          { label: 'Create Tenant', href: '/tenant/create' },
        ],
      },
      {
        title: 'Organizations',
        href: '/org',
        icon: 'building',
        description: 'Organization management',
        submenu: [
          { label: 'All Organizations', href: '/org' },
          { label: 'Create Organization', href: '/org/create' },
        ],
      },
    ],
  },
  // ── Deployment ────────────────────────────────────────────
  {
    title: 'Deployment',
    links: [
      {
        title: 'Environments',
        href: '/environments',
        icon: 'layers',
        description: 'Environment management',
        submenu: [
          { label: 'Overview', href: '/environments' },
          { label: 'Local', href: '/environments/local' },
          { label: 'Staging', href: '/environments/staging' },
          { label: 'Production', href: '/environments/production' },
          { label: 'Compare', href: '/environments/diff' },
        ],
      },
      {
        title: 'Deploy',
        href: '/deploy',
        icon: 'rocket',
        description: 'Deployment management',
        submenu: [
          { label: 'Overview', href: '/deploy' },
          { label: 'Preview', href: '/deploy/preview' },
          { label: 'Canary', href: '/deploy/canary' },
          { label: 'Blue-Green', href: '/deploy/blue-green' },
          { label: 'Rollback', href: '/deploy/rollback' },
        ],
      },
      {
        title: 'CI/CD',
        href: '/cicd',
        icon: 'git-merge',
        description: 'CI/CD pipelines',
      },
      {
        title: 'Sync',
        href: '/sync',
        icon: 'refresh-cw',
        description: 'Data synchronization',
        submenu: [
          { label: 'Overview', href: '/sync' },
          { label: 'History', href: '/sync/history' },
        ],
      },
      {
        title: 'History',
        href: '/history',
        icon: 'clock',
        description: 'Operation history',
        submenu: [
          { label: 'All', href: '/history' },
          { label: 'Deployments', href: '/history/deployments' },
          { label: 'Migrations', href: '/history/migrations' },
          { label: 'Commands', href: '/history/commands' },
        ],
      },
    ],
  },
  // ── Monitoring ────────────────────────────────────────────
  {
    title: 'Monitoring',
    links: [
      {
        title: 'Metrics',
        href: '/monitor/metrics',
        icon: 'activity',
        description: 'System metrics',
      },
      {
        title: 'Activity Feed',
        href: '/activity',
        icon: 'activity',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Real-time activity tracking',
      },
      {
        title: 'Alerts',
        href: '/monitor/alerts',
        icon: 'bell',
        description: 'Alert management',
      },
      {
        title: 'Grafana',
        href: '/monitor/grafana',
        icon: 'bar-chart',
        description: 'Grafana dashboards',
      },
      {
        title: 'Logs',
        href: '/monitor/logs',
        icon: 'file-text',
        description: 'Log viewer',
      },
      {
        title: 'Traces',
        href: '/monitor/traces',
        icon: 'git-branch',
        description: 'Distributed tracing',
      },
    ],
  },
  // ── Analytics & Automation ─────────────────────────────────
  {
    title: 'Analytics & Automation',
    collapsed: true,
    links: [
      {
        title: 'Dashboards',
        href: '/dashboards',
        icon: 'layout-dashboard',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Custom analytics dashboards',
        submenu: [
          { label: 'All Dashboards', href: '/dashboards' },
          { label: 'Create Dashboard', href: '/dashboards/new' },
        ],
      },
      {
        title: 'Reports',
        href: '/reports',
        icon: 'file-bar-chart',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Generate and schedule reports',
        submenu: [
          { label: 'Templates', href: '/reports' },
          { label: 'Executions', href: '/reports/executions' },
        ],
      },
      {
        title: 'Workflows',
        href: '/workflows',
        icon: 'workflow',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Automated workflow management',
        submenu: [
          { label: 'All Workflows', href: '/workflows' },
          { label: 'Create Workflow', href: '/workflows/new' },
        ],
      },
    ],
  },
  // ── Infrastructure ────────────────────────────────────────
  {
    title: 'Infrastructure',
    collapsed: true,
    links: [
      {
        title: 'Providers',
        href: '/cloud/providers',
        icon: 'cloud',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Cloud providers',
      },
      {
        title: 'Servers',
        href: '/cloud/servers',
        icon: 'server',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Server management',
      },
      {
        title: 'Kubernetes',
        href: '/k8s',
        icon: 'ship',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'K8s management',
        submenu: [
          { label: 'Overview', href: '/k8s' },
          { label: 'Clusters', href: '/k8s/clusters' },
          { label: 'Deployments', href: '/k8s/deploy' },
          { label: 'Namespaces', href: '/k8s/namespaces' },
          { label: 'Logs', href: '/k8s/logs' },
          { label: 'Scale', href: '/k8s/scale' },
        ],
      },
      {
        title: 'Helm',
        href: '/helm',
        icon: 'anchor',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Helm charts',
        submenu: [
          { label: 'Releases', href: '/helm' },
          { label: 'Install', href: '/helm/install' },
          { label: 'Values', href: '/helm/values' },
          { label: 'Repositories', href: '/helm/repos' },
        ],
      },
      {
        title: 'Cost Analysis',
        href: '/cloud/costs',
        icon: 'dollar-sign',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Cloud cost tracking',
      },
    ],
  },
  // ── Performance ───────────────────────────────────────────
  {
    title: 'Performance',
    collapsed: true,
    links: [
      {
        title: 'Profile',
        href: '/performance/profile',
        icon: 'gauge',
        badge: { text: 'Soon', color: 'zinc' },
        disabled: true,
        description: 'Performance profiling',
      },
      {
        title: 'Benchmark',
        href: '/benchmark',
        icon: 'timer',
        description: 'Benchmarking tools',
        submenu: [
          { label: 'Overview', href: '/benchmark' },
          { label: 'Run', href: '/benchmark/run' },
          { label: 'Baseline', href: '/benchmark/baseline' },
          { label: 'Compare', href: '/benchmark/compare' },
        ],
      },
      {
        title: 'Scale',
        href: '/scale',
        icon: 'maximize',
        description: 'Service scaling',
        submenu: [
          { label: 'Overview', href: '/scale' },
          { label: 'Autoscaling', href: '/scale/auto' },
        ],
      },
      {
        title: 'Optimize',
        href: '/performance/optimize',
        icon: 'zap',
        badge: { text: 'Soon', color: 'zinc' },
        disabled: true,
        description: 'Optimization suggestions',
      },
    ],
  },
  // ── Plugins ───────────────────────────────────────────────
  {
    title: 'Plugins',
    collapsed: true,
    links: [
      {
        title: 'Plugins',
        href: '/plugins',
        icon: 'plug',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Third-party integrations',
        submenu: [
          { label: 'Installed', href: '/plugins' },
          { label: 'Marketplace', href: '/plugins/marketplace' },
        ],
      },
      {
        title: 'Stripe',
        href: '/plugins/stripe',
        icon: 'credit-card',
        description: 'Payment processing',
        submenu: [
          { label: 'Dashboard', href: '/plugins/stripe' },
          { label: 'Customers', href: '/plugins/stripe/customers' },
          { label: 'Subscriptions', href: '/plugins/stripe/subscriptions' },
          { label: 'Invoices', href: '/plugins/stripe/invoices' },
          { label: 'Products', href: '/plugins/stripe/products' },
          { label: 'Webhooks', href: '/plugins/stripe/webhooks' },
        ],
      },
      {
        title: 'GitHub',
        href: '/plugins/github',
        icon: 'github',
        description: 'DevOps integration',
        submenu: [
          { label: 'Dashboard', href: '/plugins/github' },
          { label: 'Repositories', href: '/plugins/github/repos' },
          { label: 'Issues', href: '/plugins/github/issues' },
          { label: 'Pull Requests', href: '/plugins/github/prs' },
          { label: 'Actions', href: '/plugins/github/actions' },
        ],
      },
      {
        title: 'Shopify',
        href: '/plugins/shopify',
        icon: 'shopping-cart',
        description: 'E-commerce sync',
        submenu: [
          { label: 'Dashboard', href: '/plugins/shopify' },
          { label: 'Products', href: '/plugins/shopify/products' },
          { label: 'Orders', href: '/plugins/shopify/orders' },
          { label: 'Customers', href: '/plugins/shopify/customers' },
          { label: 'Inventory', href: '/plugins/shopify/inventory' },
        ],
      },
      {
        title: 'Notify',
        href: '/notify',
        icon: 'bell',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Multi-channel notifications',
      },
      {
        title: 'Cron',
        href: '/cron',
        icon: 'clock',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Scheduled jobs',
      },
      {
        title: 'ɳClaw',
        href: '/nclaw',
        icon: 'bot',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'AI assistant plugin management',
        submenu: [
          { label: 'Overview', href: '/nclaw' },
          { label: 'Connected Accounts', href: '/nclaw?section=accounts' },
          { label: 'Companion Devices', href: '/nclaw?section=devices' },
          { label: 'Security', href: '/nclaw?section=security' },
          { label: 'Plugin Secrets', href: '/nclaw?section=secrets' },
          { label: 'Logs', href: '/nclaw?section=logs' },
        ],
      },
      {
        title: 'Mux',
        href: '/mux/rules',
        icon: 'git-merge',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'Email/webhook pipeline engine',
        submenu: [
          { label: 'Rules', href: '/mux/rules' },
          { label: 'Recent Runs', href: '/mux/runs' },
          { label: 'Dead Letter Queue', href: '/mux/dead-letter' },
        ],
      },
    ],
  },
  // ── Dev Tools ─────────────────────────────────────────────
  {
    title: 'Dev Tools',
    collapsed: true,
    links: [
      {
        title: 'GraphQL',
        href: '/dev/graphql',
        icon: 'git-branch',
        description: 'GraphQL playground',
      },
      {
        title: 'API Explorer',
        href: '/dev/api',
        icon: 'code',
        description: 'REST API testing',
      },
      {
        title: 'Terminal',
        href: '/dev/terminal',
        icon: 'terminal',
        description: 'Web terminal',
      },
      {
        title: 'Frontend Apps',
        href: '/frontend',
        icon: 'layout',
        description: 'Frontend apps',
        submenu: [
          { label: 'All Apps', href: '/frontend' },
          { label: 'Add App', href: '/frontend/add' },
        ],
      },
      {
        title: 'CI/CD Gen',
        href: '/dev/cicd-gen',
        icon: 'git-merge',
        badge: { text: 'Soon', color: 'zinc' },
        disabled: true,
        description: 'CI/CD pipeline generator',
      },
      {
        title: 'SDK Gen',
        href: '/dev/sdk-gen',
        icon: 'package',
        badge: { text: 'Soon', color: 'zinc' },
        disabled: true,
        description: 'SDK generator',
      },
      {
        title: 'Docs Gen',
        href: '/dev/docs-gen',
        icon: 'file-text',
        badge: { text: 'Soon', color: 'zinc' },
        disabled: true,
        description: 'Documentation generator',
      },
      {
        title: 'Testing',
        href: '/dev/testing',
        icon: 'check-circle',
        badge: { text: 'Soon', color: 'zinc' },
        disabled: true,
        description: 'Test runners',
      },
      {
        title: 'White Label',
        href: '/dev/white-label',
        icon: 'palette',
        badge: { text: 'Soon', color: 'zinc' },
        disabled: true,
        description: 'White label configuration',
      },
      {
        title: 'Scaffolding',
        href: '/dev/scaffold',
        icon: 'package',
        description: 'Code scaffolding',
      },
      {
        title: 'Type Generator',
        href: '/dev/types',
        icon: 'file-code',
        description: 'Generate TypeScript types',
      },
      {
        title: 'Webhooks',
        href: '/dev/webhooks',
        icon: 'webhook',
        description: 'Webhook management',
      },
    ],
  },
  // ── System ────────────────────────────────────────────────
  {
    title: 'System',
    position: 'bottom',
    links: [
      {
        title: 'Notifications',
        href: '/notifications',
        icon: 'bell',
        badge: { text: 'NEW', color: 'emerald' },
        description: 'System notifications',
        submenu: [
          { label: 'All Notifications', href: '/notifications' },
          { label: 'Settings', href: '/notifications/settings' },
        ],
      },
      {
        title: 'URLs',
        href: '/system/urls',
        icon: 'link',
        description: 'Service URLs',
      },
      {
        title: 'Updates',
        href: '/system/updates',
        icon: 'download',
        description: 'System updates',
      },
      {
        title: 'Help',
        href: '/system/help',
        icon: 'help-circle',
        description: 'Help & support',
      },
    ],
  },
]

export const flatNavigation = navigation.flatMap((group) =>
  group.links.flatMap((link) => [
    link,
    ...(link.submenu
      ?.filter((item) => !item.separator)
      .map((subitem) => ({
        ...subitem,
        title: subitem.label,
        parent: link.title,
      })) || []),
  ]),
)

export function findNavItem(href: string) {
  return flatNavigation.find((item) => item.href === href)
}

export function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = []

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    const item = findNavItem(currentPath)
    if (item) {
      breadcrumbs.push({
        title: item.title,
        href: currentPath,
      })
    }
  }

  return breadcrumbs
}
