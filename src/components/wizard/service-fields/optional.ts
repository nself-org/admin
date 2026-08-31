/**
 * Purpose: Service-detail-modal field configs for monitoring/search/mlflow/
 *          nadmin, extracted verbatim from ProjectSetupWizard.tsx's
 *          SERVICE_FIELDS const (split 3 ways purely for the 300-line cap).
 * Inputs: none.
 * Outputs: optionalServiceFields (monitoring, search, mlflow, nadmin keys).
 * Constraints: same as required-a.ts.
 */

export const optionalServiceFields = {
  monitoring: [
    {
      key: 'grafanaPort',
      label: 'Grafana Port',
      type: 'number' as const,
      placeholder: '3000',
    },
    {
      key: 'prometheusPort',
      label: 'Prometheus Port',
      type: 'number' as const,
      placeholder: '9090',
    },
    {
      key: 'lokiPort',
      label: 'Loki Port',
      type: 'number' as const,
      placeholder: '3100',
    },
    {
      key: 'jaegerPort',
      label: 'Jaeger Port',
      type: 'number' as const,
      placeholder: '16686',
    },
    {
      key: 'retentionDays',
      label: 'Data Retention (days)',
      type: 'number' as const,
      placeholder: '30',
      advanced: true,
    },
    {
      key: 'scrapeInterval',
      label: 'Scrape Interval',
      type: 'text' as const,
      placeholder: '15s',
      advanced: true,
    },
    {
      key: 'enableAlerts',
      label: 'Enable Alerting',
      type: 'boolean' as const,
      advanced: true,
    },
  ],
  search: [
    {
      key: 'port',
      label: 'Port',
      type: 'number' as const,
      placeholder: '7700',
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password' as const,
      placeholder: 'Master key for search',
    },
    {
      key: 'maxIndexSize',
      label: 'Max Index Size',
      type: 'text' as const,
      placeholder: '100GB',
      advanced: true,
    },
    {
      key: 'maxDocumentSize',
      label: 'Max Document Size',
      type: 'text' as const,
      placeholder: '100MB',
      advanced: true,
    },
    {
      key: 'enableTypoTolerance',
      label: 'Typo Tolerance',
      type: 'boolean' as const,
      advanced: true,
    },
    {
      key: 'enableSynonyms',
      label: 'Enable Synonyms',
      type: 'boolean' as const,
      advanced: true,
    },
    {
      key: 'rankingRules',
      label: 'Ranking Rules',
      type: 'text' as const,
      placeholder: 'words,typo,proximity',
      advanced: true,
    },
  ],
  mlflow: [
    {
      key: 'trackingPort',
      label: 'Tracking Server Port',
      type: 'number' as const,
      placeholder: '5000',
    },
    {
      key: 'artifactRoot',
      label: 'Artifact Storage Path',
      type: 'text' as const,
      placeholder: '/mlflow/artifacts',
    },
    {
      key: 'backendStore',
      label: 'Backend Store URI',
      type: 'text' as const,
      placeholder: 'postgresql://...',
      advanced: true,
    },
    {
      key: 'defaultArtifactRoot',
      label: 'Default Artifact Root',
      type: 'text' as const,
      placeholder: 's3://bucket/path',
      advanced: true,
    },
    {
      key: 'serveArtifacts',
      label: 'Serve Artifacts',
      type: 'boolean' as const,
      advanced: true,
    },
    {
      key: 'enablePrometheus',
      label: 'Enable Prometheus Metrics',
      type: 'boolean' as const,
      advanced: true,
    },
  ],
  nadmin: [
    {
      key: 'port',
      label: 'Admin UI Port',
      type: 'number' as const,
      placeholder: '3021',
    },
    {
      key: 'sessionTimeout',
      label: 'Session Timeout (minutes)',
      type: 'number' as const,
      placeholder: '1440',
      help: '24 hours default',
    },
    {
      key: 'enableMetrics',
      label: 'Enable Metrics Dashboard',
      type: 'boolean' as const,
    },
    {
      key: 'enableBackups',
      label: 'Enable Backup Management',
      type: 'boolean' as const,
    },
    {
      key: 'enable2FA',
      label: 'Require 2FA',
      type: 'boolean' as const,
      advanced: true,
    },
    {
      key: 'maxLoginAttempts',
      label: 'Max Login Attempts',
      type: 'number' as const,
      placeholder: '5',
      advanced: true,
    },
    {
      key: 'lockoutDuration',
      label: 'Lockout Duration (minutes)',
      type: 'number' as const,
      placeholder: '30',
      advanced: true,
    },
  ],
}
