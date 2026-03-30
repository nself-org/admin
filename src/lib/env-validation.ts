/**
 * Environment variable validation
 */

import { z } from 'zod'
import { getProjectPath } from './paths'

// Custom password validator
const passwordValidator = z.string().refine(
  (password) => {
    // In production, enforce strong password requirements
    if (process.env.NODE_ENV === 'production') {
      if (password.length < 12) return false
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password))
        return false

      const weakPasswords = [
        'admin123',
        'changeme',
        'changeme123',
        'password',
        'default',
      ]
      if (weakPasswords.includes(password.toLowerCase())) return false
    }
    return password.length >= 8 // Minimum for development
  },
  {
    message:
      process.env.NODE_ENV === 'production'
        ? 'Password must be at least 12 characters with uppercase, lowercase, number, and special character'
        : 'Password must be at least 8 characters',
  },
)

const envSchema = z.object({
  // Required environment variables
  ADMIN_PASSWORD: passwordValidator.optional(), // Made optional, will generate if not provided

  // Optional with defaults
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().regex(/^\d+$/, 'Port must be a number').default('3021'),
  PROJECT_PATH: z.string().default('/project'),
  AUTO_UPDATE: z.enum(['true', 'false']).default('true'),
  UPDATE_CHECK_INTERVAL: z.string().regex(/^\d+$/).default('6'),
  TZ: z.string().default('UTC'),

  // Optional
  ADMIN_PASSWORD_IS_HASHED: z.enum(['true', 'false']).optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  BASE_DOMAIN: z.string().optional(),
  ADMIN_VERSION: z.string().optional(),
})

export type EnvConfig = z.infer<typeof envSchema>

/**
 * Validate environment variables
 */
export function validateEnv(): EnvConfig {
  try {
    // Check for weak passwords before validation
    if (process.env.ADMIN_PASSWORD) {
      const weakPasswords = [
        'admin123',
        'changeme',
        'changeme123',
        'password123',
        'test123',
        'demo123',
      ]
      if (weakPasswords.includes(process.env.ADMIN_PASSWORD)) {
        console.warn('\n⚠️  WARNING: Weak admin password detected!')
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ CRITICAL: Cannot use weak passwords in production!')
          console.error(
            '   Please set a strong ADMIN_PASSWORD in your environment',
          )
          console.error('   Password requirements:')
          console.error('   - At least 12 characters')
          console.error('   - Include uppercase and lowercase letters')
          console.error('   - Include numbers and special characters')
          console.error('   - Avoid common passwords\n')
          process.exit(1)
        }
        console.warn(
          '   Change the ADMIN_PASSWORD before deploying to production\n',
        )
      }
    }

    const env = envSchema.parse(process.env)
    return env as EnvConfig
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e) => e.path.join('.')).join(', ')
      console.error(`\n❌ Environment validation failed: ${missingVars}`)

      // In production, exit the process
      if (process.env.NODE_ENV === 'production') {
        process.exit(1)
      }
    }
    throw error
  }
}

/**
 * Check runtime environment
 */
export function checkRuntimeEnvironment() {
  const checks = {
    dockerSocket: false,
    projectDir: false,
    writePermissions: false,
    nselfCli: false,
  }

  // Check Docker socket
  try {
    const fs = require('fs')
    fs.accessSync('/var/run/docker.sock', fs.constants.R_OK)
    checks.dockerSocket = true
  } catch {
    console.warn('⚠️ Docker socket not accessible')
  }

  // Check project directory
  try {
    const fs = require('fs')
    const projectPath = getProjectPath()
    fs.accessSync(projectPath, fs.constants.R_OK | fs.constants.W_OK)
    checks.projectDir = true
  } catch {
    console.warn('⚠️ Project directory not accessible')
  }

  // Check write permissions for data directory
  try {
    const fs = require('fs')
    fs.accessSync('/data', fs.constants.W_OK)
    checks.writePermissions = true
  } catch {
    console.warn('⚠️ Data directory not writable')
  }

  // Check nself CLI availability
  try {
    const { execSync } = require('child_process')
    execSync('which nself', { stdio: 'ignore' })
    checks.nselfCli = true
  } catch {
    console.warn('⚠️ nself CLI not found in PATH')
  }

  return checks
}

/**
 * Initialize environment validation
 */
export function initializeEnvironment() {
  const config = validateEnv()
  const runtime = checkRuntimeEnvironment()

  return { config, runtime }
}
