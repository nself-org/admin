# CI/CD Pipeline Documentation

This document describes the complete Continuous Integration and Continuous Deployment (CI/CD) pipeline for nself-admin.

## Table of Contents

- [Overview](#overview)
- [Workflows](#workflows)
- [Monitoring](#monitoring)
- [Setup Instructions](#setup-instructions)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

nself-admin uses GitHub Actions for CI/CD automation with the following goals:

- **Quality Assurance**: All code changes are tested automatically
- **Security**: Dependencies are audited daily for vulnerabilities
- **Performance**: Lighthouse audits ensure optimal user experience
- **Automation**: Deployments to staging and production are fully automated
- **Observability**: Comprehensive monitoring and logging

### Pipeline Architecture

```
┌─────────────┐
│   PR Open   │
└──────┬──────┘
       │
       ├─► Lint & Format Check
       ├─► TypeScript Type Check
       ├─► Unit Tests (Jest)
       ├─► E2E Tests (Playwright)
       ├─► Lighthouse Audit
       └─► Production Build Test
              │
              ▼
       ┌──────────────┐
       │  PR Approved │
       └──────┬───────┘
              │
       ┌──────▼────────┐
       │ Merge to main │
       └──────┬────────┘
              │
              ├─► Build Docker Image
              ├─► Push to Docker Hub (staging tag)
              ├─► Deploy to Staging Server
              └─► Run Smoke Tests
                     │
                     ▼
              ┌──────────────┐
              │  Tag Release │
              └──────┬───────┘
                     │
                     ├─► Run Full Test Suite
                     ├─► Build Multi-Platform Docker
                     ├─► Push to Docker Hub (latest + version)
                     ├─► Create GitHub Release
                     └─► Update Docker Hub README
```

---

## Workflows

### 1. Test Workflow (`test.yml`)

**Trigger**: Every pull request and push to main/develop

**Jobs**:

#### Lint

- Runs ESLint with zero tolerance for warnings/errors
- Checks code formatting with Prettier
- Uses pnpm for fast dependency installation

```yaml
pnpm run lint           # Must pass with 0 errors, 0 warnings
pnpm run format:check   # Must pass formatting check
```

#### Type Check

- Runs TypeScript compiler in strict mode
- Ensures type safety across the codebase

```yaml
pnpm run type-check
```

#### Unit Tests

- Runs Jest test suite with coverage reporting
- Uploads coverage to Codecov
- Requires minimum 80% code coverage (configurable)

```yaml
pnpm test -- --coverage --ci
```

**Coverage Thresholds**:

- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

#### E2E Tests

- Runs Playwright tests across multiple browsers
- Tests critical user flows (login, service management, database operations)
- Captures screenshots and videos on failure
- Uploads test artifacts for debugging

```yaml
pnpm exec playwright test
```

**Test Matrix**:

- Chromium (desktop)
- Firefox (desktop)
- WebKit (Safari simulation)
- Mobile viewports (Chrome Mobile, Mobile Safari)

#### Production Build

- Tests that the application builds successfully
- Validates build output
- Checks for build warnings

```yaml
pnpm run build
```

**Artifacts**:

- Build output (`.next/`)
- Test reports
- Coverage reports
- Playwright screenshots (on failure)

---

### 2. Deploy Staging Workflow (`deploy-staging.yml`)

**Trigger**: Push to main branch

**Environment**: Staging server

**Steps**:

1. **Build Docker Image**
   - Uses Docker Buildx for efficient builds
   - Enables layer caching for faster builds
   - Tags image with `staging` and commit SHA

2. **Push to Docker Hub**
   - Authenticates using secrets
   - Pushes `staging` tag
   - Pushes `staging-<sha>` tag for rollback capability

3. **Deploy to Server**
   - SSH into staging server
   - Pulls latest `staging` image
   - Stops and removes old container
   - Starts new container with updated image

4. **Smoke Tests**
   - Waits for service to be ready
   - Checks `/api/health` endpoint
   - Validates version endpoint
   - Fails deployment if checks don't pass

5. **Notification**
   - Posts deployment status to Slack (optional)
   - Includes deployment URL and commit info

**Rollback**:

```bash
# On staging server
docker pull acamarata/nself-admin:staging-<previous-sha>
docker stop nself-admin-staging
docker rm nself-admin-staging
docker run -d --name nself-admin-staging ... acamarata/nself-admin:staging-<previous-sha>
```

---

### 3. Release Workflow (`release.yml`)

**Trigger**: Push tag matching `v*` (e.g., `v0.5.0`)

**Environment**: Production

**Steps**:

1. **Pre-Release Validation**
   - Runs full test suite
   - Ensures all tests pass before release

2. **Build Multi-Platform Image**
   - Builds for `linux/amd64` and `linux/arm64`
   - Ensures compatibility with different architectures
   - Uses Docker Buildx

3. **Tag Strategy**
   - `latest` - Always points to latest stable release
   - `0.5.0` - Full semantic version
   - `0.5` - Minor version (receives patches)
   - `0` - Major version

4. **Create GitHub Release**
   - Auto-generates changelog from commits
   - Includes installation instructions
   - Attaches release artifacts (tar.gz)
   - Marks as pre-release if tag contains `alpha`, `beta`, or `rc`

5. **Update Docker Hub**
   - Updates repository README
   - Syncs documentation from repo

**Creating a Release**:

```bash
# Update version in package.json
npm version 0.5.0 --no-git-tag-version

# Commit version bump
git add package.json
git commit -m "chore: bump version to 0.5.0"

# Create and push tag
git tag v0.5.0
git push origin main --tags
```

---

### 4. Dependency Audit Workflow (`dependency-audit.yml`)

**Trigger**:

- Daily at midnight UTC (cron)
- Push to main that changes `package.json` or `pnpm-lock.yaml`
- Manual trigger via workflow dispatch

**Steps**:

1. **Run Security Audit**
   - Executes `pnpm audit`
   - Checks for known vulnerabilities
   - Categorizes by severity (critical, high, moderate, low)

2. **Create/Update Issue**
   - If vulnerabilities found, creates GitHub issue
   - Updates existing issue if already open
   - Labels: `security`, `dependencies`, `automated`
   - Includes remediation steps

3. **Fail on Critical**
   - Pipeline fails if critical vulnerabilities detected
   - Requires immediate attention

**Issue Template**:

```markdown
## Dependency Security Audit

**Total vulnerabilities:** 5

| Severity | Count |
| -------- | ----- |
| Critical | 1     |
| High     | 2     |
| Moderate | 2     |
| Low      | 0     |

### Next Steps

1. Review the vulnerabilities: `pnpm audit`
2. Update dependencies: `pnpm update`
3. Check for breaking changes
4. Run tests: `pnpm test`
5. Create PR with fixes
```

**Manual Fix**:

```bash
# View detailed audit report
pnpm audit

# Attempt automatic fix
pnpm audit --fix

# Update specific package
pnpm update <package-name>

# Test after updates
pnpm test

# Commit fixes
git commit -am "fix: update dependencies to address security vulnerabilities"
```

---

### 5. Lighthouse Audit Workflow (`lighthouse.yml`)

**Trigger**:

- Weekly on Sunday at midnight UTC
- Pull requests that change `src/**` or `public/**`
- Manual trigger via workflow dispatch

**Metrics Tested**:

- Performance (target: 90+)
- Accessibility (target: 90+)
- Best Practices (target: 90+)
- SEO (target: 90+)

**Pages Audited**:

- `/` - Dashboard
- `/login` - Authentication page
- `/services` - Service management
- `/database` - Database tools

**Lighthouse Configuration** (`.lighthouserc.json`):

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": [
        "http://localhost:3021",
        "http://localhost:3021/login",
        "http://localhost:3021/services",
        "http://localhost:3021/database"
      ]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }]
      }
    }
  }
}
```

**PR Comment Example**:

```markdown
## Lighthouse Audit Results

