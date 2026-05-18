'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Check, ChevronDown, ChevronUp, Eye, EyeOff, Info, Lock, RefreshCw, X } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'

interface ServiceConfig {
  [key: string]: string | number | boolean | string[]
}

interface ConfigField {
  key: string
  label: string
  type:
    | 'text'
    | 'password'
    | 'number'
    | 'boolean'
    | 'select'
    | 'readonly'
    | 'extensions'
    | 'secret'
    | 'checkbox'
    | 'email'
  placeholder?: string
  helperText?: string
  helpText?: string
  required?: boolean
  options?: { value: string; label: string }[]
  defaultValue?: string | number | boolean | string[]
  readOnly?: boolean
  secretLength?: number
  condition?: (config: ServiceConfig) => boolean
}

interface Extension {
  name: string
  description: string
  category: 'core' | 'popular' | 'advanced'
  enabled?: boolean
}

interface ServiceConfigModalProps {
  isOpen: boolean
  onClose: () => void
  service: string
  config: ServiceConfig
  onSave: (config: ServiceConfig) => void
  initialConfig?: any // Config from init/1
}

const postgresExtensions: Extension[] = [
  // Core/Popular extensions (show by default)
  {
    name: 'uuid-ossp',
    description: 'UUID generation functions',
    category: 'core',
  },
  {
    name: 'pgcrypto',
    description: 'Cryptographic functions for encryption and hashing',
    category: 'core',
  },
  {
    name: 'citext',
    description: 'Case-insensitive text type',
    category: 'core',
  },
  {
    name: 'pg_trgm',
    description: 'Trigram matching for fuzzy text search',
    category: 'popular',
  },
  {
    name: 'unaccent',
    description: 'Remove accents from text for better search',
    category: 'popular',
  },

  // Advanced extensions (hidden by default)
  {
    name: 'hstore',
    description: 'Key-value store within a single column',
    category: 'advanced',
  },
  {
    name: 'postgis',
    description: 'Geographic and spatial data support',
    category: 'advanced',
  },
  {
    name: 'timescaledb',
    description: 'Time-series database capabilities',
    category: 'advanced',
  },
  {
    name: 'pgvector',
    description: 'Vector similarity search for ML/AI',
    category: 'advanced',
  },
  {
    name: 'pg_stat_statements',
    description: 'Query performance statistics',
    category: 'advanced',
  },
  {
    name: 'btree_gin',
    description: 'GIN index support for common data types',
    category: 'advanced',
  },
  {
    name: 'btree_gist',
    description: 'GiST index support for common data types',
    category: 'advanced',
  },
  {
    name: 'pg_cron',
    description: 'Job scheduler for periodic tasks',
    category: 'advanced',
  },
  {
    name: 'pg_partman',
    description: 'Automated partition management',
    category: 'advanced',
  },
  {
    name: 'fuzzystrmatch',
    description: 'Fuzzy string matching functions',
    category: 'advanced',
  },
  {
    name: 'intarray',
    description: 'Functions for 1-D arrays of integers',
    category: 'advanced',
  },
  {
    name: 'ltree',
    description: 'Hierarchical tree-like data structures',
    category: 'advanced',
  },
]

