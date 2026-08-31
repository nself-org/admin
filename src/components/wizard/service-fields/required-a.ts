/**
 * Purpose: Service-detail-modal field configs for postgres/hasura/nginx,
 *          extracted verbatim from ProjectSetupWizard.tsx's SERVICE_FIELDS
 *          const (split 3 ways purely for the 300-line file cap — pure data,
 *          no logic).
 * Inputs: none.
 * Outputs: requiredServiceFieldsA (postgres, hasura, nginx keys).
 * Constraints: Keys/order must exactly match ProjectConfig's field names —
 *              ServiceDetailModal maps these to config.<key> for editing.
 */

export const requiredServiceFieldsA = {
  postgres: [
    // Most important settings at top
    {
      key: 'version',
      label: 'PostgreSQL Version',
      type: 'select' as const,
      options: [
        { value: '16-alpine', label: '16 Alpine (Latest)' },
        { value: '15-alpine', label: '15 Alpine' },
        { value: '14-alpine', label: '14 Alpine' },
      ],
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number' as const,
      placeholder: '5432',
      help: 'Database connection port',
    },
    {
      key: 'maxConnections',
      label: 'Max Connections',
      type: 'number' as const,
      help: 'Maximum number of concurrent connections',
    },
    {
      key: 'poolingEnabled',
      label: 'Connection Pooling',
      type: 'select' as const,
      options: [
        { value: 'auto', label: 'Auto (Recommended)' },
        { value: 'true', label: 'Always Enabled' },
        { value: 'false', label: 'Disabled' },
      ],
    },
    // Advanced settings
    {
      key: 'shared_buffers',
      label: 'Shared Buffers',
      type: 'text' as const,
      placeholder: '256MB',
      advanced: true,
    },
    {
      key: 'work_mem',
      label: 'Work Memory',
      type: 'text' as const,
      placeholder: '4MB',
      advanced: true,
    },
    {
      key: 'maintenance_work_mem',
      label: 'Maintenance Work Memory',
      type: 'text' as const,
      placeholder: '64MB',
      advanced: true,
    },
    {
      key: 'effective_cache_size',
      label: 'Effective Cache Size',
      type: 'text' as const,
      placeholder: '1GB',
      advanced: true,
    },
    {
      key: 'checkpoint_timeout',
      label: 'Checkpoint Timeout',
      type: 'text' as const,
      placeholder: '5min',
      advanced: true,
    },
    {
      key: 'max_wal_size',
      label: 'Max WAL Size',
      type: 'text' as const,
      placeholder: '1GB',
      advanced: true,
    },
    {
      key: 'min_wal_size',
      label: 'Min WAL Size',
      type: 'text' as const,
      placeholder: '80MB',
      advanced: true,
    },
    {
      key: 'wal_level',
      label: 'WAL Level',
      type: 'select' as const,
      advanced: true,
      options: [
        { value: 'replica', label: 'Replica (Default)' },
        { value: 'logical', label: 'Logical' },
        { value: 'minimal', label: 'Minimal' },
      ],
    },
    {
      key: 'archive_mode',
      label: 'Archive Mode',
      type: 'select' as const,
      advanced: true,
      options: [
        { value: 'off', label: 'Off (Default)' },
        { value: 'on', label: 'On' },
        { value: 'always', label: 'Always' },
      ],
    },
  ],
  hasura: [
    {
      key: 'version',
      label: 'Hasura Version',
      type: 'text' as const,
      placeholder: 'v2.44.0',
    },
    {
      key: 'consoleEnabled',
      label: 'Enable Console',
      type: 'boolean' as const,
    },
    { key: 'devMode', label: 'Development Mode', type: 'boolean' as const },
    {
      key: 'cors',
      label: 'CORS Domain',
      type: 'text' as const,
      placeholder: '*',
    },
    {
      key: 'enable_telemetry',
      label: 'Enable Telemetry',
      type: 'boolean' as const,
      advanced: true,
    },
    {
      key: 'unauthorized_role',
      label: 'Unauthorized Role',
      type: 'text' as const,
      placeholder: 'anonymous',
      advanced: true,
    },
    {
      key: 'enable_allowlist',
      label: 'Enable Query Allowlist',
      type: 'boolean' as const,
      advanced: true,
    },
  ],
  nginx: [
    // Most important settings at top
    {
      key: 'httpPort',
      label: 'HTTP Port',
      type: 'number' as const,
      placeholder: '80',
    },
    {
      key: 'httpsPort',
      label: 'HTTPS Port',
      type: 'number' as const,
      placeholder: '443',
    },
    {
      key: 'sslMode',
      label: 'SSL Mode',
      type: 'select' as const,
      options: [
        {
          value: 'auto',
          label: "Auto (Let's Encrypt for production, self-signed for dev)",
        },
        { value: 'letsencrypt', label: "Let's Encrypt (Production)" },
        { value: 'self-signed', label: 'Self-signed (Development)' },
        { value: 'custom', label: 'Custom Certificate' },
        { value: 'none', label: 'No SSL (Not recommended)' },
      ],
      help: 'SSL configuration for your domain',
    },
    {
      key: 'forceSSL',
      label: 'Force HTTPS Redirect',
      type: 'boolean' as const,
      help: 'Redirect all HTTP traffic to HTTPS',
    },

    // SSL Certificate Settings (advanced)
    {
      key: 'sslCertPath',
      label: 'SSL Certificate Path',
      type: 'text' as const,
      placeholder: '/etc/nginx/ssl/cert.pem',
      advanced: true,
    },
    {
      key: 'sslKeyPath',
      label: 'SSL Key Path',
      type: 'text' as const,
      placeholder: '/etc/nginx/ssl/key.pem',
      advanced: true,
    },
    {
      key: 'sslProtocols',
      label: 'SSL Protocols',
      type: 'text' as const,
      placeholder: 'TLSv1.2 TLSv1.3',
      advanced: true,
    },
    {
      key: 'sslCiphers',
      label: 'SSL Ciphers',
      type: 'text' as const,
      placeholder: 'HIGH:!aNULL:!MD5',
      advanced: true,
    },

    // Performance settings (advanced)
    {
      key: 'client_max_body_size',
      label: 'Max Upload Size',
      type: 'text' as const,
      placeholder: '100M',
      advanced: true,
    },
    {
      key: 'keepalive_timeout',
      label: 'Keepalive Timeout',
      type: 'number' as const,
      placeholder: '65',
      advanced: true,
    },
    {
      key: 'gzip',
      label: 'Enable Gzip Compression',
      type: 'boolean' as const,
      advanced: true,
    },
    {
      key: 'worker_processes',
      label: 'Worker Processes',
      type: 'text' as const,
      placeholder: 'auto',
      advanced: true,
    },
    {
      key: 'worker_connections',
      label: 'Worker Connections',
      type: 'number' as const,
      placeholder: '1024',
      advanced: true,
    },
  ],
}
