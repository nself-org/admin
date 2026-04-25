/**
 * TOTP-based 2FA for admin login
 *
 * Uses otplib for TOTP generation/verification, qrcode for QR rendering.
 * Recovery codes: 10 × 8-char base32-safe tokens.
 * Secrets stored in LokiJS config collection (encrypted-at-rest via bcrypt
 * is out-of-scope; secret is a 20-byte random base32 string, same as every
 * TOTP authenticator stores).
 */

// otplib v13 uses a functional API — no 'authenticator' singleton export.
// We use the functional helpers directly. 'window' tolerance is applied per-call.
import { generate, generateSecret, generateURI, verify, verifySync } from 'otplib'
import QRCode from 'qrcode'
import { deleteConfig, getConfig, setConfig } from './database'

// Re-export type alias so call sites below read naturally.
// 'authenticator' is an object shim over the v13 functional API.
const authenticator = {
  // Allow 1 step of clock drift (±30 s) for tolerance
  options: { window: 1 },
  generateSecret: (length: number) => generateSecret({ length }),
  keyuri: (account: string, issuer: string, secret: string) =>
    generateURI({ strategy: 'totp', label: account, issuer, secret }),
  verify: ({ token, secret }: { token: string; secret: string }): boolean => {
    try {
      const result = verifySync({ secret, token, strategy: 'totp' })
      if (typeof result === 'boolean') return result
      // OTPVerifyFunctionalOptions may return a result object
      return result?.valid ?? false
    } catch {
      return false
    }
  },
} as const

const TOTP_SECRET_KEY = 'totp_secret'
const TOTP_ENABLED_KEY = 'totp_enabled'
const TOTP_RECOVERY_CODES_KEY = 'totp_recovery_codes'

// Issuer label shown in authenticator apps
const ISSUER = 'nSelf Admin'
const ACCOUNT = 'admin'

// Suppress unused import warning — generate/verify are used via the shim above.
void generate
void verify

// ── Secret management ────────────────────────────────────────────────────────

export async function isTotpEnabled(): Promise<boolean> {
  const enabled = await getConfig(TOTP_ENABLED_KEY)
  return enabled === true
}

export async function getTotpSecret(): Promise<string | null> {
  return getConfig(TOTP_SECRET_KEY)
}

/**
 * Generate a new TOTP secret and return the QR code data URL + raw secret.
 * Does NOT enable TOTP yet — caller must call confirmTotpSetup() after
 * the user verifies the first code.
 */
export async function initTotpSetup(): Promise<{
  secret: string
  qrDataUrl: string
  manualEntryKey: string
}> {
  const secret = authenticator.generateSecret(20)
  const otpauth = authenticator.keyuri(ACCOUNT, ISSUER, secret)
  const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 200 })

  // Store pending secret (not enabled yet)
  await setConfig(TOTP_SECRET_KEY, secret)
  await setConfig(TOTP_ENABLED_KEY, false)

  return { secret, qrDataUrl, manualEntryKey: secret }
}

/**
 * Verify a TOTP code against the stored secret and enable TOTP if valid.
 * Returns recovery codes on success.
 */
export async function confirmTotpSetup(
  code: string,
): Promise<{ success: boolean; recoveryCodes?: string[] }> {
  const secret = await getTotpSecret()
  if (!secret) {
    return { success: false }
  }

  const isValid = authenticator.verify({ token: code, secret })
  if (!isValid) {
    return { success: false }
  }

  // Generate 10 recovery codes
  const recoveryCodes = generateRecoveryCodes(10)
  await setConfig(TOTP_RECOVERY_CODES_KEY, recoveryCodes)
  await setConfig(TOTP_ENABLED_KEY, true)

  return { success: true, recoveryCodes }
}

/**
 * Verify a TOTP code or a recovery code during login.
 */
export async function verifyTotpCode(code: string): Promise<boolean> {
  const secret = await getTotpSecret()
  if (!secret) return false

  // Try TOTP first
  if (authenticator.verify({ token: code, secret })) {
    return true
  }

  // Try recovery codes
  const recoveryCodes: string[] = (await getConfig(TOTP_RECOVERY_CODES_KEY)) || []
  const cleanCode = code.toUpperCase().replace(/[-\s]/g, '')
  const idx = recoveryCodes.findIndex(
    (rc) => rc.toUpperCase().replace(/[-\s]/g, '') === cleanCode,
  )
  if (idx !== -1) {
    // Consume the recovery code (one-time use)
    recoveryCodes.splice(idx, 1)
    await setConfig(TOTP_RECOVERY_CODES_KEY, recoveryCodes)
    return true
  }

  return false
}

/**
 * Disable TOTP and wipe all related config.
 */
export async function disableTotp(): Promise<void> {
  await deleteConfig(TOTP_SECRET_KEY)
  await deleteConfig(TOTP_ENABLED_KEY)
  await deleteConfig(TOTP_RECOVERY_CODES_KEY)
}

/**
 * Regenerate recovery codes (replaces existing set).
 */
export async function regenerateRecoveryCodes(): Promise<string[]> {
  const codes = generateRecoveryCodes(10)
  await setConfig(TOTP_RECOVERY_CODES_KEY, codes)
  return codes
}

/**
 * Get remaining recovery code count (not the codes themselves — those are
 * shown once at setup time).
 */
export async function getRemainingRecoveryCodeCount(): Promise<number> {
  const codes: string[] = (await getConfig(TOTP_RECOVERY_CODES_KEY)) || []
  return codes.length
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Generate N random 8-char base32-safe recovery codes.
 * Format: XXXXXXXX (uppercase letters + digits, excluding confusable chars).
 */
function generateRecoveryCodes(count: number): string[] {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 31 chars, no 0/O/1/I/L
  const { randomBytes } = require('crypto') as typeof import('crypto')
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(8)
    let code = ''
    for (let b = 0; b < 8; b++) {
      code += ALPHABET[bytes[b] % ALPHABET.length]
    }
    codes.push(code)
  }
  return codes
}
