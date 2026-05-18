/**
 * SSL Certificate Automation for Custom Domains
 *
 * Automatically provisions SSL certificates for custom tenant domains
 * using Let's Encrypt via the nself CLI.
 */

import { addAuditLog, getTenantDomain, updateTenantDomain } from '../database'
import { executeNselfCommand } from '../nselfCLI'

export interface SSLProvisionResult {
  success: boolean
  domain: string
  ssl: boolean
  expiresAt?: string
  certificatePath?: string
  keyPath?: string
  error?: string
}

/**
 * Provision SSL certificate for a domain using Let's Encrypt
 */
export async function provisionSSLCertificate(
  tenantId: string,
  domain: string
): Promise<SSLProvisionResult> {
  try {
    // Verify domain exists and belongs to tenant
    const domainRecord = await getTenantDomain(domain, tenantId)
    if (!domainRecord) {
      return {
        success: false,
        domain,
        ssl: false,
        error: 'Domain not found or does not belong to tenant',
      }
    }

    // Verify domain is verified before provisioning SSL
    if (!domainRecord.verified) {
      return {
        success: false,
        domain,
        ssl: false,
        error: 'Domain must be verified before provisioning SSL',
      }
    }

    // Execute nself CLI command to provision SSL
    const result = await executeNselfCommand('ssl', [
      'provision',
      '--domain',
      domain,
      '--tenant',
      tenantId,
      '--provider',
      'letsencrypt',
      '--json',
    ])

    if (!result.success) {
      await addAuditLog('ssl_provision_failed', { tenantId, domain, error: result.stderr }, false)

      return {
        success: false,
        domain,
        ssl: false,
        error: result.stderr || result.error || 'Failed to provision SSL',
      }
    }

    // Parse response
    let sslData: any = {}
    try {
      sslData = JSON.parse(result.stdout || '{}')
    } catch {
      sslData = { ssl: true }
    }

    // Update domain record with SSL information
    await updateTenantDomain(domain, tenantId, {
      ssl: true,
      verifiedAt: domainRecord.verifiedAt || new Date().toISOString(),
    })

    await addAuditLog(
      'ssl_provision_success',
      { tenantId, domain, expiresAt: sslData.expiresAt },
      true
    )

    return {
      success: true,
      domain,
      ssl: true,
      expiresAt: sslData.expiresAt,
      certificatePath: sslData.certificatePath,
      keyPath: sslData.keyPath,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await addAuditLog('ssl_provision_error', { tenantId, domain, error: errorMessage }, false)

    return {
      success: false,
      domain,
      ssl: false,
      error: errorMessage,
    }
  }
}

/**
 * Automatically provision SSL for all verified domains without SSL
 */
export async function autoProvisionSSLForTenant(tenantId: string): Promise<SSLProvisionResult[]> {
  const { listTenantDomains } = await import('../database')
  const domains = await listTenantDomains(tenantId)

  // Filter domains that are verified but don't have SSL
  const domainsNeedingSSL = domains.filter((d) => d.verified && !d.ssl)

  const results: SSLProvisionResult[] = []

  for (const domain of domainsNeedingSSL) {
    const result = await provisionSSLCertificate(tenantId, domain.domain)
    results.push(result)
  }

  return results
}

/**
 * Renew SSL certificate for a domain
 */
export async function renewSSLCertificate(
  tenantId: string,
  domain: string
): Promise<SSLProvisionResult> {
  try {
    const domainRecord = await getTenantDomain(domain, tenantId)
    if (!domainRecord) {
      return {
        success: false,
        domain,
        ssl: false,
        error: 'Domain not found',
      }
    }

    // Execute nself CLI command to renew SSL
    const result = await executeNselfCommand('ssl', [
      'renew',
      '--domain',
      domain,
      '--tenant',
      tenantId,
      '--json',
    ])

    if (!result.success) {
      await addAuditLog('ssl_renew_failed', { tenantId, domain, error: result.stderr }, false)

      return {
        success: false,
        domain,
        ssl: false,
        error: result.stderr || 'Failed to renew SSL',
      }
    }

    let sslData: any = {}
    try {
      sslData = JSON.parse(result.stdout || '{}')
    } catch {
      sslData = { ssl: true }
    }

    await addAuditLog('ssl_renew_success', { tenantId, domain, expiresAt: sslData.expiresAt }, true)

    return {
      success: true,
      domain,
      ssl: true,
      expiresAt: sslData.expiresAt,
      certificatePath: sslData.certificatePath,
      keyPath: sslData.keyPath,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await addAuditLog('ssl_renew_error', { tenantId, domain, error: errorMessage }, false)

    return {
      success: false,
      domain,
      ssl: false,
      error: errorMessage,
    }
  }
}

/**
 * Check SSL certificate expiration and auto-renew if needed
 */
export async function checkAndRenewSSL(
  tenantId: string,
  domain: string
): Promise<SSLProvisionResult | null> {
  const domainRecord = await getTenantDomain(domain, tenantId)
  if (!domainRecord || !domainRecord.ssl) {
    return null
  }

  // Check if certificate is expiring soon (within 30 days)
  // This would require parsing certificate expiration from the SSL data
  // For now, we'll trigger renewal proactively

  const result = await renewSSLCertificate(tenantId, domain)
  return result
}

/**
 * Revoke SSL certificate for a domain
 */
export async function revokeSSLCertificate(
  tenantId: string,
  domain: string
): Promise<SSLProvisionResult> {
  try {
    const domainRecord = await getTenantDomain(domain, tenantId)
    if (!domainRecord) {
      return {
        success: false,
        domain,
        ssl: false,
        error: 'Domain not found',
      }
    }

    // Execute nself CLI command to revoke SSL
    const result = await executeNselfCommand('ssl', [
      'revoke',
      '--domain',
      domain,
      '--tenant',
      tenantId,
    ])

    if (!result.success) {
      await addAuditLog('ssl_revoke_failed', { tenantId, domain, error: result.stderr }, false)

      return {
        success: false,
        domain,
        ssl: false,
        error: result.stderr || 'Failed to revoke SSL',
      }
    }

    // Update domain record
    await updateTenantDomain(domain, tenantId, {
      ssl: false,
    })

    await addAuditLog('ssl_revoke_success', { tenantId, domain }, true)

    return {
      success: true,
      domain,
      ssl: false,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await addAuditLog('ssl_revoke_error', { tenantId, domain, error: errorMessage }, false)

    return {
      success: false,
      domain,
      ssl: false,
      error: errorMessage,
    }
  }
}

/**
 * Get SSL certificate status for a domain
 */
export async function getSSLStatus(
  tenantId: string,
  domain: string
): Promise<{
  hasSSL: boolean
  expiresAt?: string
  daysUntilExpiry?: number
  needsRenewal: boolean
}> {
  const domainRecord = await getTenantDomain(domain, tenantId)

  if (!domainRecord || !domainRecord.ssl) {
    return {
      hasSSL: false,
      needsRenewal: false,
    }
  }

  // Execute nself CLI to check SSL status
  const result = await executeNselfCommand('ssl', ['status', '--domain', domain, '--json'])

  if (!result.success) {
    return {
      hasSSL: true,
      needsRenewal: false,
    }
  }

  try {
    const status = JSON.parse(result.stdout || '{}')
    return {
      hasSSL: true,
      expiresAt: status.expiresAt,
      daysUntilExpiry: status.daysUntilExpiry,
      needsRenewal: status.daysUntilExpiry < 30,
    }
  } catch {
    return {
      hasSSL: true,
      needsRenewal: false,
    }
  }
}