// Generate a random secret of specified length
const generateSecret = (length: number = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const serviceConfigs: Record<string, (initialConfig?: any) => ConfigField[]> = {
  postgresql: (initialConfig) => [
    {
      key: 'POSTGRES_DB',
      label: 'Database Name',
      type: 'readonly',
      defaultValue: initialConfig?.databaseName || 'nself',
      helperText: 'Set in Basic Configuration (Step 1)',
    },
    {
      key: 'POSTGRES_USER',
      label: 'Username',
      type: 'text',
      placeholder: 'postgres',
      defaultValue: 'postgres',
    },
    {
      key: 'POSTGRES_PASSWORD',
      label: 'Password',
      type: 'readonly',
      defaultValue: initialConfig?.databasePassword || 'postgres-dev-password',
      helperText: 'Set in Basic Configuration (Step 1)',
    },
    {
      key: 'POSTGRES_PORT',
      label: 'Port',
      type: 'number',
      placeholder: '5432',
      defaultValue: 5432,
    },
    {
      key: 'POSTGRES_VERSION',
      label: 'Version',
      type: 'select',
      defaultValue: '16-alpine',
      options: [
        { value: '16-alpine', label: 'PostgreSQL 16 (Latest, Recommended)' },
        { value: '15-alpine', label: 'PostgreSQL 15 (Stable)' },
        { value: '14-alpine', label: 'PostgreSQL 14 (LTS)' },
      ],
    },
    {
      key: 'DB_MAX_CONNECTIONS',
      label: 'Max Connections',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      helperText: 'Maximum number of concurrent database connections',
    },
    {
      key: 'POSTGRES_EXTENSIONS',
      label: 'Extensions',
      type: 'extensions',
      defaultValue: ['uuid-ossp'],
      helperText: 'Select database extensions to enable',
    },
  ],
  hasura: (initialConfig) => {
    const isDev = initialConfig?.environment === 'dev'
    return [
      {
        key: 'HASURA_VERSION',
        label: 'Version',
        type: 'select',
        defaultValue: 'v2.44.0',
        options: [
          { value: 'v2.44.0', label: 'v2.44.0 (Latest)' },
          { value: 'v2.43.0', label: 'v2.43.0' },
          { value: 'v2.42.0', label: 'v2.42.0' },
        ],
      },
      {
        key: 'HASURA_GRAPHQL_ADMIN_SECRET',
        label: 'Admin Secret',
        type: 'secret',
        placeholder: 'Click refresh to generate',
        defaultValue: isDev ? 'hasura-admin-secret-dev' : generateSecret(32),
        required: true,
        secretLength: 32,
        helperText: 'Secure key to access Hasura console and admin APIs',
      },
      {
        key: 'HASURA_JWT_KEY',
        label: 'JWT Secret Key',
        type: 'secret',
        placeholder: 'Minimum 32 characters',
        defaultValue: isDev
          ? 'development-secret-key-minimum-32-characters-long'
          : generateSecret(48),
        required: true,
        secretLength: 48,
        helperText: 'Must be at least 32 characters for HS256 algorithm',
      },
      {
        key: 'HASURA_JWT_TYPE',
        label: 'JWT Algorithm',
        type: 'select',
        defaultValue: 'HS256',
        options: [
          { value: 'HS256', label: 'HS256 (Symmetric, Recommended)' },
          { value: 'RS256', label: 'RS256 (Asymmetric)' },
          { value: 'RS512', label: 'RS512 (Asymmetric, Higher Security)' },
        ],
      },
      {
        key: 'HASURA_GRAPHQL_ENABLE_CONSOLE',
        label: 'Enable Web Console',
        type: 'boolean',
        defaultValue: true,
        helperText: 'Access Hasura console for GraphQL exploration',
      },
      {
        key: 'HASURA_GRAPHQL_DEV_MODE',
        label: 'Developer Mode',
        type: 'boolean',
        defaultValue: isDev,
        helperText: 'Enable development features like query caching bypass',
      },
      {
        key: 'HASURA_GRAPHQL_ENABLE_TELEMETRY',
        label: 'Send Anonymous Usage Stats',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'HASURA_GRAPHQL_CORS_DOMAIN',
        label: 'CORS Allowed Domains',
        type: 'text',
        placeholder: '*',
        defaultValue: '*',
        helperText: 'Use * for all domains or comma-separated list',
      },
      {
        key: 'HASURA_GRAPHQL_UNAUTHORIZED_ROLE',
        label: 'Default Role for Unauthorized Users',
        type: 'text',
        placeholder: 'anonymous',
        defaultValue: 'anonymous',
        helperText: 'Role used when no auth token is provided',
      },
    ]
  },
  auth: (initialConfig) => {
    const isDev = initialConfig?.environment === 'dev'
    return [
      {
        key: 'AUTH_VERSION',
        label: 'Version',
        type: 'select',
        defaultValue: '0.36.0',
        options: [
          { value: '0.36.0', label: 'v0.36.0 (Latest)' },
          { value: '0.35.0', label: 'v0.35.0' },
          { value: '0.34.0', label: 'v0.34.0' },
        ],
      },
      {
        key: 'AUTH_JWT_REFRESH_TOKEN_EXPIRES_IN',
        label: 'Refresh Token Lifetime',
        type: 'select',
        defaultValue: '2592000',
        options: [
          { value: '86400', label: '1 Day (86400 seconds)' },
          { value: '604800', label: '7 Days (604800 seconds)' },
          {
            value: '2592000',
            label: '30 Days (2592000 seconds) - Recommended',
          },
          { value: '7776000', label: '90 Days (7776000 seconds)' },
        ],
      },
      {
        key: 'AUTH_JWT_ACCESS_TOKEN_EXPIRES_IN',
        label: 'Access Token Lifetime',
        type: 'select',
        defaultValue: '900',
        options: [
          { value: '300', label: '5 Minutes (300 seconds) - High Security' },
          { value: '900', label: '15 Minutes (900 seconds) - Recommended' },
          { value: '1800', label: '30 Minutes (1800 seconds)' },
          { value: '3600', label: '1 Hour (3600 seconds)' },
        ],
      },
      {
        key: 'AUTH_WEBAUTHN_ENABLED',
        label: 'Enable Passwordless Authentication (WebAuthn)',
        type: 'boolean',
        defaultValue: false,
        helperText: 'Allow users to login with biometrics or security keys',
      },
      {
        key: 'AUTH_EMAIL_VERIFICATION_REQUIRED',
        label: 'Require Email Verification',
        type: 'boolean',
        defaultValue: !isDev,
        helperText: 'Users must verify email before accessing the app',
      },
    ]
  },
  nginx: (initialConfig) => {
    const isDev = initialConfig?.environment === 'dev'
    const adminEmail = initialConfig?.adminEmail || 'admin@yourdomain.com'

    return [
      {
        key: 'NGINX_VERSION',
        label: 'Version',
        type: 'select',
        defaultValue: 'alpine',
        options: [
          { value: 'alpine', label: 'Alpine (Latest, Lightweight)' },
          { value: '1.25-alpine', label: 'Nginx 1.25 Alpine' },
          { value: '1.24-alpine', label: 'Nginx 1.24 Alpine' },
        ],
      },
      {
        key: 'NGINX_HTTP_PORT',
        label: 'HTTP Port',
        type: 'number',
        placeholder: '80',
        defaultValue: 80,
      },
      {
        key: 'NGINX_HTTPS_PORT',
        label: 'HTTPS Port',
        type: 'number',
        placeholder: '443',
        defaultValue: 443,
      },
      {
        key: 'SSL_MODE',
        label: 'SSL/TLS Configuration',
        type: 'select',
        defaultValue: 'auto',
        options: [
          {
            value: 'auto',
            label: "Auto (Self-signed in Dev, Let's Encrypt in Prod)",
          },
          { value: 'local', label: 'Local Development (Self-signed)' },
          { value: 'letsencrypt', label: "Let's Encrypt (Production)" },
          { value: 'custom', label: 'Custom Certificates' },
          { value: 'none', label: 'No SSL (Not Recommended)' },
        ],
        helperText: 'Auto mode selects the best option based on environment',
      },
      {
        key: 'LETSENCRYPT_EMAIL',
        label: "Let's Encrypt Email",
        type: 'text',
        placeholder: adminEmail,
        defaultValue: adminEmail,
        helperText: "Required for Let's Encrypt SSL certificate notifications",
      },
      {
        key: 'NGINX_CLIENT_MAX_BODY_SIZE',
        label: 'Max Upload Size',
        type: 'select',
        defaultValue: '100M',
        options: [
          { value: '10M', label: '10 MB' },
          { value: '50M', label: '50 MB' },
          { value: '100M', label: '100 MB (Recommended)' },
          { value: '500M', label: '500 MB' },
          { value: '1G', label: '1 GB' },
        ],
      },
      {
        key: 'NGINX_GZIP_ENABLED',
        label: 'Enable Gzip Compression',
        type: 'boolean',
        defaultValue: true,
        helperText: 'Compress responses to reduce bandwidth usage',
      },
      {
        key: 'NGINX_RATE_LIMIT',
        label: 'Rate Limiting',
        type: 'select',
        defaultValue: isDev ? '10' : '50',
        options: [
          { value: 'off', label: 'Disabled' },
          { value: '10', label: '10 requests/second (Development)' },
          { value: '50', label: '50 requests/second (Standard)' },
          { value: '100', label: '100 requests/second (High Traffic)' },
        ],
        helperText: 'Limit requests per IP to prevent abuse',
      },
    ]
  },
  redis: (initialConfig) => [
    {
      key: 'REDIS_VERSION',
      label: 'Version',
      type: 'select',
      defaultValue: '7-alpine',
      options: [
        { value: '7-alpine', label: 'Redis 7 (Latest, Recommended)' },
        { value: '6-alpine', label: 'Redis 6 (Stable)' },
        { value: '5-alpine', label: 'Redis 5' },
      ],
    },
    {
      key: 'REDIS_PORT',
      label: 'Port',
      type: 'number',
      placeholder: '6379',
      defaultValue: 6379,
    },
    {
      key: 'REDIS_PASSWORD',
      label: 'Password',
      type: 'secret',
      placeholder: 'Leave empty for no password',
      defaultValue: initialConfig?.environment === 'dev' ? '' : generateSecret(24),
      secretLength: 24,
      helperText: 'Leave empty for development, required for production',
    },
    {
      key: 'REDIS_MAXMEMORY',
      label: 'Max Memory',
      type: 'select',
      defaultValue: '256mb',
      options: [
        { value: '128mb', label: '128 MB' },
        { value: '256mb', label: '256 MB (Recommended)' },
        { value: '512mb', label: '512 MB' },
        { value: '1gb', label: '1 GB' },
      ],
    },
    {
      key: 'REDIS_PERSISTENCE',
      label: 'Enable Persistence',
      type: 'boolean',
      defaultValue: true,
      helperText: 'Save data to disk for recovery after restart',
    },
  ],
  minio: (initialConfig) => [
    {
      key: 'MINIO_VERSION',
      label: 'Version',
      type: 'text',
      placeholder: 'latest',
      defaultValue: 'latest',
    },
    {
      key: 'MINIO_ROOT_USER',
      label: 'Root Username',
      type: 'text',
      placeholder: 'minioadmin',
      defaultValue: 'minioadmin',
    },
    {
      key: 'MINIO_ROOT_PASSWORD',
      label: 'Root Password',
      type: 'secret',
      placeholder: 'Minimum 8 characters',
      defaultValue: initialConfig?.environment === 'dev' ? 'minioadmin' : generateSecret(16),
      secretLength: 16,
      helperText: 'Minimum 8 characters required',
    },
    {
      key: 'MINIO_PORT',
      label: 'API Port',
      type: 'number',
      placeholder: '9000',
      defaultValue: 9000,
    },
    {
      key: 'MINIO_CONSOLE_PORT',
      label: 'Console Port',
      type: 'number',
      placeholder: '9001',
      defaultValue: 9001,
    },
    {
      key: 'MINIO_DEFAULT_BUCKETS',
      label: 'Default Buckets',
      type: 'text',
      placeholder: 'uploads,avatars,documents',
      defaultValue: 'uploads',
      helperText: 'Comma-separated list of buckets to create',
    },
  ],
  monitoring: (initialConfig) => [
    {
      key: 'PROMETHEUS_VERSION',
      label: 'Prometheus Version',
      type: 'text',
      placeholder: 'latest',
      defaultValue: 'latest',
    },
    {
      key: 'GRAFANA_VERSION',
      label: 'Grafana Version',
      type: 'text',
      placeholder: 'latest',
      defaultValue: 'latest',
    },
    {
      key: 'GRAFANA_ADMIN_PASSWORD',
      label: 'Grafana Admin Password',
      type: 'secret',
      placeholder: 'Admin password',
      defaultValue: initialConfig?.environment === 'dev' ? 'admin' : generateSecret(16),
      secretLength: 16,
      helperText: 'Password for Grafana admin user',
    },
    {
      key: 'LOKI_VERSION',
      label: 'Loki Version',
      type: 'text',
      placeholder: 'latest',
      defaultValue: 'latest',
    },
    {
      key: 'METRICS_RETENTION_DAYS',
      label: 'Metrics Retention',
      type: 'select',
      defaultValue: '7',
      options: [
        { value: '1', label: '1 Day' },
        { value: '7', label: '7 Days (Recommended)' },
        { value: '30', label: '30 Days' },
        { value: '90', label: '90 Days' },
      ],
    },
    {
      key: 'ENABLE_ALERTING',
      label: 'Enable Alerting',
      type: 'boolean',
      defaultValue: false,
      helperText: 'Configure alert rules and notifications',
    },
  ],
  mlflow: (_initialConfig) => [
    {
      key: 'MLFLOW_VERSION',
      label: 'Version',
      type: 'text',
      placeholder: 'latest',
      defaultValue: 'latest',
    },
    {
      key: 'MLFLOW_PORT',
      label: 'Port',
      type: 'number',
      placeholder: '5000',
      defaultValue: 5000,
    },
    {
      key: 'MLFLOW_BACKEND_STORE_URI',
      label: 'Backend Store',
      type: 'select',
      defaultValue: 'postgresql',
      options: [
        { value: 'postgresql', label: 'PostgreSQL (Use main database)' },
        { value: 'sqlite', label: 'SQLite (Local file)' },
        { value: 'mysql', label: 'MySQL (Separate database)' },
      ],
    },
    {
      key: 'MLFLOW_ARTIFACT_ROOT',
      label: 'Artifact Storage',
      type: 'select',
      defaultValue: 'minio',
      options: [
        { value: 'minio', label: 'MinIO (S3-compatible)' },
        { value: 'local', label: 'Local filesystem' },
        { value: 's3', label: 'AWS S3' },
      ],
    },
    {
      key: 'MLFLOW_DEFAULT_EXPERIMENT',
      label: 'Default Experiment Name',
      type: 'text',
      placeholder: 'Default',
      defaultValue: 'Default',
    },
  ],
  mailpit: (initialConfig) => {
    const isDev = initialConfig?.environment === 'dev'

    // In dev, only show Mailpit config
    if (isDev) {
      return [
        {
          key: 'EMAIL_PROVIDER',
          label: 'Email Provider',
          type: 'readonly',
          defaultValue: 'mailpit',
          helpText: 'Mailpit is used for development environments',
        },
        {
          key: 'MAILPIT_ENABLED',
          label: 'Enable Mailpit',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'MAILPIT_SMTP_PORT',
          label: 'SMTP Port',
          type: 'number',
          placeholder: '1025',
          defaultValue: 1025,
        },
        {
          key: 'MAILPIT_UI_PORT',
          label: 'Web UI Port',
          type: 'number',
          placeholder: '8025',
          defaultValue: 8025,
        },
        {
          key: 'EMAIL_FROM',
          label: 'Default From Email',
          type: 'email',
          placeholder: 'noreply@local.nself.org',
          defaultValue: `noreply@${initialConfig?.baseDomain || 'local.nself.org'}`,
        },
      ]
    }

    // For production, show SMTP configuration
    return [
      {
        key: 'EMAIL_PROVIDER',
        label: 'Email Provider',
        type: 'select',
        defaultValue: 'sendgrid',
        options: [
          { value: 'sendgrid', label: 'SendGrid' },
          { value: 'aws-ses', label: 'AWS SES' },
          { value: 'mailgun', label: 'Mailgun' },
          { value: 'postmark', label: 'Postmark' },
          { value: 'gmail', label: 'Gmail' },
          { value: 'outlook', label: 'Outlook' },
          { value: 'brevo', label: 'Brevo (Sendinblue)' },
          { value: 'resend', label: 'Resend' },
          { value: 'sparkpost', label: 'SparkPost' },
          { value: 'mandrill', label: 'Mandrill' },
          { value: 'elastic', label: 'Elastic Email' },
          { value: 'smtp2go', label: 'SMTP2GO' },
          { value: 'mailersend', label: 'MailerSend' },
          { value: 'postfix', label: 'Postfix (Self-hosted)' },
          { value: 'mailchimp', label: 'Mailchimp Transactional' },
          { value: 'custom', label: 'Custom SMTP' },
        ],
        helpText: 'Select email provider for production',
      },
      // SMTP Configuration fields based on provider
      {
        key: 'AUTH_SMTP_HOST',
        label: 'SMTP Host',
        type: 'text',
        placeholder: 'smtp.sendgrid.net',
        defaultValue: (() => {
          const provider = 'sendgrid' // default
          const hosts: Record<string, string> = {
            sendgrid: 'smtp.sendgrid.net',
            'aws-ses': 'email-smtp.us-east-1.amazonaws.com',
            mailgun: 'smtp.mailgun.org',
            postmark: 'smtp.postmarkapp.com',
            gmail: 'smtp.gmail.com',
            outlook: 'smtp.office365.com',
            brevo: 'smtp-relay.brevo.com',
            resend: 'smtp.resend.com',
            sparkpost: 'smtp.sparkpostmail.com',
            mandrill: 'smtp.mandrillapp.com',
            elastic: 'smtp.elasticemail.com',
            smtp2go: 'mail.smtp2go.com',
            mailersend: 'smtp.mailersend.net',
            postfix: 'localhost',
            mailchimp: 'smtp.mandrillapp.com',
            custom: '',
          }
          return hosts[provider] || ''
        })(),
      },
      {
        key: 'AUTH_SMTP_PORT',
        label: 'SMTP Port',
        type: 'number',
        placeholder: '587',
        defaultValue: 587,
        helpText: 'Common ports: 25, 587 (TLS), 465 (SSL), 2525',
      },
      {
        key: 'AUTH_SMTP_USER',
        label: 'SMTP Username',
        type: 'text',
        placeholder: 'apikey (for SendGrid) or your username',
        helpText: 'For SendGrid use "apikey", for others use your username',
      },
      {
        key: 'AUTH_SMTP_PASS',
        label: 'SMTP Password/API Key',
        type: 'secret',
        placeholder: 'Your API key or password',
        secretLength: 32,
        helpText: 'API key for services like SendGrid, or SMTP password',
      },
      {
        key: 'AUTH_SMTP_SECURE',
        label: 'Use TLS/SSL',
        type: 'boolean',
        defaultValue: true,
        helpText: 'Enable encryption for SMTP connection',
      },
      {
        key: 'AUTH_SMTP_SENDER',
        label: 'From Email Address',
        type: 'email',
        placeholder: 'noreply@yourdomain.com',
        defaultValue:
          initialConfig?.adminEmail || `noreply@${initialConfig?.baseDomain || 'yourdomain.com'}`,
        helpText: 'Default sender email address',
      },
      {
        key: 'EMAIL_FROM',
        label: 'Display Name',
        type: 'text',
        placeholder: 'My App',
        defaultValue: initialConfig?.projectName || 'My App',
        helpText: 'Name shown in email from field',
      },
    ]
  },
  elasticsearch: (initialConfig) => [
    {
      key: 'SEARCH_ENGINE',
      label: 'Search Engine',
      type: 'select',
      defaultValue: 'postgres',
      options: [
        {
          value: 'postgres',
          label: 'PostgreSQL Full-Text Search (No extra container)',
        },
        {
          value: 'meilisearch',
          label: 'MeiliSearch (Recommended for most use cases)',
        },
        { value: 'typesense', label: 'Typesense' },
        { value: 'elasticsearch', label: 'Elasticsearch (Resource intensive)' },
        {
          value: 'opensearch',
          label: 'OpenSearch (AWS fork of Elasticsearch)',
        },
        { value: 'sonic', label: 'Sonic (Lightweight, autocomplete only)' },
      ],
      helpText: 'Select search engine based on your needs and resources',
    },
    {
      key: 'SEARCH_ENABLED',
      label: 'Enable Search',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Enable search functionality in your application',
    },
    {
      key: 'SEARCH_HOST',
      label: 'Search Host',
      type: 'text',
      placeholder: 'search',
      defaultValue: 'search',
      condition: (config) => config.SEARCH_ENGINE !== 'postgres',
    },
    {
      key: 'SEARCH_PORT',
      label: 'Search Port',
      type: 'number',
      placeholder: '7700',
      defaultValue: 7700,
      condition: (config) => config.SEARCH_ENGINE !== 'postgres',
    },
    // MeiliSearch configuration
    {
      key: 'MEILISEARCH_ENABLED',
      label: 'Enable MeiliSearch',
      type: 'boolean',
      defaultValue: true,
      condition: (config) => config.SEARCH_ENGINE === 'meilisearch',
    },
    {
      key: 'MEILISEARCH_VERSION',
      label: 'MeiliSearch Version',
      type: 'text',
      placeholder: 'v1.5',
      defaultValue: 'v1.5',
      condition: (config) => config.SEARCH_ENGINE === 'meilisearch',
    },
    {
      key: 'MEILISEARCH_MASTER_KEY',
      label: 'Master Key',
      type: 'secret',
      placeholder: '32 character key',
      defaultValue:
        initialConfig?.environment === 'dev'
          ? 'CHANGE_THIS_32_CHAR_KEY_FOR_PROD'
          : generateSecret(32),
      secretLength: 32,
      helpText: 'Must be at least 32 characters in production',
      condition: (config) => config.SEARCH_ENGINE === 'meilisearch',
    },
    {
      key: 'MEILISEARCH_PORT',
      label: 'Port',
      type: 'number',
      placeholder: '7700',
      defaultValue: 7700,
      condition: (config) => config.SEARCH_ENGINE === 'meilisearch',
    },
    // Typesense configuration
    {
      key: 'TYPESENSE_ENABLED',
      label: 'Enable Typesense',
      type: 'boolean',
      defaultValue: true,
      condition: (config) => config.SEARCH_ENGINE === 'typesense',
    },
    {
      key: 'TYPESENSE_VERSION',
      label: 'Typesense Version',
      type: 'text',
      placeholder: '0.25.1',
      defaultValue: '0.25.1',
      condition: (config) => config.SEARCH_ENGINE === 'typesense',
    },
    {
      key: 'TYPESENSE_API_KEY',
      label: 'API Key',
      type: 'secret',
      placeholder: 'Your API key',
      defaultValue: generateSecret(32),
      secretLength: 32,
      condition: (config) => config.SEARCH_ENGINE === 'typesense',
    },
    // Elasticsearch configuration
    {
      key: 'ELASTICSEARCH_ENABLED',
      label: 'Enable Elasticsearch',
      type: 'boolean',
      defaultValue: true,
      condition: (config) => config.SEARCH_ENGINE === 'elasticsearch',
    },
    {
      key: 'ELASTICSEARCH_VERSION',
      label: 'Version',
      type: 'select',
      defaultValue: '8.11.0',
      options: [
        { value: '8.11.0', label: '8.11.0 (Latest)' },
        { value: '8.10.0', label: '8.10.0' },
        { value: '7.17.0', label: '7.17.0 (Legacy)' },
      ],
      condition: (config) => config.SEARCH_ENGINE === 'elasticsearch',
    },
    {
      key: 'ELASTICSEARCH_PORT',
      label: 'Port',
      type: 'number',
      placeholder: '9200',
      defaultValue: 9200,
      condition: (config) => config.SEARCH_ENGINE === 'elasticsearch',
    },
    {
      key: 'ELASTICSEARCH_MEMORY',
      label: 'Heap Size',
      type: 'select',
      defaultValue: '2g',
      options: [
        { value: '512m', label: '512 MB' },
        { value: '1g', label: '1 GB' },
        { value: '2g', label: '2 GB (Recommended)' },
        { value: '4g', label: '4 GB' },
      ],
      condition: (config) => config.SEARCH_ENGINE === 'elasticsearch',
      helpText: 'Elasticsearch requires at least 2GB RAM for production',
    },
    // OpenSearch configuration
    {
      key: 'OPENSEARCH_ENABLED',
      label: 'Enable OpenSearch',
      type: 'boolean',
      defaultValue: true,
      condition: (config) => config.SEARCH_ENGINE === 'opensearch',
    },
    {
      key: 'OPENSEARCH_VERSION',
      label: 'Version',
      type: 'text',
      placeholder: '2.11.0',
      defaultValue: '2.11.0',
      condition: (config) => config.SEARCH_ENGINE === 'opensearch',
    },
    {
      key: 'OPENSEARCH_PORT',
      label: 'Port',
      type: 'number',
      placeholder: '9200',
      defaultValue: 9200,
      condition: (config) => config.SEARCH_ENGINE === 'opensearch',
    },
    {
      key: 'OPENSEARCH_MEMORY',
      label: 'Heap Size',
      type: 'select',
      defaultValue: '2g',
      options: [
        { value: '512m', label: '512 MB' },
        { value: '1g', label: '1 GB' },
        { value: '2g', label: '2 GB (Recommended)' },
        { value: '4g', label: '4 GB' },
      ],
      condition: (config) => config.SEARCH_ENGINE === 'opensearch',
    },
    // Sonic configuration
    {
      key: 'SONIC_ENABLED',
      label: 'Enable Sonic',
      type: 'boolean',
      defaultValue: true,
      condition: (config) => config.SEARCH_ENGINE === 'sonic',
    },
    {
      key: 'SONIC_VERSION',
      label: 'Version',
      type: 'text',
      placeholder: 'v1.4.8',
      defaultValue: 'v1.4.8',
      condition: (config) => config.SEARCH_ENGINE === 'sonic',
    },
    {
      key: 'SONIC_PASSWORD',
      label: 'Password',
      type: 'secret',
      placeholder: 'Sonic password',
      defaultValue: generateSecret(24),
      secretLength: 24,
      condition: (config) => config.SEARCH_ENGINE === 'sonic',
    },
    // Common search settings
    {
      key: 'SEARCH_API_KEY',
      label: 'Search API Key',
      type: 'secret',
      placeholder: 'API key for search service',
      defaultValue: generateSecret(32),
      secretLength: 32,
      condition: (config) => ['meilisearch', 'typesense'].includes(config.SEARCH_ENGINE as string),
      helpText: 'Required for MeiliSearch and Typesense',
    },
    {
      key: 'SEARCH_INDEX_PREFIX',
      label: 'Index Prefix',
      type: 'text',
      placeholder: 'dev_',
      defaultValue: initialConfig?.environment === 'prod' ? 'prod_' : 'dev_',
      helpText: 'Prefix for search indexes to separate environments',
    },
    {
      key: 'SEARCH_AUTO_INDEX',
      label: 'Auto Index',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Automatically index new data',
    },
    {
      key: 'SEARCH_LANGUAGE',
      label: 'Default Language',
      type: 'select',
      defaultValue: 'en',
      options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'zh', label: 'Chinese' },
        { value: 'ja', label: 'Japanese' },
      ],
    },
  ],
}

