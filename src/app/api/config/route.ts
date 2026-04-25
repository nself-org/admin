import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { sanitizePath } from '@/lib/validation'
import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'
import { z } from 'zod'

const execFileAsync = promisify(execFile)

// Schema for file operations
// Schema for file operations - validated before use
const _fileOperationSchema = z.object({
  action: z.enum([
    'list',
    'read',
    'write',
    'update',
    'validate',
    'backup',
    'restore',
    'create-env',
    'apply',
    'env-template',
  ]),
  file: z.string().optional(),
  content: z.string().optional(),
  options: z
    .object({
      backup: z.boolean().optional(),
      apply: z.boolean().optional(),
      restart: z.boolean().optional(),
      rebuild: z.boolean().optional(),
      environment: z.string().optional(),
      variables: z.record(z.string(), z.string()).optional(),
      backup_path: z.string().optional(),
    })
    .optional(),
})

// Allowed configuration files (following nself CLI conventions)
const ALLOWED_CONFIG_FILES = [
  '.env',
  '.env.example',
  '.env.dev',
  '.env.staging',
  '.env.prod',
  '.env.secrets',
  'docker-compose.yml',
  'docker-compose.override.yml',
  'docker-compose.prod.yml',
]

// Typed option interfaces replacing options: any
interface WriteConfigOptions {
  backup?: boolean
  apply?: boolean
  variables?: Record<string, string>
}

interface UpdateConfigOptions {
  variables?: Record<string, string>
  apply?: boolean
}

interface CreateEnvOptions {
  environment?: string
  variables?: Record<string, string>
}

interface ApplyConfigOptions {
  restart?: boolean
  rebuild?: boolean
}

interface RestoreConfigOptions {
  backup_path?: string
}

