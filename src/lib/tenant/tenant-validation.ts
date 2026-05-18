/**
 * Tenant validation utilities using Zod
 */

import { z } from 'zod'

export const tenantNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(
    /^[a-zA-Z0-9\s\-_]+$/,
    'Name can only contain letters, numbers, spaces, hyphens, and underscores'
  )

export const tenantSlugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')

export const domainSchema = z
  .string()
  .min(4, 'Domain must be at least 4 characters')
  .max(253, 'Domain must be less than 253 characters')
  .refine((val) => {
    // Simple domain validation without complex regex
    const parts = val.split('.')
    if (parts.length < 2) return false
    return parts.every(
      (part) => /^[a-zA-Z0-9-]+$/.test(part) && part.length > 0 && part.length <= 63
    )
  }, 'Invalid domain format')

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5733)')

export const createTenantSchema = z.object({
  name: tenantNameSchema,
  slug: tenantSlugSchema.optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  settings: z
    .object({
      allowPublicSignup: z.boolean().optional(),
      requireEmailVerification: z.boolean().optional(),
      maxMembers: z.number().positive().optional(),
      maxStorage: z.number().positive().optional(),
      apiRateLimit: z.number().positive().optional(),
      features: z.array(z.string()).optional(),
    })
    .optional(),
  branding: z
    .object({
      logo: z.string().url().optional(),
      primaryColor: hexColorSchema.optional(),
      secondaryColor: hexColorSchema.optional(),
      accentColor: hexColorSchema.optional(),
    })
    .optional(),
})

export const updateTenantSchema = z.object({
  name: tenantNameSchema.optional(),
  settings: z
    .object({
      allowPublicSignup: z.boolean().optional(),
      requireEmailVerification: z.boolean().optional(),
      maxMembers: z.number().positive().optional(),
      maxStorage: z.number().positive().optional(),
      apiRateLimit: z.number().positive().optional(),
      features: z.array(z.string()).optional(),
    })
    .optional(),
  branding: z
    .object({
      logo: z.string().url().optional(),
      primaryColor: hexColorSchema.optional(),
      secondaryColor: hexColorSchema.optional(),
      accentColor: hexColorSchema.optional(),
    })
    .optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  message: z.string().max(500).optional(),
})

export function validateTenantCreate(data: unknown) {
  return createTenantSchema.safeParse(data)
}

export function validateTenantUpdate(data: unknown) {
  return updateTenantSchema.safeParse(data)
}

export function validateDomain(domain: string) {
  return domainSchema.safeParse(domain)
}

export function validateInvite(data: unknown) {
  return inviteMemberSchema.safeParse(data)
}
