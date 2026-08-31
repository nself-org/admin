/**
 * Purpose: Service-detail-modal field configs for auth/storage/redis/mail,
 *          extracted verbatim from ProjectSetupWizard.tsx's SERVICE_FIELDS
 *          const (split 3 ways purely for the 300-line file cap).
 * Inputs: none.
 * Outputs: requiredServiceFieldsB (auth, storage, redis, mail keys).
 * Constraints: same as required-a.ts.
 */

export const requiredServiceFieldsB = {
  auth: [
    {
      key: 'jwtExpiresIn',
      label: 'JWT Expires In (seconds)',
      type: 'number' as const,
      placeholder: '900',
    },
    {
      key: 'refreshExpiresIn',
      label: 'Refresh Token Expires In (seconds)',
      type: 'number' as const,
      placeholder: '2592000',
    },
    {
      key: 'smtpHost',
      label: 'SMTP Host',
      type: 'text' as const,
      placeholder: 'mailpit',
    },
    {
      key: 'smtpPort',
      label: 'SMTP Port',
      type: 'number' as const,
      placeholder: '1025',
    },
    {
      key: 'smtpSender',
      label: 'SMTP Sender',
      type: 'text' as const,
      placeholder: 'noreply@localhost',
    },
    {
      key: 'webauthn_enabled',
      label: 'Enable WebAuthn',
      type: 'boolean' as const,
      advanced: true,
    },
    {
      key: 'email_verification',
      label: 'Require Email Verification',
      type: 'boolean' as const,
      advanced: true,
    },
  ],
  storage: [
    { key: 'accessKey', label: 'Access Key', type: 'text' as const },
    { key: 'secretKey', label: 'Secret Key', type: 'password' as const },
    {
      key: 'bucket',
      label: 'Default Bucket',
      type: 'text' as const,
      placeholder: 'nself',
    },
    {
      key: 'region',
      label: 'Region',
      type: 'text' as const,
      placeholder: 'us-east-1',
    },
    {
      key: 'public_url',
      label: 'Public URL',
      type: 'text' as const,
      placeholder: 'auto',
      advanced: true,
    },
    {
      key: 'max_file_size',
      label: 'Max File Size',
      type: 'text' as const,
      placeholder: '50MB',
      advanced: true,
    },
  ],
  redis: [
    {
      key: 'port',
      label: 'Port',
      type: 'number' as const,
      placeholder: '6379',
    },
    {
      key: 'version',
      label: 'Redis Version',
      type: 'select' as const,
      options: [
        { value: '7-alpine', label: '7 Alpine (Latest)' },
        { value: '6-alpine', label: '6 Alpine' },
        { value: '5-alpine', label: '5 Alpine' },
      ],
    },
    {
      key: 'maxMemory',
      label: 'Max Memory',
      type: 'text' as const,
      placeholder: '256mb',
      help: 'Maximum memory Redis can use',
    },
    {
      key: 'password',
      label: 'Password (Production)',
      type: 'password' as const,
      placeholder: 'Leave empty for dev',
      advanced: true,
    },
    {
      key: 'persistence',
      label: 'Enable Persistence',
      type: 'boolean' as const,
      advanced: true,
    },
    {
      key: 'save',
      label: 'Save Frequency',
      type: 'text' as const,
      placeholder: '60 1',
      help: 'Save after N seconds and M changes',
      advanced: true,
    },
  ],
  mail: [
    {
      key: 'smtpHost',
      label: 'SMTP Host',
      type: 'text' as const,
      placeholder: 'smtp.example.com',
    },
    {
      key: 'smtpPort',
      label: 'SMTP Port',
      type: 'number' as const,
      placeholder: '587',
    },
    {
      key: 'smtpUser',
      label: 'SMTP Username',
      type: 'text' as const,
      placeholder: 'username',
    },
    { key: 'smtpPass', label: 'SMTP Password', type: 'password' as const },
    { key: 'smtpSecure', label: 'Use TLS/SSL', type: 'boolean' as const },
    {
      key: 'fromEmail',
      label: 'From Email',
      type: 'text' as const,
      placeholder: 'noreply@example.com',
    },
    {
      key: 'fromName',
      label: 'From Name',
      type: 'text' as const,
      placeholder: 'nself',
      advanced: true,
    },
    {
      key: 'replyTo',
      label: 'Reply To',
      type: 'text' as const,
      placeholder: 'support@example.com',
      advanced: true,
    },
    {
      key: 'apiKey',
      label: 'API Key (for API providers)',
      type: 'password' as const,
      advanced: true,
    },
  ],
}
