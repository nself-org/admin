'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { CardGridSkeleton } from '@/components/skeletons'
import {
  Activity,
  AlertCircle,
  Book,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Command,
  Database,
  ExternalLink,
  FileText,
  Globe,
  HardDrive,
  HelpCircle,
  Info,
  Keyboard,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Monitor,
  Package,
  Play,
  Plug,
  Rocket,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  Star,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Users,
  Video,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'

// ─── Shared Types & Data ────────────────────────────────────────────────────

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  helpful: number
  notHelpful: number
}

interface VideoTutorial {
  id: string
  title: string
  description: string
  duration: string
  thumbnail: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  views: number
  rating: number
}

interface Documentation {
  id: string
  title: string
  description: string
  category: string
  lastUpdated: string
  url: string
}

interface SystemStatus {
  status: 'operational' | 'maintenance' | 'degraded' | 'outage'
  services: Array<{
    name: string
    status: 'operational' | 'degraded' | 'down'
    description?: string
  }>
  lastUpdated: string
}

interface KeyboardShortcut {
  keys: string[]
  description: string
  category: string
}

interface CLICommand {
  command: string
  description: string
  uiPath?: string
  uiLabel?: string
}

interface CLICommandGroup {
  id: string
  label: string
  icon: React.ElementType
  description: string
  commandCount: number
  commands: CLICommand[]
}

const CATEGORIES = [
  { id: 'getting-started', label: 'Getting Started', icon: Play },
  { id: 'configuration', label: 'Configuration', icon: Settings },
  { id: 'deployment', label: 'Deployment', icon: Zap },
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertCircle },
  { id: 'api', label: 'API Reference', icon: Code },
  { id: 'security', label: 'Security', icon: Shield },
]

// ─── CLI Command Reference Data ─────────────────────────────────────────────