| Category       | Score | Status |
| -------------- | ----- | ------ |
| Performance    | 95    | 🟢     |
| Accessibility  | 98    | 🟢     |
| Best Practices | 92    | 🟢     |
| SEO            | 100   | 🟢     |

### Score Guide

- 🟢 90-100: Good
- 🟠 50-89: Needs improvement
- 🔴 0-49: Poor

[View full Lighthouse report](https://storage.googleapis.com/...)
```

---

## Monitoring

### Health Check Endpoint

**Endpoint**: `GET /api/health`

**Response**:

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2026-01-31T12:00:00.000Z",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database accessible",
      "latency": 5
    },
    "nselfCli": {
      "status": "pass",
      "message": "nself CLI accessible",
      "latency": 10,
      "details": {
        "version": "0.4.4"
      }
    },
    "docker": {
      "status": "pass",
      "message": "Docker daemon accessible",
      "latency": 15
    },
    "diskSpace": {
      "status": "pass",
      "message": "Disk usage: 45%",
      "latency": 8
    }
  },
  "version": {
    "node": "v20.11.0",
    "app": "0.5.0"
  }
}
```

**Status Codes**:

- `200` - Service healthy
- `503` - Service degraded or unhealthy

**Use Cases**:

- Load balancer health checks
- Uptime monitoring (UptimeRobot, Pingdom)
- Kubernetes liveness/readiness probes
- Internal monitoring dashboards

---

### Metrics Endpoint

**Endpoint**: `GET /api/metrics`

**Format**: Prometheus text format

**Sample Output**:

```
# HELP nadmin_process_uptime_seconds Process uptime in seconds
# TYPE nadmin_process_uptime_seconds gauge
nadmin_process_uptime_seconds 86400

# HELP nadmin_process_memory_heap_bytes Process heap memory usage in bytes
# TYPE nadmin_process_memory_heap_bytes gauge
nadmin_process_memory_heap_bytes{type="used"} 125829120
nadmin_process_memory_heap_bytes{type="total"} 268435456

# HELP nadmin_active_sessions_total Total number of active user sessions
# TYPE nadmin_active_sessions_total gauge
nadmin_active_sessions_total 5

# HELP nadmin_database_documents_total Total number of documents in collection
# TYPE nadmin_database_documents_total gauge
nadmin_database_documents_total{collection="sessions"} 10
nadmin_database_documents_total{collection="config"} 5
nadmin_database_documents_total{collection="audit_log"} 1523
```

**Metrics Exposed**:

- Process uptime
- Memory usage (heap used/total)
- System memory (total/used)
- Database collections count
- Documents per collection
- Active sessions count
- Build information
- Environment information

**Integration with Prometheus**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nself-admin'
    static_configs:
      - targets: ['localhost:3021']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
```

**Grafana Dashboard**:

- Import dashboard ID: (coming soon)
- Visualizes all metrics
- Pre-configured alerts
- Real-time updates

---

### Structured Logging

**Library**: Custom logger (`src/lib/logger.ts`)

**Log Levels**:

- `ERROR` - Critical errors requiring immediate attention
- `WARN` - Warning conditions
- `INFO` - Informational messages (default in production)
- `DEBUG` - Detailed debugging information (development only)

**Environment Configuration**:

```bash
# Set log level
LOG_LEVEL=debug    # debug, info, warn, error

# Production (default: info)
NODE_ENV=production

# Development (default: debug)
NODE_ENV=development
```

**Usage Examples**:

```typescript
import { logger } from '@/lib/logger'

// Simple logging
logger.info('Service started')
logger.warn('High memory usage detected')
logger.error('Database connection failed')

// With context
logger.info('User logged in', {
  userId: 'admin',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
})

// With error object
try {
  await someOperation()
} catch (error) {
  logger.error(
    'Operation failed',
    { operation: 'backup', retryCount: 3 },
    error as Error,
  )
}

// HTTP request logging
logger.http('GET', '/api/services', 200, 145, {
  userId: 'admin',
  ip: '192.168.1.1',
})
```

**Log Format (Production - JSON)**:

```json
{
  "timestamp": "2026-01-31T12:00:00.000Z",
  "level": "error",
  "message": "Database connection failed",
  "context": {
    "requestId": "abc-123",
    "userId": "admin",
    "ip": "192.168.1.1",
    "endpoint": "/api/services"
  },
  "error": {
    "name": "ConnectionError",
    "message": "ECONNREFUSED",
    "stack": "Error: ECONNREFUSED\n    at ..."
  }
}
```

**Log Format (Development - Human-readable)**:

```
[12:00:00] ERROR Database connection failed {"requestId":"abc-123","userId":"admin"}
Error: ECONNREFUSED
    at Object.connect (/app/lib/database.ts:45:10)
    at ...
```

**Security**:

- Automatically redacts sensitive fields:
  - `password`, `token`, `secret`, `apiKey`, `api_key`
  - `authorization`, `cookie`, `session`
- Never logs credentials in any environment

**Log Aggregation**:

- Production: Logs are written to stdout/stderr in JSON format
- Docker: Logs are captured by Docker logging driver
- Kubernetes: Logs are collected by Fluentd/Filebeat
- Analysis: Use Loki, Elasticsearch, or CloudWatch Logs

---

## Setup Instructions

### Prerequisites

1. **GitHub Repository Secrets**

Navigate to `Settings > Secrets and variables > Actions` and add:

| Secret Name          | Description                  | Required For     |
| -------------------- | ---------------------------- | ---------------- |
| `DOCKERHUB_USERNAME` | Docker Hub username          | Staging, Release |
| `DOCKERHUB_TOKEN`    | Docker Hub access token      | Staging, Release |
| `STAGING_HOST`       | Staging server hostname/IP   | Staging          |
| `STAGING_USER`       | SSH username for staging     | Staging          |
| `STAGING_SSH_KEY`    | Private SSH key for staging  | Staging          |
| `STAGING_URL`        | Staging server URL           | Staging          |
| `SLACK_WEBHOOK`      | Slack webhook URL (optional) | Notifications    |

2. **Docker Hub Setup**

```bash
# Create repository
# Visit https://hub.docker.com/repository/create
# Name: nself-admin
# Visibility: Public

# Create access token
# Visit https://hub.docker.com/settings/security
# New Access Token > Read, Write, Delete
```

3. **Codecov Setup** (Optional)

```bash
# Visit https://codecov.io
# Sign in with GitHub
# Add repository: nself-org/admin
# Copy token and add to GitHub secrets as CODECOV_TOKEN
```

---

### Local Testing

Test workflows locally before pushing:

```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run test workflow
act pull_request -W .github/workflows/test.yml

# Run specific job
act pull_request -W .github/workflows/test.yml -j lint

# With secrets
act pull_request --secret-file .secrets

# .secrets file format:
# DOCKERHUB_USERNAME=myusername
# DOCKERHUB_TOKEN=mytoken
```

---

### Monitoring Setup

#### 1. Uptime Monitoring

**UptimeRobot** (Free):

```
Monitor Type: HTTPS
URL: https://your-domain.com/api/health
Keyword: "healthy"
Check Interval: 5 minutes
Alert Method: Email, Slack, SMS
```

**Pingdom**:

```
Check Type: HTTP
URL: https://your-domain.com/api/health
Response Should Contain: "healthy"
Check Interval: 1 minute
```

#### 2. Prometheus + Grafana

**Prometheus Configuration**:

```yaml
# prometheus.yml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
  - job_name: 'nself-admin-staging'
    static_configs:
      - targets: ['staging.your-domain.com:3021']
    metrics_path: '/api/metrics'

  - job_name: 'nself-admin-production'
    static_configs:
      - targets: ['your-domain.com:3021']
    metrics_path: '/api/metrics'
```

**Grafana Dashboard**:

```
1. Add Prometheus data source
2. Import dashboard (coming soon: dashboard ID)
3. Configure alerts:
   - High memory usage (>80%)
   - Error rate spike
   - Service downtime
```

#### 3. Log Aggregation with Loki

**Docker Compose** (for staging/production):

```yaml
version: '3.8'
services:
  nself-admin:
    image: acamarata/nself-admin:latest
    logging:
      driver: loki
      options:
        loki-url: 'http://loki:3100/loki/api/v1/push'
        loki-retries: '5'
        loki-batch-size: '400'

  loki:
    image: grafana/loki:latest
    ports:
      - '3100:3100'
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki
```

**Query Logs in Grafana**:

```logql
# All error logs
{job="nself-admin"} |= "ERROR"

# Logs for specific user
{job="nself-admin"} | json | userId="admin"

# Failed requests
{job="nself-admin"} | json | statusCode >= 500
```

---

## Best Practices

### 1. Commit Messages

Follow Conventional Commits:

```bash
# Types:
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Code style changes (formatting)
refactor: Code refactoring
test:     Adding or updating tests
chore:    Maintenance tasks
perf:     Performance improvements
ci:       CI/CD changes

# Examples:
git commit -m "feat: add Prometheus metrics endpoint"
git commit -m "fix: resolve memory leak in session cleanup"
git commit -m "docs: update CI/CD pipeline documentation"
git commit -m "test: add E2E tests for deployment workflow"
```

### 2. Branch Strategy

```
main (protected)
├── develop (optional for larger teams)
├── feature/add-monitoring
├── fix/memory-leak
├── hotfix/security-patch
└── release/v0.5.0
```

**Branch Protection Rules**:

- Require pull request reviews (1+)
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to main

### 3. Pull Request Guidelines

**Before Opening PR**:

```bash
# 1. Update from main
git fetch origin
git rebase origin/main

# 2. Run quality checks
pnpm run lint
pnpm run format
pnpm run type-check
pnpm test

# 3. Run E2E tests
pnpm exec playwright test

# 4. Build
pnpm run build
```

**PR Template**:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] All checks passing
```

### 4. Release Process

**Semantic Versioning**:

- **Major** (1.0.0): Breaking changes
- **Minor** (0.5.0): New features, backwards compatible
- **Patch** (0.5.1): Bug fixes, backwards compatible

**Release Checklist**:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit: `chore: bump version to 0.5.0`
4. Create tag: `git tag v0.5.0`
5. Push: `git push origin main --tags`
6. Wait for CI to create GitHub Release
7. Verify Docker Hub images
8. Test deployment
9. Announce release

### 5. Security

**Dependency Updates**:

```bash
# Check for outdated packages
pnpm outdated

# Interactive update
pnpm update --interactive

# Update all to latest (be careful!)
pnpm update --latest

# After updates, always test
pnpm test
pnpm exec playwright test
```

**Secret Rotation**:

- Rotate Docker Hub tokens quarterly
- Rotate SSH keys annually
- Update Slack webhooks when team members leave
- Never commit secrets to repository

---

## Troubleshooting

### Common Issues

#### 1. Test Workflow Fails

**Issue**: Lint errors

```bash
# Locally fix linting issues
pnpm run lint --fix

# Check what's wrong
pnpm run lint

# Format code
pnpm run format
```

**Issue**: Type check fails

```bash
# Run type check locally
pnpm run type-check

# Common fixes:
# - Add missing type annotations
# - Fix any usage
# - Update @types/* packages
```

**Issue**: Tests fail

```bash
# Run tests locally with verbose output
pnpm test -- --verbose

# Run specific test
pnpm test -- path/to/test.test.ts

# Update snapshots if needed
pnpm test -- -u
```

#### 2. Deploy Staging Fails

**Issue**: SSH connection refused

```bash
# Verify SSH key is correct
ssh -i <key-file> user@staging-host

# Check GitHub secret STAGING_SSH_KEY format:
# Should be the entire private key including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

**Issue**: Docker pull fails

```bash
# Verify Docker Hub credentials
docker login

# Check image exists
docker pull acamarata/nself-admin:staging
```

**Issue**: Health check fails

```bash
# SSH into staging server
ssh user@staging-host

# Check container logs
docker logs nself-admin-staging

# Check if service is running
docker ps | grep nself-admin

# Manually test health endpoint
curl http://localhost:3021/api/health
```

#### 3. Release Workflow Fails

**Issue**: Tag already exists

```bash
# Delete local tag
git tag -d v0.5.0

# Delete remote tag
git push origin :refs/tags/v0.5.0

# Recreate tag
git tag v0.5.0
git push origin v0.5.0
```

**Issue**: Docker build fails

```bash
# Test Docker build locally
docker build -t nself-admin:test .

# Check Dockerfile syntax
docker build --check -t nself-admin:test .

# View build logs
docker build --progress=plain -t nself-admin:test .
```

#### 4. Dependency Audit Fails

**Issue**: Critical vulnerabilities found

```bash
# View audit report
pnpm audit

# Try automatic fix
pnpm audit --fix

# If fix doesn't work:
# 1. Check if patch available
# 2. Update to latest version
# 3. Find alternative package
# 4. Create security exception (last resort)

# Override vulnerability (use sparingly)
# Add to package.json:
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": "^safe-version"
    }
  }
}
```

#### 5. Lighthouse Fails

**Issue**: Performance score too low

```bash
# Run Lighthouse locally
npx lighthouse http://localhost:3021 --view

# Common fixes:
# - Optimize images (use next/image)
# - Enable code splitting
# - Reduce bundle size
# - Add caching headers
# - Lazy load components
```

**Issue**: Accessibility issues

```bash
# Use automated tools
npx pa11y http://localhost:3021

# Common fixes:
# - Add alt text to images
# - Ensure proper heading hierarchy
# - Add ARIA labels
# - Fix color contrast
# - Ensure keyboard navigation
```

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

---

## Support

For CI/CD related issues:

- Open an issue: [GitHub Issues](https://github.com/nself-org/admin/issues)
- Discussion: [GitHub Discussions](https://github.com/nself-org/admin/discussions)
- Security: See [SECURITY.md](SECURITY.md)

---

**Last Updated**: 2026-01-31
**Version**: 0.5.0
