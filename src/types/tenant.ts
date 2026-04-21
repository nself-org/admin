// SCAFFOLDING for v1.2.0 multi-user Admin (target Q3 2026).
// NOT WIRED in v1.0.9/v1.1.0 — all multi-user UI hidden behind
// NSELF_ADMIN_MULTIUSER feature flag (default false).
// See: web/docs/admin/single-user-posture.mdx + STORM-RBAC § Section 4.
//
// Do NOT delete this file — it preserves the type design for direct
// re-activation when the CLI commands (`nself auth roles *`, `nself user *`)
// are implemented in v1.2.0. The design was authored at v0.0.8 and is
// intentionally kept current.

/**
 * Multi-Tenancy & Organization Types for nself-admin v0.0.8
 *
 * This file contains all TypeScript interfaces for the multi-tenant
 * architecture, including tenants, organizations, teams, and members.
 */

// =============================================================================
// Tenant Status & Plan Types
// =============================================================================

/** Current operational status of a tenant */
export type TenantStatus = 'active' | 'suspended' | 'pending'

/** Subscription plan level for a tenant */
export type TenantPlan = 'free' | 'pro' | 'enterprise'

/** Role within a tenant (cross-organization) */
export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer'

// =============================================================================
// Core Tenant Interfaces
// =============================================================================

/**
 * Primary tenant entity representing an isolated workspace.
 * Each tenant has its own settings, branding, quotas, and members.
 */
export interface Tenant {
  id: string
  name: string
  slug: string
  status: TenantStatus
  plan: TenantPlan
  createdAt: string
  updatedAt: string
  settings: TenantSettings
  branding: TenantBranding
  quota: TenantQuota
  ownerId: string
}

/**
 * Configuration settings for a tenant.
 * Controls signup behavior, limits, and enabled features.
 */
export interface TenantSettings {
  allowPublicSignup: boolean
  requireEmailVerification: boolean
  maxMembers: number
  maxStorage: number // in bytes
  apiRateLimit: number // requests per minute
  features: string[]
}

/**
 * Visual branding configuration for a tenant.
 * Allows customization of colors, logos, and styles.
 */
export interface TenantBranding {
  logo?: string
  favicon?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily?: string
  customCss?: string
}

/**
 * Resource usage quotas for a tenant.
 * Tracks current usage against plan limits.
 */
export interface TenantQuota {
  members: { used: number; limit: number }
  storage: { used: number; limit: number } // in bytes
  apiCalls: { used: number; limit: number }
  databases: { used: number; limit: number }
}

// =============================================================================
// Domain & DNS Interfaces
// =============================================================================

/**
 * Custom domain configuration for a tenant.
 * Supports multiple domains with SSL and verification.
 */
export interface TenantDomain {
  id: string
  tenantId: string
  domain: string
  verified: boolean
  ssl: boolean
  primary: boolean
  dnsRecords: DNSRecord[]
  createdAt: string
  verifiedAt?: string
}

/**
 * DNS record required for domain verification.
 * Used to prove domain ownership and configure routing.
 */
export interface DNSRecord {
  type: 'CNAME' | 'TXT' | 'A'
  name: string
  value: string
  verified: boolean
}

// =============================================================================
// Email & Theme Interfaces
// =============================================================================

/**
 * Customizable email template for tenant communications.
 * Supports variable substitution and HTML/text content.
 */
export interface TenantEmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  variables: string[]
  updatedAt: string
}

/**
 * Visual theme preset for tenant branding.
 * Provides pre-configured color schemes.
 */
export interface TenantTheme {
  id: string
  name: string
  description: string
  preview: string
  colors: Record<string, string>
  isDefault: boolean
}

// =============================================================================
// Tenant Membership Interfaces
// =============================================================================

/**
 * Member within a tenant with role-based access.
 * Tracks invitation and join status.
 */
export interface TenantMember {
  id: string
  tenantId: string
  userId: string
  email: string
  name: string
  role: TenantRole
  status: 'active' | 'pending' | 'suspended'
  invitedAt: string
  joinedAt?: string
}

// =============================================================================
// Organization Types
// =============================================================================

/** Role within an organization */
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer'

/**
 * Organization entity within a tenant.
 * Allows logical grouping of teams and members.
 * Supports hierarchical structure with parent-child relationships.
 */
export interface Organization {
  id: string
  tenantId: string
  name: string
  slug: string
  description?: string
  parentId?: string // For hierarchical organizations
  createdAt: string
  updatedAt: string
  settings: OrgSettings
}

