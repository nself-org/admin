import { getProjectPath } from '@/lib/paths'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

interface SetupData {
  adminPassword?: string
  projectName?: string
  baseDomain?: string
  enabledServices?: string[]
  databaseConfig?: {
    version: string
    extensions: string[]
    customPassword: boolean
    password?: string
  }
  authConfig?: {
    providers: string[]
    jwtSecret?: string
  }
  storageConfig?: {
    accessKey?: string
    secretKey?: string
    bucket: string
  }
  optionalServices?: {
    redis: boolean
    functions: boolean
    dashboard: boolean
    nestjs: boolean
    golang: boolean
    python: boolean
  }
}

function generateSecureSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

async function generateEnvContent(data: SetupData): Promise<string> {
  const env = []

  // Core project settings
  env.push('# Core Project Settings')
  env.push('ENV=dev')
  env.push(`PROJECT_NAME=${data.projectName || 'myproject'}`)
  env.push(`BASE_DOMAIN=${data.baseDomain || 'local.nself.org'}`)
  env.push('DB_ENV_SEEDS=true')
  env.push('ALWAYS_AUTOFIX=true')
  env.push('')

  // PostgreSQL Database
  env.push('# PostgreSQL Database')
  env.push(`POSTGRES_VERSION=${data.databaseConfig?.version || '16-alpine'}`)
  env.push('POSTGRES_HOST=postgres')
  env.push('POSTGRES_PORT=5432')
  env.push('POSTGRES_DB=nself')
  env.push('POSTGRES_USER=postgres')
  env.push(
    `POSTGRES_PASSWORD=${data.databaseConfig?.customPassword && data.databaseConfig?.password ? data.databaseConfig.password : 'nself-dev-password'}`,
  )
  env.push('POSTGRES_EXTENSIONS=uuid-ossp')
  env.push('')

  // Hasura GraphQL Engine
  env.push('# Hasura GraphQL Engine')
  env.push('HASURA_VERSION=v2.44.0')
  env.push(`HASURA_GRAPHQL_ADMIN_SECRET=${generateSecureSecret()}`)
  env.push(
    `HASURA_JWT_KEY=${data.authConfig?.jwtSecret || generateSecureSecret(64)}`,
  )
  env.push('HASURA_JWT_TYPE=HS256')
  env.push('HASURA_GRAPHQL_ENABLE_CONSOLE=true')
  env.push(`HASURA_ROUTE=api.${data.baseDomain || 'local.nself.org'}`)
  env.push('')

  // Hasura Auth Service
  env.push('# Hasura Auth Service')
  env.push('AUTH_VERSION=0.36.0')
  env.push('AUTH_HOST=auth')
  env.push('AUTH_PORT=4000')
  env.push('AUTH_CLIENT_URL=http://localhost:3000')
  env.push(`AUTH_ROUTE=auth.${data.baseDomain || 'local.nself.org'}`)
  env.push('')

  // File Storage (MinIO/S3)
  env.push('# File Storage (MinIO/S3)')
  env.push('STORAGE_VERSION=0.6.1')
  env.push(`STORAGE_ROUTE=storage.${data.baseDomain || 'local.nself.org'}`)
  env.push('MINIO_VERSION=latest')
  env.push(
    `S3_ACCESS_KEY=${data.storageConfig?.accessKey || generateSecureSecret(16)}`,
  )
  env.push(
    `S3_SECRET_KEY=${data.storageConfig?.secretKey || generateSecureSecret(32)}`,
  )
  env.push(`S3_BUCKET=${data.storageConfig?.bucket || 'nself'}`)
  env.push('')

  // SSL/TLS Configuration
  env.push('# SSL/TLS Configuration')
  env.push('SSL_MODE=local')
  env.push('')

  // Optional Services
  env.push('# Optional Services')
  env.push(
    `FUNCTIONS_ENABLED=${data.optionalServices?.functions ? 'true' : 'false'}`,
  )
  env.push(
    `DASHBOARD_ENABLED=${data.optionalServices?.dashboard ? 'true' : 'false'}`,
  )
  env.push(`REDIS_ENABLED=${data.optionalServices?.redis ? 'true' : 'false'}`)
  env.push('')

  // Microservices Configuration
  env.push('# Microservices Configuration')
  env.push(
    `SERVICES_ENABLED=${data.optionalServices?.nestjs || data.optionalServices?.golang || data.optionalServices?.python ? 'true' : 'false'}`,
  )
  env.push(`NESTJS_ENABLED=${data.optionalServices?.nestjs ? 'true' : 'false'}`)
  env.push('BULLMQ_ENABLED=false')
  env.push(`GOLANG_ENABLED=${data.optionalServices?.golang ? 'true' : 'false'}`)
  env.push(`PYTHON_ENABLED=${data.optionalServices?.python ? 'true' : 'false'}`)
  env.push('')

  // Admin UI Configuration
  env.push('# Admin UI Configuration')
  env.push('ADMIN_ENABLED=true')
  env.push(
    `ADMIN_PASSWORD_HASH=${data.adminPassword ? await hashPassword(data.adminPassword) : ''}`,
  )
  env.push('')

  return env.join('\n')
}

async function hashPassword(password: string): Promise<string> {
  // Use bcrypt for secure password hashing
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const setupData: SetupData = await request.json()

    // Get project path using centralized resolution
    const projectPath = getProjectPath()
    const envFilePath = path.join(projectPath, '.env.local')

    // Generate .env.local content
    const envContent = await generateEnvContent(setupData)

    // Write .env.local file
    await fs.writeFile(envFilePath, envContent, 'utf8')

    // Also create a backup of the generated config
    const backupPath = path.join(projectPath, '.env.local.backup')
    await fs.writeFile(backupPath, envContent, 'utf8')

    return NextResponse.json({
      success: true,
      message: 'Configuration file generated successfully',
      path: envFilePath,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate configuration file',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
