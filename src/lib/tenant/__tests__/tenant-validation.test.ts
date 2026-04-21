/**
 * tenant-validation.test.ts — Unit tests for Zod tenant validation schemas
 * S88b.T03 — admin coverage push to ≥70% branch
 *
 * Tests the pure Zod validation schemas:
 * tenantNameSchema, tenantSlugSchema, domainSchema, hexColorSchema,
 * createTenantSchema, updateTenantSchema.
 */

import {
  createTenantSchema,
  domainSchema,
  hexColorSchema,
  tenantNameSchema,
  tenantSlugSchema,
  updateTenantSchema,
} from '../tenant-validation'

describe('tenantNameSchema', () => {
  it('accepts valid names', () => {
    const validNames = [
      'My Company',
      'Acme Corp',
      'test-name',
      'test_name',
      'Name123',
      'ab', // min 2
    ]
    for (const name of validNames) {
      const result = tenantNameSchema.safeParse(name)
      expect(result.success).toBe(true)
    }
  })

  it('rejects names shorter than 2 characters', () => {
    const result = tenantNameSchema.safeParse('a')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 2 characters')
    }
  })

  it('rejects names longer than 100 characters', () => {
    const longName = 'a'.repeat(101)
    const result = tenantNameSchema.safeParse(longName)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        'less than 100 characters',
      )
    }
  })

  it('rejects names with special characters', () => {
    const invalidNames = ['name!', 'name@domain', 'name#hash', 'na<me>']
    for (const name of invalidNames) {
      const result = tenantNameSchema.safeParse(name)
      expect(result.success).toBe(false)
    }
  })

  it('accepts exactly 100 characters', () => {
    const maxName = 'a'.repeat(100)
    const result = tenantNameSchema.safeParse(maxName)
    expect(result.success).toBe(true)
  })

  it('accepts exactly 2 characters', () => {
    const result = tenantNameSchema.safeParse('ab')
    expect(result.success).toBe(true)
  })
})

describe('tenantSlugSchema', () => {
  it('accepts valid slugs', () => {
    const validSlugs = ['my-company', 'acme', 'test-123', 'ab']
    for (const slug of validSlugs) {
      const result = tenantSlugSchema.safeParse(slug)
      expect(result.success).toBe(true)
    }
  })

  it('rejects slugs with uppercase letters', () => {
    const result = tenantSlugSchema.safeParse('MyCompany')
    expect(result.success).toBe(false)
  })

  it('rejects slugs with underscores', () => {
    const result = tenantSlugSchema.safeParse('my_company')
    expect(result.success).toBe(false)
  })

  it('rejects slugs with spaces', () => {
    const result = tenantSlugSchema.safeParse('my company')
    expect(result.success).toBe(false)
  })

  it('rejects slugs shorter than 2 characters', () => {
    const result = tenantSlugSchema.safeParse('a')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 2 characters')
    }
  })

  it('rejects slugs longer than 50 characters', () => {
    const longSlug = 'a'.repeat(51)
    const result = tenantSlugSchema.safeParse(longSlug)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        'less than 50 characters',
      )
    }
  })
})

describe('domainSchema', () => {
  it('accepts valid domains', () => {
    const validDomains = [
      'example.com',
      'sub.example.com',
      'my-site.org',
      'test.nself.org',
    ]
    for (const domain of validDomains) {
      const result = domainSchema.safeParse(domain)
      expect(result.success).toBe(true)
    }
  })

  it('rejects domains without a dot', () => {
    const result = domainSchema.safeParse('nodot')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Invalid domain format')
    }
  })

  it('rejects empty string', () => {
    const result = domainSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('rejects domains with consecutive dots', () => {
    const result = domainSchema.safeParse('bad..domain.com')
    expect(result.success).toBe(false)
  })

  it('rejects very short domains (fewer than 4 chars)', () => {
    const result = domainSchema.safeParse('a.b')
    // "a.b" is 3 chars — below min of 4
    expect(result.success).toBe(false)
  })

  it('accepts domains with exactly 4 characters', () => {
    const result = domainSchema.safeParse('a.io')
    expect(result.success).toBe(true)
  })
})

describe('hexColorSchema', () => {
  it('accepts valid hex colors', () => {
    const valid = ['#FF5733', '#000000', '#FFFFFF', '#1a2b3c', '#aabbcc']
    for (const color of valid) {
      const result = hexColorSchema.safeParse(color)
      expect(result.success).toBe(true)
    }
  })

  it('rejects colors without # prefix', () => {
    const result = hexColorSchema.safeParse('FF5733')
    expect(result.success).toBe(false)
  })

  it('rejects short hex colors (3 digits)', () => {
    const result = hexColorSchema.safeParse('#F57')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('valid hex color')
    }
  })

  it('rejects colors with invalid characters', () => {
    const result = hexColorSchema.safeParse('#GGHHII')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = hexColorSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('rejects 8-digit hex (RGBA format)', () => {
    const result = hexColorSchema.safeParse('#FF5733AA')
    expect(result.success).toBe(false)
  })
})

describe('createTenantSchema', () => {
  it('accepts a valid minimal tenant', () => {
    const result = createTenantSchema.safeParse({ name: 'My Company' })
    expect(result.success).toBe(true)
  })

  it('accepts a fully specified tenant', () => {
    const result = createTenantSchema.safeParse({
      name: 'My Company',
      slug: 'my-company',
      plan: 'pro',
      settings: {
        allowPublicSignup: false,
        requireEmailVerification: true,
        maxMembers: 50,
      },
      branding: {
        primaryColor: '#6366F1',
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid name', () => {
    const result = createTenantSchema.safeParse({ name: 'a' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid plan value', () => {
    const result = createTenantSchema.safeParse({
      name: 'My Company',
      plan: 'super-ultra-plus',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid plan values', () => {
    const plans = ['free', 'pro', 'enterprise'] as const
    for (const plan of plans) {
      const result = createTenantSchema.safeParse({ name: 'Test', plan })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid hex color in branding', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      branding: { primaryColor: 'not-a-color' },
    })
    expect(result.success).toBe(false)
  })

  it('name is required', () => {
    const result = createTenantSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('settings maxMembers must be positive', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      settings: { maxMembers: -1 },
    })
    expect(result.success).toBe(false)
  })

  it('settings maxMembers of 0 is invalid', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      settings: { maxMembers: 0 },
    })
    expect(result.success).toBe(false)
  })
})

describe('updateTenantSchema', () => {
  it('accepts empty update (all fields optional)', () => {
    const result = updateTenantSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial name update', () => {
    const result = updateTenantSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts branding update', () => {
    const result = updateTenantSchema.safeParse({
      branding: { primaryColor: '#0ea5e9' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid name in update', () => {
    const result = updateTenantSchema.safeParse({ name: 'x' })
    expect(result.success).toBe(false)
  })

  it('accepts settings with apiRateLimit', () => {
    const result = updateTenantSchema.safeParse({
      settings: { apiRateLimit: 1000 },
    })
    expect(result.success).toBe(true)
  })

  it('rejects settings with non-positive apiRateLimit', () => {
    const result = updateTenantSchema.safeParse({
      settings: { apiRateLimit: 0 },
    })
    expect(result.success).toBe(false)
  })
})
