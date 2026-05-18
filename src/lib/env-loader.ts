import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

export function isDevelopment(hostname?: string): boolean {
  const host = hostname || process.env.HOSTNAME || 'localhost'

  // Development patterns
  const devPatterns = [
    /^localhost(:\d+)?$/,
    /^127\.0\.0\.1(:\d+)?$/,
    /^0\.0\.0\.0(:\d+)?$/,
    /\.localhost$/,
    /\.local$/,
    /\.local\.nself\.org$/,
    /^admin\.localhost$/,
  ]

  return devPatterns.some((pattern) => pattern.test(host))
}

export function loadEnvironmentVariables() {
  const rootDir = process.cwd()
  const isDevEnv = isDevelopment()

  // Define environment files in reverse priority order (last one wins)
  const envFiles = [isDevEnv ? '.env.dev' : '.env.prod', '.env.local', '.env'].filter(Boolean)

  // Store all env vars from files
  const envVars: Record<string, string> = {}

  // Load each file in order (earlier files get overridden by later ones)
  for (const file of envFiles) {
    const filePath = path.join(rootDir, file)
    if (fs.existsSync(filePath)) {
      const result = dotenv.config({ path: filePath })
      if (result.parsed) {
        Object.assign(envVars, result.parsed)
      }
    }
  }

  // Apply the final set of environment variables
  Object.assign(process.env, envVars)

  return {
    isDevEnv,
    loadedFiles: envFiles.filter((file) => fs.existsSync(path.join(rootDir, file))).reverse(), // Show in priority order
    adminPassword: process.env.ADMIN_PASSWORD,
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
  }
}

export function hasAdminPassword(): boolean {
  const { adminPassword, adminPasswordHash } = loadEnvironmentVariables()
  return !!(adminPassword || adminPasswordHash)
}

export async function setAdminPassword(password: string, _hostname?: string): Promise<void> {
  const rootDir = process.cwd()
  const envFile = path.join(rootDir, '.env')

  // Read existing .env file or create new content
  let envContent = ''
  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf-8')
  }

  // Remove existing password entries
  const lines = envContent
    .split('\n')
    .filter(
      (line) => !line.startsWith('ADMIN_PASSWORD=') && !line.startsWith('ADMIN_PASSWORD_HASH=')
    )

  // ALWAYS store hashed password (even in development)
  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.hash(password, 12)
  lines.push(`ADMIN_PASSWORD_HASH=${hash}`)

  // Write back to file
  fs.writeFileSync(envFile, lines.join('\n'))
}

export async function verifyAdminPassword(password: string, _hostname?: string): Promise<boolean> {
  const { adminPassword, adminPasswordHash } = loadEnvironmentVariables()
  const bcrypt = await import('bcryptjs')

  // If there's a hash, use it
  if (adminPasswordHash) {
    return bcrypt.compare(password, adminPasswordHash)
  }

  // If there's a plain password (legacy), hash and compare
  // This provides backwards compatibility while still being secure
  if (adminPassword) {
    const tempHash = await bcrypt.hash(adminPassword, 12)
    return bcrypt.compare(password, tempHash)
  }

  return false
}
