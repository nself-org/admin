import * as bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { loadEnvironmentVariables } from './env-loader'

// Configuration
const SALT_ROUNDS = 12 // Increased for better security
const TOKEN_EXPIRY_HOURS = 24
const MIN_PASSWORD_LENGTH = 12 // Strong password requirement
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

// List of common weak passwords to reject
const WEAK_PASSWORDS = [
  'admin123',
  'password',
  'changeme',
  'changeme123',
  'default',
  'admin',
  'test',
  'test123',
  'demo',
  'demo123',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'admin1234',
  'pass1234',
]

// Password validation
export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
  }

  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    errors.push('Password must contain uppercase, lowercase, number, and special character')
  }

  if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password')
  }

  // Check for sequential characters
  if (/123|234|345|456|567|678|789|890|abc|bcd|cde|def/i.test(password)) {
    errors.push('Password contains sequential characters')
  }

  // Check for repeated characters
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password contains too many repeated characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  // In development, allow weaker passwords with a warning
  if (process.env.NODE_ENV !== 'production') {
    if (password.length >= 4) {
      console.warn(
        '⚠️ Weak password accepted in development mode. Use a strong password in production!'
      )
      return bcrypt.hash(password, SALT_ROUNDS)
    }
  }

  // Validate password strength before hashing
  const validation = validatePassword(password)
  if (!validation.valid) {
    throw new Error(`Weak password: ${validation.errors.join(', ')}`)
  }

  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Token generation using Web Crypto API for edge runtime compatibility
export function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Session token with expiry
export function generateSessionToken(): { token: string; expiresAt: Date } {
  return {
    token: generateToken(),
    expiresAt: new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
  }
}

// Verify token expiry
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

// Generate secure random password
export function generateSecurePassword(length: number = 16): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
  let password = ''

  // Use crypto.randomInt to avoid modulo bias
  for (let i = 0; i < length; i++) {
    password += charset[crypto.randomInt(0, charset.length)]
  }

  // Ensure password meets complexity requirements
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[@$!%*?&]/.test(password)

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return generateSecurePassword(length) // Regenerate if requirements not met
  }

  return password
}

// Hash the admin password on first setup
export async function getAdminPasswordHash(): Promise<string> {
  const { adminPassword, adminPasswordHash, isDevEnv } = loadEnvironmentVariables()

  // Check if password is set
  if (!adminPassword && !adminPasswordHash) {
    // This shouldn't happen - password should be set via setup flow
    throw new Error('No admin password configured. Please set up your password.')
  }

  // If we have a hash, return it
  if (adminPasswordHash) {
    return adminPasswordHash
  }

  // If we have a plain password (dev mode), hash it
  if (adminPassword) {
    // In dev mode, we accept any password length >= 3
    if (isDevEnv && adminPassword.length >= 3) {
      return bcrypt.hash(adminPassword, SALT_ROUNDS)
    }

    // In prod mode, validate password strength
    if (!isDevEnv) {
      const validation = validatePassword(adminPassword)
      if (!validation.valid) {
        throw new Error(`Weak password: ${validation.errors.join(', ')}`)
      }
    }

    return bcrypt.hash(adminPassword, SALT_ROUNDS)
  }

  throw new Error('No admin password configured')
}

// Constant time comparison to prevent timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
