/**
 * Test Data Generator for Multi-Tenant Features
 *
 * Creates sample tenants, organizations, and members for testing
 * tenant isolation and hierarchy features.
 */

import type {
  Organization,
  OrgMember,
  Team,
  Tenant,
  TenantDomain,
  TenantMember,
} from '@/types/tenant'
import { randomBytes } from 'crypto'

/**
 * Generate a unique ID
 */
function generateId(prefix: string = ''): string {
  return `${prefix}${randomBytes(8).toString('hex')}`
}

/**
 * Generate a slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Create a sample tenant
 */
export function createSampleTenant(
  name: string,
  plan: 'free' | 'pro' | 'enterprise' = 'free'
): Tenant {
  const now = new Date().toISOString()
  const id = generateId('tenant_')
  const slug = generateSlug(name)

  return {
    id,
    name,
    slug,
    status: 'active',
    plan,
    createdAt: now,
    updatedAt: now,
    ownerId: generateId('user_'),
    settings: {
      allowPublicSignup: true,
      requireEmailVerification: true,
      maxMembers: plan === 'free' ? 5 : plan === 'pro' ? 50 : 1000,
      maxStorage: plan === 'free' ? 1073741824 : plan === 'pro' ? 10737418240 : 107374182400, // 1GB, 10GB, 100GB
      apiRateLimit: plan === 'free' ? 60 : plan === 'pro' ? 600 : 6000,
      features: [
        'basic_features',
        ...(plan !== 'free' ? ['advanced_analytics'] : []),
        ...(plan === 'enterprise' ? ['sso', 'audit_logs', 'custom_domains'] : []),
      ],
    },
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      accentColor: '#10B981',
    },
    quota: {
      members: {
        used: 0,
        limit: plan === 'free' ? 5 : plan === 'pro' ? 50 : 1000,
      },
      storage: {
        used: 0,
        limit: plan === 'free' ? 1073741824 : plan === 'pro' ? 10737418240 : 107374182400,
      },
      apiCalls: {
        used: 0,
        limit: plan === 'free' ? 10000 : plan === 'pro' ? 100000 : 1000000,
      },
      databases: {
        used: 0,
        limit: plan === 'free' ? 1 : plan === 'pro' ? 5 : 20,
      },
    },
  }
}

/**
 * Create a sample organization
 */
export function createSampleOrganization(
  tenantId: string,
  name: string,
  parentId?: string
): Organization {
  const now = new Date().toISOString()
  const id = generateId('org_')
  const slug = generateSlug(name)

  return {
    id,
    tenantId,
    name,
    slug,
    description: `${name} organization`,
    parentId,
    createdAt: now,
    updatedAt: now,
    settings: {
      allowTeamCreation: true,
      defaultRole: 'member',
      requireApproval: false,
    },
  }
}

/**
 * Create a sample tenant member
 */
export function createSampleTenantMember(
  tenantId: string,
  email: string,
  name: string,
  role: 'owner' | 'admin' | 'member' | 'viewer' = 'member'
): TenantMember {
  const now = new Date().toISOString()
  const id = generateId('tm_')
  const userId = generateId('user_')

  return {
    id,
    tenantId,
    userId,
    email,
    name,
    role,
    status: 'active',
    invitedAt: now,
    joinedAt: now,
  }
}

/**
 * Create a sample organization member
 */
export function createSampleOrgMember(
  orgId: string,
  email: string,
  name: string,
  role: 'owner' | 'admin' | 'member' | 'viewer' = 'member'
): OrgMember {
  const now = new Date().toISOString()
  const id = generateId('om_')
  const userId = generateId('user_')

  return {
    id,
    orgId,
    userId,
    email,
    name,
    role,
    teams: [],
    joinedAt: now,
  }
}

/**
 * Create a sample team
 */
export function createSampleTeam(orgId: string, name: string, memberIds: string[] = []): Team {
  const now = new Date().toISOString()
  const id = generateId('team_')

  return {
    id,
    orgId,
    name,
    description: `${name} team`,
    members: memberIds,
    permissions: ['view:dashboard', 'view:members', 'view:teams'],
    createdAt: now,
  }
}

/**
 * Create a sample tenant domain
 */