const CLI_COMMAND_GROUPS: CLICommandGroup[] = [
  {
    id: 'core',
    label: 'Core',
    icon: Terminal,
    description: 'Essential project lifecycle commands',
    commandCount: 5,
    commands: [
      {
        command: 'nself init',
        description: 'Initialize a new nself project in the current directory',
        uiPath: '/build',
        uiLabel: 'Build Wizard',
      },
      {
        command: 'nself build',
        description:
          'Generate configuration files and build Docker images from .env files',
        uiPath: '/build',
        uiLabel: 'Build Page',
      },
      {
        command: 'nself start',
        description: 'Start all project services via docker-compose',
        uiPath: '/start',
        uiLabel: 'Start Page',
      },
      {
        command: 'nself stop',
        description: 'Stop all running services gracefully',
        uiPath: '/services',
        uiLabel: 'Services',
      },
      {
        command: 'nself restart',
        description: 'Restart all services or a specific service by name',
        uiPath: '/services',
        uiLabel: 'Services',
      },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: Wrench,
    description: 'Status, logging, monitoring, and general-purpose tools',
    commandCount: 15,
    commands: [
      {
        command: 'nself status',
        description: 'Show running status of all services and containers',
        uiPath: '/',
        uiLabel: 'Dashboard',
      },
      {
        command: 'nself logs',
        description:
          'View and tail logs for all services or a specific service',
        uiPath: '/system/logs',
        uiLabel: 'Logs',
      },
      {
        command: 'nself help',
        description:
          'Display help information for nself or a specific subcommand',
        uiPath: '/help',
        uiLabel: 'Help',
      },
      {
        command: 'nself admin',
        description:
          'Launch the nAdmin web UI (this application) in a Docker container',
      },
      {
        command: 'nself urls',
        description:
          'List all service URLs including admin panels and API endpoints',
        uiPath: '/',
        uiLabel: 'Dashboard',
      },
      {
        command: 'nself exec',
        description:
          'Execute a command inside a running service container (e.g., nself exec postgres psql)',
        uiPath: '/tools/terminal',
        uiLabel: 'Terminal',
      },
      {
        command: 'nself doctor',
        description:
          'Run diagnostic checks on the project (Docker, ports, configs, dependencies)',
        uiPath: '/doctor',
        uiLabel: 'Doctor',
      },
      {
        command: 'nself monitor',
        description:
          'Open the monitoring dashboard with real-time service metrics',
        uiPath: '/monitor',
        uiLabel: 'Monitor',
      },
      {
        command: 'nself health',
        description:
          'Check the health endpoints of all running services and report status',
        uiPath: '/doctor',
        uiLabel: 'Doctor',
      },
      {
        command: 'nself version',
        description:
          'Display the installed nself CLI version and check for updates',
        uiPath: '/system/updates',
        uiLabel: 'Updates',
      },
      {
        command: 'nself update',
        description:
          'Update the nself CLI, nAdmin, or both to the latest version',
        uiPath: '/system/updates',
        uiLabel: 'Updates',
      },
      {
        command: 'nself completion',
        description: 'Generate shell completion scripts for bash, zsh, or fish',
      },
      {
        command: 'nself metrics',
        description:
          'Display resource usage metrics (CPU, memory, disk) for all services',
        uiPath: '/system/resources',
        uiLabel: 'Resources',
      },
      {
        command: 'nself history',
        description:
          'Show the history of CLI commands executed in this project',
      },
      {
        command: 'nself audit',
        description:
          'Run a security and configuration audit on the project setup',
        uiPath: '/system/security',
        uiLabel: 'Security',
      },
    ],
  },
  {
    id: 'database',
    label: 'Database',
    icon: Database,
    description: 'Database management, migrations, seeding, and backups',
    commandCount: 11,
    commands: [
      {
        command: 'nself db migrate',
        description: 'Run pending database migrations to update the schema',
        uiPath: '/database/migrate',
        uiLabel: 'Migrate',
      },
      {
        command: 'nself db schema',
        description: 'View or export the current database schema',
        uiPath: '/database/schema',
        uiLabel: 'Schema',
      },
      {
        command: 'nself db seed',
        description: 'Seed the database with initial or sample data',
        uiPath: '/database/seed',
        uiLabel: 'Seed',
      },
      {
        command: 'nself db mock',
        description: 'Generate mock/fake data for development and testing',
      },
      {
        command: 'nself db backup',
        description: 'Create a full database backup (SQL dump with timestamp)',
        uiPath: '/database/backup',
        uiLabel: 'Backup',
      },
      {
        command: 'nself db restore',
        description: 'Restore the database from a backup file',
        uiPath: '/database/restore',
        uiLabel: 'Restore',
      },
      {
        command: 'nself db shell',
        description: 'Open an interactive database shell (psql for Postgres)',
        uiPath: '/tools/database',
        uiLabel: 'DB Tools',
      },
      {
        command: 'nself db query',
        description: 'Execute a SQL query directly and display results',
        uiPath: '/tools/database',
        uiLabel: 'DB Tools',
      },
      {
        command: 'nself db types',
        description: 'Generate TypeScript types from the database schema',
      },
      {
        command: 'nself db inspect',
        description:
          'Inspect tables, columns, indexes, and relationships in the database',
        uiPath: '/database/analyze',
        uiLabel: 'Analyze',
      },
      {
        command: 'nself db data',
        description: 'Browse and manage data in database tables',
        uiPath: '/database',
        uiLabel: 'Database',
      },
    ],
  },
  {
    id: 'tenant',
    label: 'Multi-Tenancy',
    icon: Users,
    description:
      'Tenant lifecycle, members, settings, billing, branding, and more',
    commandCount: 50,
    commands: [
      {
        command: 'nself tenant init',
        description: 'Initialize multi-tenancy support in the project',
      },
      {
        command: 'nself tenant create',
        description: 'Create a new tenant with name, slug, and plan',
      },
      {
        command: 'nself tenant list',
        description: 'List all tenants with status and plan info',
      },
      {
        command: 'nself tenant show <id>',
        description: 'Show detailed information about a specific tenant',
      },
      {
        command: 'nself tenant suspend <id>',
        description: 'Suspend a tenant (disables access, preserves data)',
      },
      {
        command: 'nself tenant activate <id>',
        description: 'Reactivate a suspended tenant',
      },
      {
        command: 'nself tenant delete <id>',
        description: 'Permanently delete a tenant and all its data',
      },
      {
        command: 'nself tenant member add',
        description: 'Add a member to a tenant with a specified role',
      },
      {
        command: 'nself tenant member remove',
        description: 'Remove a member from a tenant',
      },
      {
        command: 'nself tenant member list',
        description: 'List all members of a tenant',
      },
      {
        command: 'nself tenant setting get',
        description: 'Get a tenant-specific configuration value',
      },
      {
        command: 'nself tenant setting set',
        description: 'Set a tenant-specific configuration value',
      },
      {
        command: 'nself tenant billing status',
        description: 'View billing status and subscription details',
      },
      {
        command: 'nself tenant billing plan',
        description: 'Change the billing plan for a tenant',
      },
      {
        command: 'nself tenant org create',
        description: 'Create an organization within a tenant',
      },
      {
        command: 'nself tenant org list',
        description: 'List organizations in a tenant',
      },
      {
        command: 'nself tenant branding set',
        description: 'Set branding (logo, colors, name) for a tenant',
      },
      {
        command: 'nself tenant branding reset',
        description: 'Reset tenant branding to defaults',
      },
      {
        command: 'nself tenant domains add',
        description: 'Add a custom domain to a tenant',
      },
      {
        command: 'nself tenant domains remove',
        description: 'Remove a custom domain from a tenant',
      },
      {
        command: 'nself tenant domains verify',
        description: 'Verify DNS configuration for a custom domain',
      },
      {
        command: 'nself tenant email template',
        description: 'Manage tenant-specific email templates',
      },
      {
        command: 'nself tenant email send',
        description: 'Send a test email from a tenant context',
      },
      {
        command: 'nself tenant themes set',
        description: 'Apply a UI theme to a tenant',
      },
      {
        command: 'nself tenant themes list',
        description: 'List available themes for tenants',
      },
    ],
  },
  {
    id: 'deploy',
    label: 'Deployment',
    icon: Rocket,
    description:
      'Staging, production, preview, canary, blue-green deployments, and rollbacks',
    commandCount: 23,
    commands: [
      {
        command: 'nself deploy staging',
        description: 'Deploy the current build to the staging environment',
        uiPath: '/deployment/staging',
        uiLabel: 'Staging',
      },
      {
        command: 'nself deploy production',
        description: 'Deploy the current build to production',
        uiPath: '/deployment/production',
        uiLabel: 'Production',
      },
      {
        command: 'nself deploy preview',
        description: 'Create a temporary preview deployment for testing',
      },
      {
        command: 'nself deploy canary',
        description:
          'Deploy to a canary group (small % of traffic) before full rollout',
      },
      {
        command: 'nself deploy blue-green',
        description:
          'Perform a blue-green deployment with zero-downtime switchover',
      },
      {
        command: 'nself deploy rollback',
        description: 'Roll back to the previous deployment version',
      },
      {
        command: 'nself deploy upgrade',
        description: 'Upgrade services to a new version with migration support',
      },
      {
        command: 'nself deploy status',
        description: 'Show the current deployment status across environments',
        uiPath: '/deployment/environments',
        uiLabel: 'Environments',
      },
      {
        command: 'nself deploy config',
        description: 'View or edit deployment configuration',
        uiPath: '/deployment/setup',
        uiLabel: 'Setup',
      },
      {
        command: 'nself deploy logs',
        description: 'View deployment logs for a specific environment',
      },
      {
        command: 'nself deploy history',
        description: 'Show deployment history with versions and timestamps',
      },
      {
        command: 'nself deploy check',
        description: 'Pre-deployment checks (health, config, dependencies)',
      },
      {
        command: 'nself deploy provision',
        description: 'Provision infrastructure for a new environment',
      },
      {
        command: 'nself deploy server',
        description: 'Manage deployment target servers (add, remove, list)',
      },
      {
        command: 'nself deploy sync',
        description: 'Sync configuration between environments',
        uiPath: '/deployment/sync',
        uiLabel: 'Sync',
      },
    ],
  },
  {
    id: 'infra',
    label: 'Infrastructure',
    icon: Server,
    description: 'Cloud providers, Kubernetes, and Helm chart management',
    commandCount: 38,
    commands: [
      {
        command: 'nself infra provider list',
        description: 'List supported cloud providers (AWS, GCP, Azure, DO)',
      },
      {
        command: 'nself infra provider add',
        description: 'Add and configure a cloud provider with credentials',
      },
      {
        command: 'nself infra provider remove',
        description: 'Remove a configured cloud provider',
      },
      {
        command: 'nself infra provider status',
        description: 'Check connectivity and status of configured providers',
      },
      {
        command: 'nself infra k8s init',
        description: 'Initialize Kubernetes configuration for the project',
      },
      {
        command: 'nself infra k8s deploy',
        description: 'Deploy services to a Kubernetes cluster',
      },
      {
        command: 'nself infra k8s status',
        description: 'Show status of Kubernetes pods and services',
      },
      {
        command: 'nself infra k8s scale',
        description: 'Scale Kubernetes deployments up or down',
      },
      {
        command: 'nself infra k8s logs',
        description: 'View logs from Kubernetes pods',
      },
      {
        command: 'nself infra k8s exec',
        description: 'Execute a command in a Kubernetes pod',
      },
      {
        command: 'nself infra helm install',
        description: 'Install a Helm chart into the cluster',
      },
      {
        command: 'nself infra helm upgrade',
        description: 'Upgrade an existing Helm release',
      },
      {
        command: 'nself infra helm rollback',
        description: 'Roll back a Helm release to a previous revision',
      },
      {
        command: 'nself infra helm list',
        description: 'List installed Helm releases',
      },
      {
        command: 'nself infra helm values',
        description: 'Show or edit Helm chart values',
      },
    ],
  },
  {
    id: 'service',
    label: 'Services',
    icon: Package,
    description:
      'Service lifecycle, scaffolding, storage, email, cache, and more',
    commandCount: 43,
    commands: [
      {
        command: 'nself service list',
        description: 'List all available and enabled services',
        uiPath: '/services',
        uiLabel: 'Services',
      },
      {
        command: 'nself service enable <name>',
        description: 'Enable a service in the project configuration',
        uiPath: '/services',
        uiLabel: 'Services',
      },
      {
        command: 'nself service disable <name>',
        description: 'Disable a service (stops and removes from config)',
        uiPath: '/services',
        uiLabel: 'Services',
      },
      {
        command: 'nself service status <name>',
        description: 'Show detailed status of a specific service',
        uiPath: '/services',
        uiLabel: 'Services',
      },
      {
        command: 'nself service restart <name>',
        description: 'Restart a specific service container',
        uiPath: '/services',
        uiLabel: 'Services',
      },
      {
        command: 'nself service logs <name>',
        description: 'View logs for a specific service',
        uiPath: '/system/logs',
        uiLabel: 'Logs',
      },
      {
        command: 'nself service init',
        description: 'Initialize a new custom service from a template',
      },
      {
        command: 'nself service scaffold',
        description:
          'Scaffold boilerplate for a new service (routes, models, tests)',
      },
      {
        command: 'nself service wizard',
        description: 'Interactive wizard to configure and add a new service',
      },
      {
        command: 'nself service search',
        description: 'Search the service registry for available services',
      },
      {
        command: 'nself service admin <name>',
        description:
          'Open the admin panel for a service (e.g., Hasura console)',
      },
      {
        command: 'nself service storage upload',
        description: 'Upload a file to the storage service (MinIO/S3)',
        uiPath: '/services/minio',
        uiLabel: 'MinIO',
      },
      {
        command: 'nself service storage list',
        description: 'List files in a storage bucket',
        uiPath: '/services/minio',
        uiLabel: 'MinIO',
      },
      {
        command: 'nself service email send',
        description: 'Send a test email through the configured email service',
        uiPath: '/services/mailpit',
        uiLabel: 'Mailpit',
      },
      {
        command: 'nself service email template',
        description: 'Manage email templates',
      },
      {
        command: 'nself service cache flush',
        description: 'Flush the Redis cache',
        uiPath: '/services/redis',
        uiLabel: 'Redis',
      },
      {
        command: 'nself service cache stats',
        description: 'Show Redis cache statistics (memory, hit ratio, keys)',
        uiPath: '/services/redis',
        uiLabel: 'Redis',
      },
      {
        command: 'nself service functions deploy',
        description: 'Deploy serverless functions',
        uiPath: '/services/functions',
        uiLabel: 'Functions',
      },
      {
        command: 'nself service functions list',
        description: 'List deployed serverless functions',
        uiPath: '/services/functions',
        uiLabel: 'Functions',
      },
      {
        command: 'nself service realtime status',
        description: 'Show status of real-time subscriptions and connections',
      },
    ],
  },
  {
    id: 'config',
    label: 'Configuration',
    icon: Settings,
    description:
      'Environment files, secrets, vault integration, and config sync',
    commandCount: 20,
    commands: [
      {
        command: 'nself config show',
        description: 'Display the current project configuration',
        uiPath: '/config',
        uiLabel: 'Config',
      },
      {
        command: 'nself config edit',
        description: 'Open the configuration file in your default editor',
        uiPath: '/config',
        uiLabel: 'Config',
      },
      {
        command: 'nself config validate',
        description: 'Validate configuration files for errors and warnings',
        uiPath: '/doctor',
        uiLabel: 'Doctor',
      },
      {
        command: 'nself config export',
        description: 'Export configuration as JSON or YAML',
      },
      {
        command: 'nself config import',
        description: 'Import configuration from a file',
      },
      {
        command: 'nself config sync',
        description: 'Sync configuration between local and remote environments',
        uiPath: '/deployment/sync',
        uiLabel: 'Sync',
      },
      {
        command: 'nself config env list',
        description: 'List all environment files and their variables',
        uiPath: '/config',
        uiLabel: 'Config',
      },
      {
        command: 'nself config env get <key>',
        description: 'Get the value of a specific environment variable',
      },
      {
        command: 'nself config env set <key> <value>',
        description: 'Set an environment variable in the specified env file',
      },
      {
        command: 'nself config secrets generate',
        description: 'Generate secure secrets for the current environment',
        uiPath: '/deployment/secrets',
        uiLabel: 'Secrets',
      },
      {
        command: 'nself config secrets sync',
        description: 'Sync secrets from the server to local gitignored file',
        uiPath: '/deployment/secrets',
        uiLabel: 'Secrets',
      },
      {
        command: 'nself config secrets rotate',
        description: 'Rotate secrets (generate new values and update services)',
        uiPath: '/deployment/secrets',
        uiLabel: 'Secrets',
      },
      {
        command: 'nself config vault init',
        description: 'Initialize HashiCorp Vault integration',
      },
      {
        command: 'nself config vault sync',
        description: 'Sync secrets between local config and Vault',
      },
    ],
  },
  {
    id: 'auth',
    label: 'Auth & Security',
    icon: Lock,
    description:
      'Authentication, MFA, roles, OAuth, SSL, rate limiting, and webhooks',
    commandCount: 38,
    commands: [
      {
        command: 'nself auth login',
        description: 'Authenticate with the nself service',
      },
      {
        command: 'nself auth logout',
        description: 'Log out and clear stored credentials',
      },
      {
        command: 'nself auth status',
        description: 'Show current authentication status and session info',
      },
      {
        command: 'nself auth mfa enable',
        description: 'Enable multi-factor authentication',
      },
      {
        command: 'nself auth mfa disable',
        description: 'Disable multi-factor authentication',
      },
      {
        command: 'nself auth mfa verify',
        description: 'Verify an MFA code',
      },
      {
        command: 'nself auth roles list',
        description: 'List all defined roles and their permissions',
      },
      {
        command: 'nself auth roles create',
        description: 'Create a new role with specified permissions',
      },
      {
        command: 'nself auth roles assign',
        description: 'Assign a role to a user',
      },
      {
        command: 'nself auth devices list',
        description: 'List authorized devices and sessions',
      },
      {
        command: 'nself auth devices revoke',
        description: 'Revoke access for a specific device or session',
      },
      {
        command: 'nself auth oauth add',
        description: 'Add an OAuth provider (Google, GitHub, etc.)',
      },
      {
        command: 'nself auth oauth remove',
        description: 'Remove an OAuth provider',
      },
      {
        command: 'nself auth oauth list',
        description: 'List configured OAuth providers',
      },
      {
        command: 'nself auth security audit',
        description: 'Run a security audit on authentication configuration',
        uiPath: '/system/security',
        uiLabel: 'Security',
      },
      {
        command: 'nself auth ssl generate',
        description: 'Generate SSL certificates (self-signed or via mkcert)',
        uiPath: '/config',
        uiLabel: 'Config (SSL)',
      },
      {
        command: 'nself auth ssl trust',
        description: 'Trust the generated SSL certificate in the system store',
        uiPath: '/config',
        uiLabel: 'Config (SSL)',
      },
      {
        command: 'nself auth ssl letsencrypt',
        description: "Obtain and configure a Let's Encrypt SSL certificate",
        uiPath: '/config',
        uiLabel: 'Config (SSL)',
      },
      {
        command: 'nself auth rate-limit set',
        description: 'Configure rate limiting rules for API endpoints',
      },
      {
        command: 'nself auth rate-limit status',
        description: 'Show current rate limiting configuration and stats',
      },
      {
        command: 'nself auth webhooks add',
        description: 'Register a new webhook endpoint',
        uiPath: '/tools/webhooks',
        uiLabel: 'Webhooks',
      },
      {
        command: 'nself auth webhooks list',
        description: 'List all configured webhooks',
        uiPath: '/tools/webhooks',
        uiLabel: 'Webhooks',
      },
      {
        command: 'nself auth webhooks test',
        description: 'Send a test payload to a webhook endpoint',
        uiPath: '/tools/webhooks',
        uiLabel: 'Webhooks',
      },
    ],
  },
  {
    id: 'perf',
    label: 'Performance',
    icon: Zap,
    description: 'Profiling, benchmarking, scaling, and optimization',
    commandCount: 5,
    commands: [
      {
        command: 'nself perf profile',
        description:
          'Profile service performance and generate a flamegraph report',
        uiPath: '/system/performance',
        uiLabel: 'Performance',
      },
      {
        command: 'nself perf bench',
        description:
          'Run benchmarks against API endpoints and report throughput/latency',
        uiPath: '/system/performance',
        uiLabel: 'Performance',
      },
      {
        command: 'nself perf scale',
        description: 'Scale service replicas up or down for load testing',
      },
      {
        command: 'nself perf migrate',
        description:
          'Migrate to a more performant configuration (e.g., connection pooling)',
      },
      {
        command: 'nself perf optimize',
        description: 'Analyze and apply recommended performance optimizations',
        uiPath: '/system/performance',
        uiLabel: 'Performance',
      },
    ],
  },
  {
    id: 'backup',
    label: 'Backup',
    icon: HardDrive,
    description: 'Full project backups, restores, and cleanup',
    commandCount: 6,
    commands: [
      {
        command: 'nself backup create',
        description: 'Create a full project backup (database, files, config)',
        uiPath: '/backups',
        uiLabel: 'Backups',
      },
      {
        command: 'nself backup restore',
        description: 'Restore a project from a backup archive',
        uiPath: '/backups',
        uiLabel: 'Backups',
      },
      {
        command: 'nself backup list',
        description: 'List all available backups with size and date',
        uiPath: '/backups',
        uiLabel: 'Backups',
      },
      {
        command: 'nself backup rollback',
        description: 'Roll back the entire project to a previous backup state',
        uiPath: '/backups',
        uiLabel: 'Backups',
      },
      {
        command: 'nself backup reset',
        description: 'Reset the project to a clean state (removes all data)',
      },
      {
        command: 'nself backup clean',
        description: 'Remove old backups beyond the retention policy',
        uiPath: '/backups',
        uiLabel: 'Backups',
      },
    ],
  },
  {
    id: 'dev',
    label: 'Dev Tools',
    icon: Code,
    description:
      'Frontend tooling, CI/CD, docs, SDK generation, testing, and more',
    commandCount: 16,
    commands: [
      {
        command: 'nself dev frontend init',
        description: 'Initialize frontend tooling (Vite, Next.js, React, etc.)',
      },
      {
        command: 'nself dev frontend build',
        description: 'Build the frontend for production',
      },
      {
        command: 'nself dev frontend dev',
        description: 'Start the frontend development server with HMR',
      },
      {
        command: 'nself dev ci init',
        description:
          'Generate CI/CD pipeline configuration (GitHub Actions, GitLab CI)',
        uiPath: '/deployment/cicd',
        uiLabel: 'CI/CD',
      },
      {
        command: 'nself dev ci run',
        description: 'Run the CI pipeline locally for testing',
        uiPath: '/deployment/cicd',
        uiLabel: 'CI/CD',
      },
      {
        command: 'nself dev docs generate',
        description: 'Auto-generate API documentation from schema and routes',
        uiPath: '/tools/documentation',
        uiLabel: 'Docs',
      },
      {
        command: 'nself dev docs serve',
        description: 'Serve documentation locally with live reload',
        uiPath: '/tools/documentation',
        uiLabel: 'Docs',
      },
      {
        command: 'nself dev whitelabel init',
        description: 'Initialize white-label configuration for the project',
      },
      {
        command: 'nself dev whitelabel build',
        description: 'Build a white-labeled version of the application',
      },
      {
        command: 'nself dev sdk generate',
        description:
          'Generate client SDKs (TypeScript, Python, Go) from the API schema',
      },
      {
        command: 'nself dev test run',
        description: 'Run the test suite for the project',
        uiPath: '/tools/testing',
        uiLabel: 'Testing',
      },
      {
        command: 'nself dev test watch',
        description: 'Run tests in watch mode during development',
        uiPath: '/tools/testing',
        uiLabel: 'Testing',
      },
      {
        command: 'nself dev mock server',
        description: 'Start a mock API server for frontend development',
      },
      {
        command: 'nself dev mock data',
        description: 'Generate mock data for development and testing',
      },
      {
        command: 'nself dev migrate create',
        description: 'Create a new database migration file',
        uiPath: '/database/migrate',
        uiLabel: 'Migrate',
      },
      {
        command: 'nself dev migrate status',
        description: 'Show pending and applied migration status',
        uiPath: '/database/migrate',
        uiLabel: 'Migrate',
      },
    ],
  },
  {
    id: 'plugin',
    label: 'Plugins',
    icon: Plug,
    description: 'Discover, install, manage, and create plugins',
    commandCount: 8,
    commands: [
      {
        command: 'nself plugin list',
        description: 'List all installed plugins and their status',
      },
      {
        command: 'nself plugin install <name>',
        description: 'Install a plugin from the registry',
      },
      {
        command: 'nself plugin remove <name>',
        description: 'Uninstall a plugin and clean up its resources',
      },
      {
        command: 'nself plugin update <name>',
        description: 'Update a specific plugin to the latest version',
      },
      {
        command: 'nself plugin updates',
        description: 'Check all plugins for available updates',
      },
      {
        command: 'nself plugin refresh',
        description: 'Refresh the plugin registry cache',
      },
      {
        command: 'nself plugin status <name>',
        description: 'Show detailed status and config for a plugin',
      },
      {
        command: 'nself plugin create',
        description: 'Scaffold a new plugin project from a template',
      },
    ],
  },
]

// ─── Existing Sections (preserved) ──────────────────────────────────────────

function SearchSection() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    Array<{ title: string; description: string; category: string }>
  >([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch(
        `/api/help/search?q=${encodeURIComponent(searchQuery)}`,
      )
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (_error) {
      // Intentionally empty - search results remain empty on error
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Search className="h-5 w-5" />
        Search Help & Documentation
      </h2>

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search documentation, tutorials, FAQ..."
            className="w-full rounded-lg border border-zinc-200 bg-white py-3 pr-4 pl-10 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-zinc-900 dark:text-white">
            Search Results
          </h3>
          {searchResults.map((result, index) => (
            <div
              key={index}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
            >
              <h4 className="mb-1 font-medium text-blue-600 dark:text-blue-400">
                {result.title}
              </h4>
              <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                {result.description}
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  {result.category}
                </span>
                <button className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                  View <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentationSection() {
  const [docs] = useState<Documentation[]>([
    {
      id: '1',
      title: 'Quick Start Guide',
      description: 'Get up and running with nself in minutes',
      category: 'getting-started',
      lastUpdated: '2024-01-20',
      url: '/docs/quickstart',
    },
    {
      id: '2',
      title: 'Configuration Reference',
      description: 'Complete guide to configuring your nself installation',
      category: 'configuration',
      lastUpdated: '2024-01-18',
      url: '/docs/configuration',
    },
    {
      id: '3',
      title: 'Deployment Strategies',
      description: 'Best practices for deploying applications',
      category: 'deployment',
      lastUpdated: '2024-01-15',
      url: '/docs/deployment',
    },
    {
      id: '4',
      title: 'Monitoring & Observability',
      description: 'Set up monitoring, logging, and alerting',
      category: 'monitoring',
      lastUpdated: '2024-01-17',
      url: '/docs/monitoring',
    },
    {
      id: '5',
      title: 'API Authentication',
      description: 'Secure your API endpoints with authentication',
      category: 'api',
      lastUpdated: '2024-01-19',
      url: '/docs/api/auth',
    },
    {
      id: '6',
      title: 'Security Best Practices',
      description: 'Secure your nself deployment',
      category: 'security',
      lastUpdated: '2024-01-16',
      url: '/docs/security',
    },
  ])

  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredDocs =
    selectedCategory === 'all'
      ? docs
      : docs.filter((doc) => doc.category === selectedCategory)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Book className="h-5 w-5" />
        Documentation
      </h2>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            selectedCategory === 'all'
              ? 'border-blue-500 bg-blue-500 text-white'
              : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors ${
                selectedCategory === category.id
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              <Icon className="h-3 w-3" />
              {category.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDocs.map((doc) => {
          const category = CATEGORIES.find((c) => c.id === doc.category)
          const Icon = category?.icon || FileText

          return (
            <a
              key={doc.id}
              href={doc.url}
              className="group block rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-blue-700 dark:hover:bg-blue-900/10"
            >
              <div className="mb-3 flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {doc.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {doc.description}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-blue-500" />
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  {category?.label}
                </span>
                <span className="text-xs text-zinc-500">
                  Updated {new Date(doc.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

function VideoTutorialsSection() {
  const [tutorials] = useState<VideoTutorial[]>([
    {
      id: '1',
      title: 'Getting Started with nself',
      description:
        'Complete walkthrough of setting up your first nself project',
      duration: '12:34',
      thumbnail: '/thumbnails/getting-started.jpg',
      category: 'getting-started',
      difficulty: 'beginner',
      views: 15420,
      rating: 4.8,
    },
    {
      id: '2',
      title: 'Advanced Configuration',
      description:
        'Deep dive into advanced configuration options and customization',
      duration: '18:45',
      thumbnail: '/thumbnails/advanced-config.jpg',
      category: 'configuration',
      difficulty: 'advanced',
      views: 8932,
      rating: 4.6,
    },
    {
      id: '3',
      title: 'Monitoring and Alerts Setup',
      description:
        'Set up comprehensive monitoring and alerting for your services',
      duration: '15:20',
      thumbnail: '/thumbnails/monitoring.jpg',
      category: 'monitoring',
      difficulty: 'intermediate',
      views: 12156,
      rating: 4.9,
    },
  ])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20'
      case 'intermediate':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
      case 'advanced':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'
      default:
        return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800'
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Video className="h-5 w-5" />
        Video Tutorials
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tutorials.map((tutorial) => (
          <div key={tutorial.id} className="group cursor-pointer">
            <div className="relative mb-3 aspect-video overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-blue-600 opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="h-12 w-12 text-white opacity-80 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                {tutorial.duration}
              </div>
            </div>

            <div>
              <h3 className="mb-1 font-medium text-zinc-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                {tutorial.title}
              </h3>
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                {tutorial.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-1 text-xs ${getDifficultyColor(tutorial.difficulty)}`}
                  >
                    {tutorial.difficulty}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current text-yellow-500" />
                    <span className="text-xs text-zinc-500">
                      {tutorial.rating}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-zinc-500">
                  {tutorial.views.toLocaleString()} views
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Button variant="outline" className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          View All Tutorials
        </Button>
      </div>
    </div>
  )
}

function FAQSection() {
  const [faqs] = useState<FAQItem[]>([
    {
      id: '1',
      question: 'How do I reset my password?',
      answer:
        'You can reset your password by clicking the "Forgot Password" link on the login page, or by using the nself CLI command `nself auth reset-password`.',
      category: 'getting-started',
      helpful: 23,
      notHelpful: 2,
    },
    {
      id: '2',
      question: 'Why is my service not starting?',
      answer:
        'Check the service logs first using `nself logs <service-name>`. Common issues include port conflicts, missing environment variables, or insufficient resources. Verify your configuration and ensure all dependencies are running.',
      category: 'troubleshooting',
      helpful: 45,
      notHelpful: 3,
    },
    {
      id: '3',
      question: 'How do I configure SSL certificates?',
      answer:
        "SSL certificates can be configured through the admin panel under Settings > SSL, or via the CLI using `nself ssl configure`. nself supports both self-signed certificates and Let's Encrypt automatic SSL.",
      category: 'security',
      helpful: 38,
      notHelpful: 1,
    },
    {
      id: '4',
      question: 'Can I use custom domains?',
      answer:
        'Yes! Configure custom domains in the admin panel under Configuration > Domains. Make sure your DNS records point to your nself instance and SSL is properly configured.',
      category: 'configuration',
      helpful: 29,
      notHelpful: 4,
    },
    {
      id: '5',
      question: 'How do I backup my data?',
      answer:
        'Use the backup functionality in Operations > Backup or run `nself backup create` via CLI. This will backup your databases, uploaded files, and configuration. Schedule automatic backups for production use.',
      category: 'deployment',
      helpful: 52,
      notHelpful: 1,
    },
  ])

  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  const handleFeedback = async (faqId: string, helpful: boolean) => {
    try {
      await fetch(`/api/help/faq/${faqId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      })
    } catch (error) {
      console.warn('[Help] Error submitting FAQ feedback:', error)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <HelpCircle className="h-5 w-5" />
        Frequently Asked Questions
      </h2>

      <div className="space-y-3">
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700"
          >
            <button
              onClick={() =>
                setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)
              }
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <span className="font-medium">{faq.question}</span>
              {expandedFAQ === faq.id ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {expandedFAQ === faq.id && (
              <div className="px-4 pb-4">
                <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                  {faq.answer}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">
                      Was this helpful?
                    </span>
                    <button
                      onClick={() => handleFeedback(faq.id, true)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-sm text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      {faq.helpful}
                    </button>
                    <button
                      onClick={() => handleFeedback(faq.id, false)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <ThumbsDown className="h-3 w-3" />
                      {faq.notHelpful}
                    </button>
                  </div>

                  <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    {CATEGORIES.find((c) => c.id === faq.category)?.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SupportContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: '',
    priority: 'normal',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({
          name: '',
          email: '',
          subject: '',
          category: 'general',
          message: '',
          priority: 'normal',
        })
      }
    } catch (_error) {
      // Intentionally empty - form submission errors handled silently
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <MessageCircle className="h-5 w-5" />
        Contact Support
      </h2>

      {submitted ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h3 className="mb-2 text-lg font-semibold text-green-600 dark:text-green-400">
            Support Request Submitted
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            We&apos;ve received your message and will get back to you within 24
            hours.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="general">General Question</option>
                <option value="technical">Technical Issue</option>
                <option value="billing">Billing</option>
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Subject
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Message
            </label>
            <textarea
              required
              rows={5}
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              placeholder="Please describe your issue or question in detail..."
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Message
          </Button>
        </form>
      )}

      <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <h3 className="mb-3 font-medium">Other Ways to Reach Us</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-sm font-medium">Email</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                support@nself.dev
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-sm font-medium">Discord</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Join our community
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-sky-500" />
            <div>
              <div className="text-sm font-medium">Website</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                nself.dev
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SystemStatusSection() {
  const [status] = useState<SystemStatus>({
    status: 'operational',
    services: [
      { name: 'API Gateway', status: 'operational' },
      { name: 'Database', status: 'operational' },
      { name: 'Authentication', status: 'operational' },
      {
        name: 'File Storage',
        status: 'degraded',
        description: 'Slower than usual response times',
      },
      { name: 'Email Service', status: 'operational' },
      { name: 'Monitoring', status: 'operational' },
    ],
    lastUpdated: new Date().toISOString(),
  })

  const getStatusConfig = (statusVal: string) => {
    switch (statusVal) {
      case 'operational':
        return {
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-100 dark:bg-green-900/20',
          icon: CheckCircle,
        }
      case 'degraded':
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          icon: AlertCircle,
        }
      case 'down':
        return {
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-100 dark:bg-red-900/20',
          icon: XCircle,
        }
      default:
        return {
          color: 'text-zinc-600 dark:text-zinc-400',
          bg: 'bg-zinc-100 dark:bg-zinc-800',
          icon: Clock,
        }
    }
  }

  const overallConfig = getStatusConfig(status.status)
  const OverallIcon = overallConfig.icon

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Monitor className="h-5 w-5" />
        System Status
      </h2>

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <OverallIcon className={`h-6 w-6 ${overallConfig.color}`} />
          <div>
            <h3 className="text-lg font-semibold">
              All Systems{' '}
              {status.status === 'operational'
                ? 'Operational'
                : 'Experiencing Issues'}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Last updated: {new Date(status.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {status.services.map((service, index) => {
          const config = getStatusConfig(service.status)
          const Icon = config.icon

          return (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50"
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <div>
                  <span className="font-medium">{service.name}</span>
                  {service.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {service.description}
                    </p>
                  )}
                </div>
              </div>

              <span
                className={`rounded px-2 py-1 text-xs font-medium ${config.bg} ${config.color}`}
              >
                {service.status === 'operational'
                  ? 'Operational'
                  : service.status === 'degraded'
                    ? 'Degraded'
                    : 'Down'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-center">
        <Button variant="outline" className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          View Status Page
        </Button>
      </div>
    </div>
  )
}

function KeyboardShortcutsSection() {
  const shortcuts: KeyboardShortcut[] = [
    {
      keys: ['Ctrl', 'K'],
      description: 'Open command palette',
      category: 'Navigation',
    },
    {
      keys: ['Ctrl', 'Shift', 'P'],
      description: 'Open search',
      category: 'Navigation',
    },
    {
      keys: ['G', 'D'],
      description: 'Go to Dashboard',
      category: 'Navigation',
    },
    { keys: ['G', 'S'], description: 'Go to Services', category: 'Navigation' },
    { keys: ['G', 'L'], description: 'Go to Logs', category: 'Navigation' },
    { keys: ['R'], description: 'Refresh current page', category: 'Actions' },
    {
      keys: ['Ctrl', 'Enter'],
      description: 'Submit form',
      category: 'Actions',
    },
    { keys: ['Esc'], description: 'Close modal/dialog', category: 'Actions' },
    { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Help' },
    { keys: ['Ctrl', '/'], description: 'Toggle help panel', category: 'Help' },
  ]

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) acc[shortcut.category] = []
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<string, KeyboardShortcut[]>,
  )

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Keyboard className="h-5 w-5" />
        Keyboard Shortcuts
      </h2>

      <div className="space-y-6">
        {Object.entries(groupedShortcuts).map(
          ([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span
                          key={keyIndex}
                          className="flex items-center gap-1"
                        >
                          <kbd className="rounded border bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-zinc-400">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

// ─── CLI Command Reference Section ──────────────────────────────────────────

function CLIReferenceSection() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const totalCommands = CLI_COMMAND_GROUPS.reduce(
    (sum, group) => sum + group.commands.length,
    0,
  )

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return CLI_COMMAND_GROUPS

    const query = searchQuery.toLowerCase()
    return CLI_COMMAND_GROUPS.map((group) => ({
      ...group,
      commands: group.commands.filter(
        (cmd) =>
          cmd.command.toLowerCase().includes(query) ||
          cmd.description.toLowerCase().includes(query) ||
          (cmd.uiLabel && cmd.uiLabel.toLowerCase().includes(query)),
      ),
    })).filter((group) => group.commands.length > 0)
  }, [searchQuery])

  const filteredCommandCount = filteredGroups.reduce(
    (sum, group) => sum + group.commands.length,
    0,
  )

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedGroups(new Set(filteredGroups.map((g) => g.id)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-white">
              <Command className="h-5 w-5 text-blue-500" />
              nself CLI Command Reference
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {totalCommands} commands across {CLI_COMMAND_GROUPS.length}{' '}
              categories. Every UI action in nAdmin maps to a CLI command.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter commands... (e.g. backup, deploy, db migrate)"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-3 pr-4 pl-10 text-sm transition-colors focus:border-blue-300 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-700 dark:focus:bg-zinc-800"
          />
          {searchQuery && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <span className="text-xs text-zinc-500">
                {filteredCommandCount} result
                {filteredCommandCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Command groups */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <Search className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-zinc-600 dark:text-zinc-400">
            No commands match &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const Icon = group.icon
            const isExpanded = expandedGroups.has(group.id)

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {/* Group header (collapsible) */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {group.label}
                      </h3>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                        {group.commands.length}
                        {searchQuery &&
                          group.commands.length !== group.commandCount &&
                          ` / ${group.commandCount}`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {group.description}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-zinc-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-400" />
                  )}
                </button>

                {/* Command list */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700">
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                      {group.commands.map((cmd, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                              {cmd.command}
                            </code>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {cmd.description}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {cmd.uiPath ? (
                              <a
                                href={cmd.uiPath}
                                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {cmd.uiLabel}
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
                                <Clock className="h-3 w-3" />
                                Coming Soon
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/10">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium">
              nAdmin is a UI wrapper for the nself CLI
            </p>
            <p className="mt-1 text-blue-700 dark:text-blue-400">
              Every action in this admin panel executes the corresponding{' '}
              <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs dark:bg-blue-900/30">
                nself
              </code>{' '}
              CLI command under the hood. You can always use the CLI directly
              for automation, scripting, or when the UI page is not yet
              available.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function HelpContent() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'cli' | 'docs' | 'faq' | 'contact'
  >('overview')

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Help & Support
            </h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Find answers, learn best practices, and get support for your nself
            deployment
          </p>
        </div>

        <div className="mb-8 flex w-fit items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'cli', label: 'CLI Reference', icon: Terminal },
            { id: 'docs', label: 'Documentation', icon: Book },
            { id: 'faq', label: 'FAQ', icon: HelpCircle },
            { id: 'contact', label: 'Contact Support', icon: MessageCircle },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as 'overview' | 'cli' | 'docs' | 'faq' | 'contact',
                  )
                }
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <SearchSection />

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-8">
                <DocumentationSection />
                <KeyboardShortcutsSection />
              </div>

              <div className="space-y-8">
                <VideoTutorialsSection />
                <SystemStatusSection />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cli' && <CLIReferenceSection />}
        {activeTab === 'docs' && <DocumentationSection />}
        {activeTab === 'faq' && <FAQSection />}
        {activeTab === 'contact' && <SupportContactSection />}
      </div>
    </>
  )
}

export default function HelpPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <HelpContent />
    </Suspense>
  )
}