// Validate and sanitize file path
function validateFilePath(fileName: string): {
  valid: boolean
  sanitized: string
  error?: string
} {
  // Remove any path components, we only want filenames
  const baseName = path.basename(fileName)

  // Check if it's in the allowed list
  if (!ALLOWED_CONFIG_FILES.includes(baseName)) {
    return {
      valid: false,
      sanitized: baseName,
      error: `File '${baseName}' is not in the allowed list`,
    }
  }

  // Check for path traversal attempts
  if (fileName.includes('..') || fileName.includes('//')) {
    return {
      valid: false,
      sanitized: baseName,
      error: 'Path traversal detected',
    }
  }

  return { valid: true, sanitized: baseName }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const file = searchParams.get('file')

    switch (action) {
      case 'list':
        return await getConfigFiles()
      case 'read':
        if (!file) {
          return NextResponse.json(
            {
              success: false,
              error: 'File parameter is required for read action',
            },
            { status: 400 },
          )
        }
        return await readConfigFile(file)
      case 'validate':
        return await validateConfiguration()
      case 'backup':
        return await backupConfiguration()
      case 'env-template':
        return await getEnvTemplate()
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { action, file, content, options = {} } = await request.json()

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 },
      )
    }

    switch (action) {
      case 'write':
        if (!file || content === undefined) {
          return NextResponse.json(
            {
              success: false,
              error: 'File and content are required for write action',
            },
            { status: 400 },
          )
        }
        return await writeConfigFile(
          file,
          content,
          options as WriteConfigOptions,
        )
      case 'update':
        if (!file) {
          return NextResponse.json(
            { success: false, error: 'File is required for update action' },
            { status: 400 },
          )
        }
        return await updateConfigFile(file, options as UpdateConfigOptions)
      case 'create-env':
        return await createEnvironmentFile(options as CreateEnvOptions)
      case 'apply':
        return await applyConfiguration(options as ApplyConfigOptions)
      case 'restore':
        return await restoreConfiguration(options as RestoreConfigOptions)
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getConfigFiles() {
  const backendPath = getProjectPath()

  try {
    const configFiles = []

    // Environment files (following nself CLI conventions)
    const envFiles = [
      '.env',
      '.env.dev',
      '.env.staging',
      '.env.prod',
      '.env.secrets',
      '.env.example',
    ]
    for (const envFile of envFiles) {
      try {
        const filePath = path.join(backendPath, envFile)
        const stats = await fs.stat(filePath)
        const content = await fs.readFile(filePath, 'utf-8')

        configFiles.push({
          name: envFile,
          type: 'environment',
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          exists: true,
          lines: content.split('\n').length,
          variables: content
            .split('\n')
            .filter((line) => line.trim() && !line.trim().startsWith('#'))
            .length,
        })
      } catch {
        configFiles.push({
          name: envFile,
          type: 'environment',
          path: path.join(backendPath, envFile),
          exists: false,
          error: 'File not found',
        })
      }
    }

    // Docker Compose files
    const dockerFiles = [
      'docker-compose.yml',
      'docker-compose.override.yml',
      'docker-compose.prod.yml',
    ]
    for (const dockerFile of dockerFiles) {
      try {
        const filePath = path.join(backendPath, dockerFile)
        const stats = await fs.stat(filePath)
        const content = await fs.readFile(filePath, 'utf-8')

        configFiles.push({
          name: dockerFile,
          type: 'docker-compose',
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          exists: true,
          lines: content.split('\n').length,
          services: (content.match(/^\s{2}[a-zA-Z0-9_-]+:/gm) || []).length,
        })
      } catch {
        configFiles.push({
          name: dockerFile,
          type: 'docker-compose',
          path: path.join(backendPath, dockerFile),
          exists: false,
          error: 'File not found',
        })
      }
    }

    // Configuration directories
    const configDirs = ['nginx', 'hasura', 'grafana', '.nself']
    for (const dir of configDirs) {
      try {
        const dirPath = path.join(backendPath, dir)
        const stats = await fs.stat(dirPath)
        const files = await fs.readdir(dirPath, { withFileTypes: true })

        configFiles.push({
          name: dir,
          type: 'directory',
          path: dirPath,
          modified: stats.mtime,
          exists: true,
          fileCount: files.filter((f) => f.isFile()).length,
          subdirCount: files.filter((f) => f.isDirectory()).length,
        })
      } catch {
        // Directory doesn't exist, which is normal
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        files: configFiles,
        summary: {
          total: configFiles.filter((f) => f.exists).length,
          environments: configFiles.filter(
            (f) => f.type === 'environment' && f.exists,
          ).length,
          dockerFiles: configFiles.filter(
            (f) => f.type === 'docker-compose' && f.exists,
          ).length,
          directories: configFiles.filter(
            (f) => f.type === 'directory' && f.exists,
          ).length,
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get configuration files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function readConfigFile(fileName: string) {
  const backendPath = getProjectPath()

  // Validate file path
  const validation = validateFilePath(fileName)
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 403 },
    )
  }

  const safeFileName = validation.sanitized

  try {
    const filePath = path.join(backendPath, safeFileName)
    const content = await fs.readFile(filePath, 'utf-8')
    const stats = await fs.stat(filePath)

    // Parse environment variables if it's an env file
    let parsed = null
    if (safeFileName.startsWith('.env')) {
      const rawParsed = parseEnvContent(content)
      parsed = redactSensitive(rawParsed)
    }

    return NextResponse.json({
      success: true,
      data: {
        file: safeFileName,
        content,
        parsed,
        stats: {
          size: stats.size,
          modified: stats.mtime,
          lines: content.split('\n').length,
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to read file '${safeFileName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function writeConfigFile(
  fileName: string,
  content: string,
  options: WriteConfigOptions,
) {
  const backendPath = getProjectPath()

  // Validate file path
  const validation = validateFilePath(fileName)
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 403 },
    )
  }

  const safeFileName = validation.sanitized

  try {
    const filePath = path.join(backendPath, safeFileName)

    // Create backup if file exists and backup option is enabled
    if (options.backup !== false) {
      try {
        const existingContent = await fs.readFile(filePath, 'utf-8')
        const backupPath = `${filePath}.backup.${Date.now()}`
        await fs.writeFile(backupPath, existingContent)
      } catch {
        // File doesn't exist, no backup needed
      }
    }

    // Write new content
    await fs.writeFile(filePath, content, 'utf-8')
    const stats = await fs.stat(filePath)

    // Apply configuration if requested
    if (options.apply && safeFileName.startsWith('.env')) {
      try {
        await applyEnvironmentChanges()
      } catch (err) {
        console.error('Failed to apply environment changes:', err)
        return NextResponse.json({
          success: true,
          data: {
            file: safeFileName,
            size: stats.size,
            modified: stats.mtime,
            applied: false,
            timestamp: new Date().toISOString(),
          },
          warning: 'Changes saved but could not be applied automatically',
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        file: safeFileName,
        size: stats.size,
        modified: stats.mtime,
        applied: options.apply || false,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to write file '${safeFileName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function updateConfigFile(
  fileName: string,
  options: UpdateConfigOptions,
) {
  const backendPath = getProjectPath()

  // Validate file path
  const validation = validateFilePath(fileName)
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 403 },
    )
  }

  const safeFileName = validation.sanitized

  try {
    const filePath = path.join(backendPath, safeFileName)
    let content = await fs.readFile(filePath, 'utf-8')

    if (safeFileName.startsWith('.env')) {
      // Update environment variables
      if (options.variables) {
        for (const [key, value] of Object.entries(options.variables)) {
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`^${escapedKey}=.*$`, 'm')
          if (regex.test(content)) {
            content = content.replace(regex, `${key}=${value}`)
          } else {
            content += `\n${key}=${value}`
          }
        }
      }
    }

    // Write updated content
    await fs.writeFile(filePath, content, 'utf-8')
    const stats = await fs.stat(filePath)

    return NextResponse.json({
      success: true,
      data: {
        file: safeFileName,
        updated: Object.keys(options.variables || {}).length,
        size: stats.size,
        modified: stats.mtime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to update file '${safeFileName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function validateConfiguration() {
  const backendPath = getProjectPath()

  try {
    // Validate using nself doctor — use execFile with cwd to avoid shell injection
    const { stdout: nselfValidation, stderr } = await execFileAsync(
      'nself',
      ['doctor'],
      {
        timeout: 30000,
        cwd: backendPath,
        env: { ...process.env, PATH: getEnhancedPath() },
      },
    )

    // Validate Docker Compose
    const { stdout: dockerValidation } = await execFileAsync(
      'docker-compose',
      ['config', '--quiet'],
      {
        timeout: 30000,
        cwd: backendPath,
        env: { ...process.env, PATH: getEnhancedPath() },
      },
    ).catch((error) => ({
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown error',
    }))

    // Check for required environment variables - nself prefers .env, falls back to .env.dev
    const envPath = path.join(backendPath, '.env')
    const envDevPath = path.join(backendPath, '.env.dev')
    let envValidation = 'Environment file not found'
    let envContent = null

    // Try .env first, then .env.dev (nself's priority)
    try {
      envContent = await fs.readFile(envPath, 'utf-8')
    } catch {
      try {
        envContent = await fs.readFile(envDevPath, 'utf-8')
      } catch {
        // Neither file exists
      }
    }

    if (envContent) {
      const parsed = parseEnvContent(envContent)

      const requiredVars = ['PROJECT_NAME', 'BASE_DOMAIN', 'POSTGRES_PASSWORD']
      const missing = requiredVars.filter((varName) => !parsed[varName])

      envValidation =
        missing.length === 0
          ? 'All required variables present'
          : `Missing required variables: ${missing.join(', ')}`
    }

    return NextResponse.json({
      success: true,
      data: {
        nself: {
          status: stderr ? 'failed' : 'passed',
          output: nselfValidation.trim(),
          error: stderr,
        },
        docker: {
          status: dockerValidation ? 'passed' : 'failed',
          output: dockerValidation || 'Docker Compose validation failed',
        },
        environment: {
          status: envValidation.includes('Missing') ? 'failed' : 'passed',
          output: envValidation,
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function applyConfiguration(options: ApplyConfigOptions) {
  const backendPath = getProjectPath()

  try {
    const results = []

    // Restart services if requested
    if (options.restart) {
      const { stdout, stderr } = await execFileAsync(
        'docker-compose',
        ['restart'],
        {
          timeout: 60000,
          cwd: backendPath,
          env: { ...process.env, PATH: getEnhancedPath() },
        },
      )
      results.push({ action: 'restart', stdout, stderr })
    }

    // Rebuild services if requested
    if (options.rebuild) {
      const { stdout, stderr } = await execFileAsync(
        'docker-compose',
        ['build'],
        {
          timeout: 300000,
          cwd: backendPath,
          env: { ...process.env, PATH: getEnhancedPath() },
        },
      )
      results.push({ action: 'rebuild', stdout, stderr })
    }

    // Apply nself configuration
    const { stdout: nselfOutput, stderr: nselfError } = await execFileAsync(
      'nself',
      ['apply'],
      {
        timeout: 30000,
        cwd: backendPath,
        env: { ...process.env, PATH: getEnhancedPath() },
      },
    ).catch((error) => ({
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown error',
    }))

    results.push({
      action: 'nself-apply',
      stdout: nselfOutput,
      stderr: nselfError,
    })

    return NextResponse.json({
      success: true,
      data: {
        results,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to apply configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function createEnvironmentFile(options: CreateEnvOptions) {
  const backendPath = getProjectPath()
  const requestedFile = options.environment || '.env.dev'

  // Validate file path
  const validation = validateFilePath(requestedFile)
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 403 },
    )
  }

  const fileName = validation.sanitized

  try {
    // Get template from .env.example
    const templatePath = path.join(backendPath, '.env.example')
    let template = ''

    try {
      template = await fs.readFile(templatePath, 'utf-8')
    } catch {
      // Create basic template if .env.example doesn't exist
      template = `# nself Configuration
PROJECT_NAME=my-project
BASE_DOMAIN=localhost
ENV=dev

# Database
POSTGRES_PASSWORD=changeme

# Authentication
JWT_SECRET=changeme
HASURA_GRAPHQL_ADMIN_SECRET=changeme

# Email
EMAIL_FROM=admin@localhost
`
    }

    // Apply custom values if provided
    if (options.variables) {
      for (const [key, value] of Object.entries(options.variables)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`^${escapedKey}=.*$`, 'm')
        if (regex.test(template)) {
          template = template.replace(regex, `${key}=${value}`)
        } else {
          template += `\n${key}=${value}`
        }
      }
    }

    const filePath = path.join(backendPath, fileName)
    await fs.writeFile(filePath, template, 'utf-8')
    const stats = await fs.stat(filePath)

    return NextResponse.json({
      success: true,
      data: {
        file: fileName,
        size: stats.size,
        variables: template
          .split('\n')
          .filter((line) => line.trim() && !line.trim().startsWith('#')).length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create environment file '${fileName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function backupConfiguration() {
  const backendPath = getProjectPath()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(backendPath, 'config-backups', timestamp)

  try {
    // Create backup directory
    await fs.mkdir(backupDir, { recursive: true })

    const configFiles = [
      '.env',
      '.env.dev',
      '.env.staging',
      '.env.prod',
      '.env.secrets',
      'docker-compose.yml',
      'docker-compose.override.yml',
    ]

    const backedUp = []
    for (const file of configFiles) {
      try {
        const sourcePath = path.join(backendPath, file)
        const destPath = path.join(backupDir, file)

        await fs.copyFile(sourcePath, destPath)
        backedUp.push(file)
      } catch {
        // File doesn't exist, skip
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        backup_path: backupDir,
        files: backedUp,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to backup configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getEnvTemplate() {
  const backendPath = getProjectPath()

  try {
    const templatePath = path.join(backendPath, '.env.example')
    const content = await fs.readFile(templatePath, 'utf-8')
    const parsed = parseEnvContent(content)

    return NextResponse.json({
      success: true,
      data: {
        template: content,
        variables: parsed,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get environment template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function restoreConfiguration(options: RestoreConfigOptions) {
  if (!options.backup_path) {
    return NextResponse.json(
      {
        success: false,
        error: 'Backup path is required',
      },
      { status: 400 },
    )
  }

  // Validate backup path - must be under config-backups
  const backupPath = sanitizePath(options.backup_path)
  if (!backupPath.startsWith(path.join(getProjectPath(), 'config-backups'))) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid backup path',
      },
      { status: 403 },
    )
  }

  const backendPath = getProjectPath()

  try {
    const restored = []
    const files = await fs.readdir(backupPath)

    for (const file of files) {
      // Validate each file before restoring
      const validation = validateFilePath(file)
      if (validation.valid) {
        const sourcePath = path.join(backupPath, validation.sanitized)
        const destPath = path.join(backendPath, validation.sanitized)

        await fs.copyFile(sourcePath, destPath)
        restored.push(validation.sanitized)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        restored,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to restore configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function applyEnvironmentChanges() {
  const backendPath = getProjectPath()

  // Restart containers to pick up new environment variables
  const { stdout, stderr } = await execFileAsync(
    'docker-compose',
    ['restart'],
    {
      timeout: 60000,
      cwd: backendPath,
      env: { ...process.env, PATH: getEnhancedPath() },
    },
  )

  return { success: true, stdout, stderr }
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /key/i,
  /token/i,
  /credential/i,
  /private/i,
]

function redactSensitive(env: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(env)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) =>
      pattern.test(k),
    )
    result[k] = isSensitive ? '***REDACTED***' : v
  }
  return result
}

function parseEnvContent(content: string): Record<string, string> {
  const parsed: Record<string, string> = {}

  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=')
      parsed[key] = valueParts.join('=')
    }
  })

  return parsed
}