export function createSampleDomain(
  tenantId: string,
  domain: string,
  verified: boolean = false,
  ssl: boolean = false
): TenantDomain {
  const now = new Date().toISOString()
  const id = generateId('domain_')

  return {
    id,
    tenantId,
    domain,
    verified,
    ssl,
    primary: false,
    dnsRecords: [
      {
        type: 'CNAME',
        name: domain,
        value: 'nself-admin.example.com',
        verified,
      },
      {
        type: 'TXT',
        name: `_nself-verify.${domain}`,
        value: generateId('verify_'),
        verified,
      },
    ],
    createdAt: now,
    verifiedAt: verified ? now : undefined,
  }
}

/**
 * Generate a complete tenant hierarchy for testing
 */
export async function generateTestTenantHierarchy() {
  const {
    createTenant,
    createOrganization,
    createTenantMember,
    createOrgMember,
    createTeam,
    createTenantDomain,
  } = await import('../database')

  // Create two tenants
  const tenant1 = createSampleTenant('Acme Corporation', 'enterprise')
  const tenant2 = createSampleTenant('Startup Inc', 'pro')

  await createTenant(tenant1)
  await createTenant(tenant2)

  // Create organizations for Tenant 1 (hierarchical)
  const orgEngineering = createSampleOrganization(tenant1.id, 'Engineering')
  const orgBackend = createSampleOrganization(tenant1.id, 'Backend Team', orgEngineering.id)
  const orgFrontend = createSampleOrganization(tenant1.id, 'Frontend Team', orgEngineering.id)
  const orgSales = createSampleOrganization(tenant1.id, 'Sales')

  await createOrganization(orgEngineering)
  await createOrganization(orgBackend)
  await createOrganization(orgFrontend)
  await createOrganization(orgSales)

  // Create organizations for Tenant 2 (flat)
  const orgTech = createSampleOrganization(tenant2.id, 'Tech Team')
  const orgBiz = createSampleOrganization(tenant2.id, 'Business Team')

  await createOrganization(orgTech)
  await createOrganization(orgBiz)

  // Create tenant members for Tenant 1
  const tm1 = createSampleTenantMember(tenant1.id, 'alice@acme.com', 'Alice Admin', 'admin')
  const tm2 = createSampleTenantMember(tenant1.id, 'bob@acme.com', 'Bob Developer', 'member')
  const tm3 = createSampleTenantMember(tenant1.id, 'charlie@acme.com', 'Charlie Sales', 'member')

  await createTenantMember(tm1)
  await createTenantMember(tm2)
  await createTenantMember(tm3)

  // Create tenant members for Tenant 2
  const tm4 = createSampleTenantMember(tenant2.id, 'david@startup.com', 'David Founder', 'owner')
  const tm5 = createSampleTenantMember(tenant2.id, 'eve@startup.com', 'Eve Developer', 'member')

  await createTenantMember(tm4)
  await createTenantMember(tm5)

  // Create org members for Backend Team (Tenant 1)
  const om1 = createSampleOrgMember(orgBackend.id, 'bob@acme.com', 'Bob Developer', 'member')
  await createOrgMember(om1)

  // Create org members for Sales (Tenant 1)
  const om2 = createSampleOrgMember(orgSales.id, 'charlie@acme.com', 'Charlie Sales', 'admin')
  await createOrgMember(om2)

  // Create org members for Tech Team (Tenant 2)
  const om3 = createSampleOrgMember(orgTech.id, 'eve@startup.com', 'Eve Developer', 'member')
  await createOrgMember(om3)

  // Create teams
  const team1 = createSampleTeam(orgBackend.id, 'API Team', [om1.userId])
  await createTeam(team1)

  // Create domains
  const domain1 = createSampleDomain(tenant1.id, 'app.acme.com', true, true)
  const domain2 = createSampleDomain(tenant2.id, 'app.startup.io', true, false)

  await createTenantDomain(domain1)
  await createTenantDomain(domain2)

  return {
    tenants: [tenant1, tenant2],
    organizations: {
      tenant1: [orgEngineering, orgBackend, orgFrontend, orgSales],
      tenant2: [orgTech, orgBiz],
    },
    members: {
      tenant1: [tm1, tm2, tm3],
      tenant2: [tm4, tm5],
    },
  }
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  const { listTenants, deleteTenant, listOrganizations, deleteOrganization } =
    await import('../database')

  const tenants = await listTenants()
  const testTenants = tenants.filter((t) => t.id.startsWith('tenant_'))

  for (const tenant of testTenants) {
    // Delete all organizations
    const orgs = await listOrganizations(tenant.id)
    for (const org of orgs) {
      await deleteOrganization(org.id, tenant.id)
    }

    // Delete tenant
    await deleteTenant(tenant.id)
  }
}