/**
 * Configuration settings for an organization.
 * Controls team creation and member onboarding.
 */
export interface OrgSettings {
  allowTeamCreation: boolean
  defaultRole: OrgRole
  requireApproval: boolean
}

/**
 * Member within an organization with role and team assignments.
 */
export interface OrgMember {
  id: string
  orgId: string
  userId: string
  email: string
  name: string
  role: OrgRole
  teams: string[]
  joinedAt: string
}

// =============================================================================
// Team & Permission Interfaces
// =============================================================================

/**
 * Team within an organization for grouping members.
 * Supports permission-based access control.
 */
export interface Team {
  id: string
  orgId: string
  name: string
  description?: string
  members: string[] // user IDs
  permissions: string[]
  createdAt: string
}

/**
 * Permission definition for role-based access control.
 */
export interface OrgPermission {
  id: string
  name: string
  description: string
  category: string
}

/**
 * Role definition with associated permissions.
 * System roles are immutable; custom roles can be created.
 */
export interface OrgRoleDefinition {
  id: string
  name: string
  description: string
  permissions: string[]
  isSystem: boolean
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response for tenant list operations.
 */
export interface TenantListResponse {
  success: boolean
  data?: {
    tenants: Tenant[]
    total: number
  }
  error?: string
}

/**
 * Response for single tenant detail operations.
 */
export interface TenantDetailResponse {
  success: boolean
  data?: Tenant
  error?: string
}

/**
 * Response for tenant statistics queries.
 */
export interface TenantStatsResponse {
  success: boolean
  data?: {
    members: number
    storage: number
    apiCalls: number
    domains: number
  }
  error?: string
}

/**
 * Response for organization list operations.
 */
export interface OrgListResponse {
  success: boolean
  data?: {
    organizations: Organization[]
    total: number
  }
  error?: string
}

// =============================================================================
// Form Input Types (Create/Update)
// =============================================================================

/**
 * Input for creating a new tenant.
 */
export interface CreateTenantInput {
  name: string
  slug?: string
  plan?: TenantPlan
  settings?: Partial<TenantSettings>
  branding?: Partial<TenantBranding>
}

/**
 * Input for updating an existing tenant.
 */
export interface UpdateTenantInput {
  name?: string
  status?: TenantStatus
  plan?: TenantPlan
  settings?: Partial<TenantSettings>
  branding?: Partial<TenantBranding>
}

/**
 * Input for creating a new organization.
 */
export interface CreateOrgInput {
  name: string
  slug?: string
  description?: string
  settings?: Partial<OrgSettings>
}

/**
 * Input for updating an existing organization.
 */
export interface UpdateOrgInput {
  name?: string
  description?: string
  settings?: Partial<OrgSettings>
}

/**
 * Input for inviting a member to tenant or organization.
 */
export interface InviteMemberInput {
  email: string
  role: TenantRole | OrgRole
  message?: string
}

/**
 * Input for creating a new team.
 */
export interface CreateTeamInput {
  name: string
  description?: string
  members?: string[]
  permissions?: string[]
}

/**
 * Input for updating an existing team.
 */
export interface UpdateTeamInput {
  name?: string
  description?: string
  members?: string[]
  permissions?: string[]
}

// =============================================================================
// Domain Management Types
// =============================================================================

/**
 * Input for adding a custom domain.
 */
export interface AddDomainInput {
  domain: string
  primary?: boolean
}

/**
 * Response for domain verification operations.
 */
export interface DomainVerificationResponse {
  success: boolean
  data?: {
    verified: boolean
    dnsRecords: DNSRecord[]
    errors?: string[]
  }
  error?: string
}

// =============================================================================
// Quota & Usage Types
// =============================================================================

/**
 * Detailed usage breakdown for billing and monitoring.
 */
export interface TenantUsage {
  tenantId: string
  period: {
    start: string
    end: string
  }
  members: {
    current: number
    added: number
    removed: number
  }
  storage: {
    current: number // bytes
    uploaded: number
    deleted: number
  }
  apiCalls: {
    total: number
    byEndpoint: Record<string, number>
  }
  bandwidth: {
    ingress: number
    egress: number
  }
}

/**
 * Quota enforcement action taken when limits exceeded.
 */
export interface QuotaViolation {
  id: string
  tenantId: string
  quotaType: 'members' | 'storage' | 'apiCalls' | 'databases'
  limit: number
  attempted: number
  action: 'blocked' | 'warning' | 'overage_charged'
  timestamp: string
}