export default function ServiceConfigModal({
  isOpen,
  onClose,
  service,
  config,
  onSave,
  initialConfig,
}: ServiceConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<ServiceConfig>({})
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [showAdvancedExtensions, setShowAdvancedExtensions] = useState(false)
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && config) {
      setLocalConfig(config)
      // Initialize extensions
      if (service === 'postgresql') {
        const extensions = (config.POSTGRES_EXTENSIONS as string) || 'uuid-ossp'
        setSelectedExtensions(
          extensions
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean)
        )
      }
    }
  }, [isOpen, config, service])

  const fields = serviceConfigs[service] ? serviceConfigs[service](initialConfig) : []

  const handleChange = (key: string, value: any) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleExtensionToggle = (extensionName: string) => {
    setSelectedExtensions((prev) => {
      if (prev.includes(extensionName)) {
        return prev.filter((e) => e !== extensionName)
      } else {
        return [...prev, extensionName]
      }
    })
  }

  const handleGenerateSecret = (key: string, length: number = 32) => {
    const newSecret = generateSecret(length)
    handleChange(key, newSecret)
  }

  const handleSave = () => {
    const finalConfig = { ...localConfig }
    if (service === 'postgresql') {
      finalConfig.POSTGRES_EXTENSIONS = selectedExtensions.join(',')
    }
    onSave(finalConfig)
    onClose()
  }

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const getServiceTitle = (service: string) => {
    const titles: Record<string, string> = {
      postgresql: 'PostgreSQL Database',
      hasura: 'Hasura GraphQL Engine',
      auth: 'Authentication Service',
      nginx: 'Nginx Proxy & Load Balancer',
      redis: 'Redis Cache',
      minio: 'MinIO Object Storage',
      monitoring: 'Monitoring Bundle',
      mlflow: 'MLflow ML Platform',
      mailpit: 'Mail Service',
      elasticsearch: 'Search Service',
    }
    return titles[service] || service
  }

  const renderField = (field: ConfigField) => {
    if (field.type === 'readonly') {
      return (
        <div className="relative">
          <input
            type="text"
            value={(localConfig[field.key] as string) || (field.defaultValue as string) || ''}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 pr-10 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300"
          />
          <Lock className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        </div>
      )
    }

    if (field.type === 'secret') {
      return (
        <div className="relative">
          <input
            type={showPasswords[field.key] ? 'text' : 'password'}
            value={(localConfig[field.key] as string) || (field.defaultValue as string) || ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-20 text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
            <button
              type="button"
              onClick={() => handleGenerateSecret(field.key, field.secretLength)}
              className="p-1 text-zinc-500 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              title="Generate new secret"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => togglePasswordVisibility(field.key)}
              className="p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {showPasswords[field.key] ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )
    }

    if (field.type === 'extensions' && service === 'postgresql') {
      const coreExtensions = postgresExtensions.filter(
        (e) => e.category === 'core' || e.category === 'popular'
      )
      const advancedExtensions = postgresExtensions.filter((e) => e.category === 'advanced')

      return (
        <div className="space-y-3">
          {/* Core/Popular Extensions */}
          <div className="space-y-2">
            {coreExtensions.map((ext) => (
              <label
                key={ext.name}
                className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <input
                  type="checkbox"
                  checked={selectedExtensions.includes(ext.name)}
                  onChange={() => handleExtensionToggle(ext.name)}
                  className="mt-1 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                      {ext.name}
                    </span>
                    {ext.category === 'core' && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Core
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{ext.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Show More Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedExtensions(!showAdvancedExtensions)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showAdvancedExtensions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {showAdvancedExtensions
              ? 'Show Less'
              : `Show ${advancedExtensions.length} More Advanced Extensions`}
          </button>

          {/* Advanced Extensions */}
          {showAdvancedExtensions && (
            <div className="space-y-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
              {advancedExtensions.map((ext) => (
                <label
                  key={ext.name}
                  className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedExtensions.includes(ext.name)}
                    onChange={() => handleExtensionToggle(ext.name)}
                    className="mt-1 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {ext.name}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Advanced
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{ext.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Selected Summary */}
          {selectedExtensions.length > 0 && (
            <div className="mt-2 rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <Check className="mr-1 inline h-3 w-3" />
                {selectedExtensions.length} extension
                {selectedExtensions.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>
      )
    }

    if (field.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={(localConfig[field.key] as boolean) || (field.defaultValue as boolean) || false}
          onChange={(e) => handleChange(field.key, e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
        />
      )
    }

    if (field.type === 'email') {
      return (
        <input
          type="email"
          value={(localConfig[field.key] as string) || (field.defaultValue as string) || ''}
          onChange={(e) => handleChange(field.key, e.target.value)}
          placeholder={field.placeholder || 'email@example.com'}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        />
      )
    }

    if (field.type === 'boolean') {
      return (
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={
              (localConfig[field.key] as boolean) || (field.defaultValue as boolean) || false
            }
            onChange={(e) => handleChange(field.key, e.target.checked)}
            className="peer sr-only"
          />
          <div className="peer h-6 w-11 rounded-full bg-zinc-200 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-zinc-700 dark:peer-focus:ring-blue-800"></div>
        </label>
      )
    }

    if (field.type === 'select') {
      return (
        <select
          value={(localConfig[field.key] as string) || String(field.defaultValue || '')}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (field.type === 'password') {
      return (
        <div className="relative">
          <input
            type={showPasswords[field.key] ? 'text' : 'password'}
            value={(localConfig[field.key] as string) || ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility(field.key)}
            className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {showPasswords[field.key] ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      )
    }

    return (
      <input
        type={field.type}
        value={(localConfig[field.key] as string) || String(field.defaultValue || '')}
        onChange={(e) =>
          handleChange(
            field.key,
            field.type === 'number' ? parseInt(e.target.value) : e.target.value
          )
        }
        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
      />
    )
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-zinc-900">
                <Dialog.Title as="div" className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Configure {getServiceTitle(service)}
                  </h3>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <X className="h-5 w-5 text-zinc-500" />
                  </button>
                </Dialog.Title>

                <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-2">
                  {fields
                    .filter((field) => !field.condition || field.condition(localConfig))
                    .map((field) => (
                      <div key={field.key}>
                        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {field.label}
                          {field.required && <span className="ml-1 text-red-500">*</span>}
                        </label>

                        {renderField(field)}

                        {(field.helperText || field.helpText) && (
                          <p className="mt-1 flex items-start gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                            {field.helperText || field.helpText}
                          </p>
                        )}
                      </div>
                    ))}

                  {/* Auth service note */}
                  {service === 'auth' && (
                    <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <Info className="mr-2 inline h-4 w-4" />
                        <strong>Note:</strong> Email settings will be configured in the optional
                        Mail service section. Frontend application URLs will be set up in the
                        Frontend Apps configuration. These settings will automatically integrate
                        with Auth service when configured.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-1 dark:ring-zinc-400/20 dark:ring-inset dark:hover:bg-zinc-400/10 dark:hover:text-zinc-300 dark:hover:ring-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-1 dark:ring-blue-400/20 dark:ring-inset dark:hover:bg-blue-400/10 dark:hover:text-blue-300 dark:hover:ring-blue-300"
                  >
                    Save Configuration
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
