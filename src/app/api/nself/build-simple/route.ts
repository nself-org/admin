import { readEnvFile } from '@/lib/env-handler'
import { getProjectPath } from '@/lib/paths'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

// Generate a basic docker-compose.yml based on env settings
async function generateDockerCompose(config: any): Promise<string> {
  const services: string[] = []
  const volumes: string[] = []

  // PostgreSQL (always included)
  services.push(`  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: \${POSTGRES_DB:-nself}
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-postgres-dev-password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5`)
  volumes.push('postgres_data')

  // Hasura (always included)
  services.push(`  hasura:
    image: hasura/graphql-engine:v2.44.0
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD:-postgres-dev-password}@postgres:5432/\${POSTGRES_DB:-nself}
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_DEV_MODE: "true"
      HASURA_GRAPHQL_ADMIN_SECRET: \${HASURA_GRAPHQL_ADMIN_SECRET:-hasura-admin-secret-dev}
      HASURA_GRAPHQL_JWT_SECRET: '{"type":"HS256","key":"\${HASURA_JWT_KEY:-development-secret-key-minimum-32-characters-long}"}'
    ports:
      - "8080:8080"`)

  // Auth (always included)
  services.push(`  auth:
    image: nhost/hasura-auth:latest
    depends_on:
      - postgres
      - hasura
    environment:
      AUTH_HOST: 0.0.0.0
      AUTH_PORT: 4000
      HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD:-postgres-dev-password}@postgres:5432/\${POSTGRES_DB:-nself}
      HASURA_GRAPHQL_ADMIN_SECRET: \${HASURA_GRAPHQL_ADMIN_SECRET:-hasura-admin-secret-dev}
      AUTH_CLIENT_URL: http://localhost:3000
      AUTH_JWT_SECRET: '{"type":"HS256","key":"\${HASURA_JWT_KEY:-development-secret-key-minimum-32-characters-long}"}'
    ports:
      - "4000:4000"`)

  // Storage/MinIO (if enabled)
  if (config.STORAGE_ENABLED === 'true' || config.MINIO_ENABLED === 'true') {
    services.push(`  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: \${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD:-minioadmin}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data`)
    volumes.push('minio_data')
  }

  // Redis (if enabled)
  if (config.REDIS_ENABLED === 'true') {
    services.push(`  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data`)
    volumes.push('redis_data')
  }

  // Mailpit (if enabled)
  if (config.MAILPIT_ENABLED === 'true') {
    services.push(`  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"
      - "8025:8025"`)
  }

  // MLflow (if enabled)
  if (config.MLFLOW_ENABLED === 'true') {
    services.push(`  mlflow:
    image: ghcr.io/mlflow/mlflow:latest
    ports:
      - "5000:5000"
    command: mlflow server --host 0.0.0.0`)
  }

  // Search engine (if enabled)
  if (config.SEARCH_ENABLED === 'true') {
    const searchEngine = config.SEARCH_ENGINE || 'meilisearch'
    if (searchEngine === 'meilisearch') {
      services.push(`  meilisearch:
    image: getmeili/meilisearch:latest
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: \${MEILI_MASTER_KEY:-masterKey}
    volumes:
      - meilisearch_data:/meili_data`)
      volumes.push('meilisearch_data')
    }
  }

  // Monitoring stack (if enabled)
  if (config.MONITORING_ENABLED === 'true') {
    services.push(`  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - prometheus_data:/prometheus`)
    volumes.push('prometheus_data')

    services.push(`  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana`)
    volumes.push('grafana_data')

    services.push(`  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml`)

    services.push(`  tempo:
    image: grafana/tempo:latest
    command: [ "-config.file=/etc/tempo.yaml" ]
    ports:
      - "3200:3200"`)

    services.push(`  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"`)
  }

  // nself-admin (if enabled)
  if (
    config.NSELF_ADMIN_ENABLED === 'true' ||
    config.NADMIN_ENABLED === 'true'
  ) {
    services.push(`  nself-admin:
    image: nself/nself-admin:latest
    ports:
      - "3021:3021"
    environment:
      NSELF_PROJECT_PATH: /workspace
    volumes:
      - ./:/workspace`)
  }

  // Nginx (always included last)
  services.push(`  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - hasura
      - auth`)

  // Build the final docker-compose.yml
  const dockerCompose = `version: '3.8'

services:
${services.join('\n\n')}

volumes:
${volumes.map((v) => `  ${v}:`).join('\n')}
`

  return dockerCompose
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    // Get project path - use the same as other APIs
    const projectPath = getProjectPath()

    // Ensure project directory exists
    try {
      await fs.access(projectPath)
    } catch {
      console.error('Project directory does not exist:', projectPath)
      return NextResponse.json(
        { error: `Project directory not found: ${projectPath}` },
        { status: 400 },
      )
    }

    // Read environment configuration
    const config = await readEnvFile()
    if (!config) {
      return NextResponse.json(
        { error: 'No environment configuration found' },
        { status: 400 },
      )
    }

    // Generate docker-compose.yml
    const dockerComposeContent = await generateDockerCompose(config)
    const dockerComposePath = path.join(projectPath, 'docker-compose.yml')

    // Write the file
    await fs.writeFile(dockerComposePath, dockerComposeContent, 'utf-8')

    // Count services
    const serviceMatches = dockerComposeContent.match(/^ {2}\w+:/gm)
    const serviceCount = serviceMatches ? serviceMatches.length : 0

    // Create necessary directories
    const dirsToCreate = [
      'nginx/conf.d',
      'nginx/ssl',
      'services',
      'logs',
      '.volumes/postgres',
      '.volumes/redis',
      '.volumes/minio',
    ]

    for (const dir of dirsToCreate) {
      const dirPath = path.join(projectPath, dir)
      await fs.mkdir(dirPath, { recursive: true }).catch(() => {})
    }

    // Create basic nginx config
    const nginxConfig = `server {
    listen 80;
    server_name localhost;

    location / {
        return 200 'nself is running';
        add_header Content-Type text/plain;
    }

    location /v1/graphql {
        proxy_pass http://hasura:8080/v1/graphql;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /v1/auth {
        proxy_pass http://auth:4000/v1/auth;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}`

    const nginxPath = path.join(projectPath, 'nginx/conf.d/default.conf')
    await fs.writeFile(nginxPath, nginxConfig, 'utf-8').catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Project built successfully',
      output: `✓ Generated docker-compose.yml\n✓ ${serviceCount} services configured\n✓ Created project directories\n✓ Configured nginx`,
      serviceCount,
    })
  } catch (error) {
    console.error('=== Build Error ===')
    console.error('Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to build project',
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
