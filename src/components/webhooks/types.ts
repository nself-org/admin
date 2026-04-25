/**
 * Shared TypeScript types for the webhooks Admin UI components.
 * Keep in sync with the Go structs in cli/internal/webhook/.
 */

export type CircuitState = 'closed' | 'half-open' | 'open'

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying'

export interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  enabled: boolean
  /** HMAC-SHA256 signing secret. Masked in list view; set via rotate-secret API. */
  signingSecretMasked: string
  healthScore: number
  circuitState: CircuitState
  createdAt: string
  updatedAt: string
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  eventName: string
  status: DeliveryStatus
  statusCode: number | null
  attemptCount: number
  responseMs: number | null
  signed: boolean
  nextRetryAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DLQEntry {
  id: string
  endpointId: string
  deliveryId: string
  finalError: string
  quarantinedAt: string
  reEnqueuedAt: string | null
}

export interface HealthSummary {
  endpointId: string
  endpointName: string
  healthScore: number
  circuitState: CircuitState
  totalDeliveries: number
  failedDeliveries: number
  lastDeliveryAt: string | null
}
