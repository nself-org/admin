# nself-admin Environment Variables Reference

## Overview

This document provides a complete reference for all environment variables used by nself-admin, aligned with the official nself Environment Variable Specification v1.0.

## Table of Contents

1. [Core Configuration](#core-configuration)
2. [Service Enable Flags](#service-enable-flags)
3. [Database Configuration](#database-configuration)
4. [Hasura Configuration](#hasura-configuration)
5. [Authentication Service](#authentication-service)
6. [Storage Service (MinIO)](#storage-service-minio)
7. [Optional Services](#optional-services)
8. [Custom Services](#custom-services)
9. [Frontend Applications](#frontend-applications)
10. [Backup Configuration](#backup-configuration)
11. [Email Configuration](#email-configuration)
12. [Monitoring Bundle](#monitoring-bundle)
13. [Environment File Cascade](#environment-file-cascade)
14. [Migration Guide](#migration-guide)

---

## Core Configuration

Basic project settings that define your nself deployment.

| Variable              | Type   | Default           | Required | Description                                 |
| --------------------- | ------ | ----------------- | -------- | ------------------------------------------- |
| `ENV`                 | string | `dev`             | Yes      | Environment mode (`dev`, `staging`, `prod`) |
| `PROJECT_NAME`        | string | -                 | **Yes**  | Project identifier (alphanumeric + dash)    |
| `PROJECT_DESCRIPTION` | string | `""`              | No       | Human-readable project description          |
| `BASE_DOMAIN`         | string | `local.nself.org` | Yes      | Base domain for all services                |
| `ADMIN_EMAIL`         | string | `""`              | No       | Administrative contact email                |

### Examples

```bash
ENV=dev
PROJECT_NAME=my-awesome-app
PROJECT_DESCRIPTION="E-commerce platform with multi-tenant support"
BASE_DOMAIN=local.nself.org
ADMIN_EMAIL=admin@mycompany.com
```

---

## Service Enable Flags

Control which services are included in your stack. Core services default to `true` for backward compatibility.

### Core Services (Always Required)

| Variable           | Type | Default | Description                             |
| ------------------ | ---- | ------- | --------------------------------------- |
| `POSTGRES_ENABLED` | bool | `true`  | PostgreSQL database (always required)   |
| `HASURA_ENABLED`   | bool | `true`  | Hasura GraphQL engine (always required) |
| `AUTH_ENABLED`     | bool | `true`  | Authentication service (recommended)    |
| `STORAGE_ENABLED`  | bool | `true`  | MinIO storage service (recommended)     |

### Optional Services

| Variable              | Type | Default | Description                               |
| --------------------- | ---- | ------- | ----------------------------------------- |
| `NSELF_ADMIN_ENABLED` | bool | `false` | Enable nself-admin UI                     |
| `REDIS_ENABLED`       | bool | `false` | Enable Redis cache                        |
| `MAILPIT_ENABLED`     | bool | `false` | Enable development email capture          |
| `FUNCTIONS_ENABLED`   | bool | `false` | Enable serverless functions (coming soon) |
| `PROMETHEUS_ENABLED`  | bool | `false` | Enable Prometheus metrics                 |
| `GRAFANA_ENABLED`     | bool | `false` | Enable Grafana dashboards                 |
| `LOKI_ENABLED`        | bool | `false` | Enable log aggregation                    |
| `SEARCH_ENABLED`      | bool | `false` | Enable search services                    |

### Bundle Flags

| Variable             | Type | Default | Description                                    |
| -------------------- | ---- | ------- | ---------------------------------------------- |
| `MONITORING_ENABLED` | bool | `false` | Enables Prometheus, Grafana, and Loki together |

### Example

```bash
# Core services (these default to true)
POSTGRES_ENABLED=true
HASURA_ENABLED=true
AUTH_ENABLED=true
STORAGE_ENABLED=true

# Optional services
NSELF_ADMIN_ENABLED=true
REDIS_ENABLED=true
MAILPIT_ENABLED=true

# Monitoring bundle (sets all 3 monitoring services)
MONITORING_ENABLED=true
```

---

## Database Configuration

PostgreSQL database settings.

| Variable              | Type   | Default              | Required | Description                     |
| --------------------- | ------ | -------------------- | -------- | ------------------------------- |
| `POSTGRES_DB`         | string | `nself`              | Yes      | Database name                   |
| `POSTGRES_USER`       | string | `postgres`           | Yes      | Database user (always postgres) |
| `POSTGRES_PASSWORD`   | string | `nself-dev-password` | Yes      | Database password               |
| `POSTGRES_HOST`       | string | `postgres`           | No       | Database host                   |
| `POSTGRES_PORT`       | int    | `5432`               | No       | Database port                   |
| `POSTGRES_VERSION`    | string | `16-alpine`          | No       | PostgreSQL version              |
| `POSTGRES_EXTENSIONS` | string | `uuid-ossp,pgcrypto` | No       | Comma-separated extensions      |

### Example

```bash
POSTGRES_DB=myapp_db
POSTGRES_PASSWORD=super-secret-password-here
POSTGRES_VERSION=16-alpine
POSTGRES_EXTENSIONS=uuid-ossp,pgcrypto,postgis
```

---

## Hasura Configuration

Hasura GraphQL engine settings.

| Variable                           | Type   | Default      | Required | Description                   |
| ---------------------------------- | ------ | ------------ | -------- | ----------------------------- |
| `HASURA_VERSION`                   | string | `v2.44.0`    | No       | Hasura version                |
| `HASURA_GRAPHQL_ADMIN_SECRET`      | string | -            | **Yes**  | Admin secret (min 32 chars)   |
| `HASURA_JWT_KEY`                   | string | -            | **Yes**  | JWT secret key (min 32 chars) |
| `HASURA_JWT_TYPE`                  | string | `HS256`      | No       | JWT algorithm (HS256, RS256)  |
| `HASURA_GRAPHQL_ENABLE_CONSOLE`    | bool   | `true` (dev) | No       | Enable web console            |
| `HASURA_GRAPHQL_DEV_MODE`          | bool   | `true` (dev) | No       | Development mode              |
| `HASURA_GRAPHQL_ENABLE_TELEMETRY`  | bool   | `false`      | No       | Send usage stats              |
| `HASURA_GRAPHQL_CORS_DOMAIN`       | string | `*` (dev)    | No       | CORS domains                  |
| `HASURA_GRAPHQL_UNAUTHORIZED_ROLE` | string | `public`     | No       | Default unauthorized role     |

### Important Notes

- `HASURA_JWT_KEY` and `HASURA_JWT_TYPE` are used to build the `HASURA_GRAPHQL_JWT_SECRET` JSON
- Both secrets MUST be at least 32 characters long
- In production, use strong randomly generated secrets

### Example

```bash
HASURA_GRAPHQL_ADMIN_SECRET=my-very-long-secret-key-minimum-32-characters-long
HASURA_JWT_KEY=another-very-long-secret-key-minimum-32-chars
HASURA_JWT_TYPE=HS256
HASURA_GRAPHQL_ENABLE_CONSOLE=false  # Disable in production
HASURA_GRAPHQL_DEV_MODE=false        # Disable in production
HASURA_GRAPHQL_CORS_DOMAIN=https://myapp.com,https://api.myapp.com
```

---

## Authentication Service

Hasura Auth service configuration.

| Variable                            | Type   | Default   | Description                      |
| ----------------------------------- | ------ | --------- | -------------------------------- |
| `AUTH_VERSION`                      | string | `v0.36.0` | Auth service version             |
| `AUTH_JWT_REFRESH_TOKEN_EXPIRES_IN` | int    | `2592000` | Refresh token lifetime (seconds) |
| `AUTH_JWT_ACCESS_TOKEN_EXPIRES_IN`  | int    | `900`     | Access token lifetime (seconds)  |
| `AUTH_WEBAUTHN_ENABLED`             | bool   | `false`   | Enable passwordless auth         |
| `AUTH_EMAIL_VERIFICATION_REQUIRED`  | bool   | `false`   | Require email verification       |

### Example

```bash
AUTH_JWT_ACCESS_TOKEN_EXPIRES_IN=900      # 15 minutes
AUTH_JWT_REFRESH_TOKEN_EXPIRES_IN=2592000 # 30 days
AUTH_EMAIL_VERIFICATION_REQUIRED=true     # Require email verification
AUTH_WEBAUTHN_ENABLED=true               # Enable passwordless login
```

---

## Storage Service (MinIO)

Object storage configuration.

| Variable              | Type   | Default      | Required | Description                 |
| --------------------- | ------ | ------------ | -------- | --------------------------- |
| `STORAGE_ENABLED`     | bool   | `true`       | No       | Enable storage service      |
| `MINIO_VERSION`       | string | `latest`     | No       | MinIO version               |
| `MINIO_ROOT_USER`     | string | `minioadmin` | Yes\*    | Root username               |
| `MINIO_ROOT_PASSWORD` | string | -            | Yes\*    | Root password (min 8 chars) |
| `MINIO_PORT`          | int    | `9000`       | No       | MinIO API port              |
| `MINIO_CONSOLE_PORT`  | int    | `9001`       | No       | MinIO console port          |
| `S3_BUCKET`           | string | `nself`      | No       | Default bucket name         |

\*Required if STORAGE_ENABLED=true

### Example

```bash
STORAGE_ENABLED=true
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=secure-password-here
S3_BUCKET=myapp-storage
```

---

## Optional Services

### Redis Configuration

| Variable         | Type   | Default    | Description        |
| ---------------- | ------ | ---------- | ------------------ |
| `REDIS_ENABLED`  | bool   | `false`    | Enable Redis cache |
| `REDIS_VERSION`  | string | `7-alpine` | Redis version      |
| `REDIS_PORT`     | int    | `6379`     | Redis port         |
| `REDIS_PASSWORD` | string | `""`       | Redis password     |

### Search Services

| Variable         | Type   | Default       | Description           |
| ---------------- | ------ | ------------- | --------------------- |
| `SEARCH_ENABLED` | bool   | `false`       | Enable search service |
| `SEARCH_ENGINE`  | string | `meilisearch` | Search engine choice  |

Available search engines:

- `meilisearch` - Default, best for most use cases
- `typesense` - High performance, typo-tolerant
- `zinc` - Lightweight Elasticsearch alternative
- `elasticsearch` - Industry standard
- `opensearch` - AWS fork of Elasticsearch
- `sonic` - Ultra-lightweight option

### Example

```bash
# Redis
REDIS_ENABLED=true
REDIS_PASSWORD=redis-password-here

# Search
SEARCH_ENABLED=true
SEARCH_ENGINE=meilisearch
```

---

## Custom Services

Custom services that run as part of the Docker stack.

### Format

```bash
SERVICES_ENABLED=true
CS_1=name:framework:port:route
CS_2=name:framework:port:route
```

### Pattern

`name:framework[:port][:route]`

- `name` - Service name (required)
- `framework` - Framework/language (required)
- `port` - Service port (optional, default 4000+)
- `route` - URL route/subdomain (optional)

### Additional Configuration

```bash
CS_1_MEMORY=512M
CS_1_CPU=0.5
CS_1_REPLICAS=2
CS_1_TABLE_PREFIX=api_
CS_1_HEALTHCHECK=/health
CS_1_PUBLIC=true
CS_1_RATE_LIMIT=100r/s
```

### Example

```bash
SERVICES_ENABLED=true

# API service
CS_1=api:express:4000:api
CS_1_MEMORY=1G
CS_1_CPU=1.0
CS_1_TABLE_PREFIX=api_

# Worker service
CS_2=worker:python:4001
CS_2_MEMORY=512M

# Analytics service
CS_3=analytics:go:4002:analytics
CS_3_PUBLIC=true
```

---

## Frontend Applications

Configure external frontend applications that consume your backend.

### Format 1: Individual Variables (Recommended)

```bash
FRONTEND_APP_COUNT=2

# App 1
FRONTEND_APP_1_DISPLAY_NAME=Admin Dashboard
FRONTEND_APP_1_SYSTEM_NAME=admin_dashboard
FRONTEND_APP_1_TABLE_PREFIX=admin_
FRONTEND_APP_1_PORT=3001  # REQUIRED for nginx routing
FRONTEND_APP_1_ROUTE=admin
FRONTEND_APP_1_REMOTE_SCHEMA_NAME=admin_schema
FRONTEND_APP_1_REMOTE_SCHEMA_URL=http://localhost:4001/graphql

# App 2
FRONTEND_APP_2_DISPLAY_NAME=Customer Portal
FRONTEND_APP_2_SYSTEM_NAME=customer_portal
FRONTEND_APP_2_TABLE_PREFIX=customer_
FRONTEND_APP_2_PORT=3002  # REQUIRED
FRONTEND_APP_2_ROUTE=portal
```

### Variables

| Pattern                             | Type   | Required | Description                   |
| ----------------------------------- | ------ | -------- | ----------------------------- |
| `FRONTEND_APP_COUNT`                | int    | Yes      | Number of frontend apps       |
| `FRONTEND_APP_N_DISPLAY_NAME`       | string | No       | Human-readable name           |
| `FRONTEND_APP_N_SYSTEM_NAME`        | string | No       | System identifier (no spaces) |
| `FRONTEND_APP_N_TABLE_PREFIX`       | string | No       | Database table prefix         |
| `FRONTEND_APP_N_PORT`               | int    | **Yes**  | Local development port        |
| `FRONTEND_APP_N_ROUTE`              | string | No       | Subdomain/route               |
| `FRONTEND_APP_N_REMOTE_SCHEMA_NAME` | string | No       | Hasura remote schema name     |
| `FRONTEND_APP_N_REMOTE_SCHEMA_URL`  | string | No       | GraphQL endpoint URL          |

### Port Requirements

- Ports are **REQUIRED** for nginx routing
- Use unique ports (3001, 3002, 3003, etc.)
- Avoid conflicts with service ports

---

## Backup Configuration

Automated backup settings.

| Variable                | Type   | Default     | Description              |
| ----------------------- | ------ | ----------- | ------------------------ |
| `BACKUP_ENABLED`        | bool   | `false`     | Enable automated backups |
| `BACKUP_SCHEDULE`       | string | `0 2 * * *` | Cron schedule            |
| `BACKUP_RETENTION_DAYS` | int    | `30`        | Days to retain backups   |
| `BACKUP_DIR`            | string | `./backups` | Backup directory         |
| `BACKUP_STORAGE`        | string | `local`     | Storage location         |
| `BACKUP_TYPES`          | string | `database`  | Backup types             |
| `BACKUP_COMPRESSION`    | bool   | `true`      | Enable compression       |
| `BACKUP_ENCRYPTION`     | bool   | `false`     | Enable encryption        |
| `BACKUP_CLOUD_PROVIDER` | string | `""`        | Cloud provider           |

### Cron Schedule Examples

- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday
- `0 0 1 * *` - Monthly on the 1st

### Example

```bash
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *      # Daily at 2 AM
BACKUP_RETENTION_DAYS=30       # Keep for 30 days
BACKUP_COMPRESSION=true        # Compress backups
BACKUP_ENCRYPTION=true         # Encrypt backups
BACKUP_CLOUD_PROVIDER=s3       # Store in S3
```

---

## Email Configuration

### Development (Mailpit)

```bash
EMAIL_PROVIDER=mailpit
MAILPIT_ENABLED=true
MAILPIT_SMTP_PORT=1025
MAILPIT_UI_PORT=8025
```

### Production Options

```bash
EMAIL_PROVIDER=sendgrid  # Options: sendgrid, aws-ses, mailgun, postmark, etc.
```

### SMTP Configuration

When `EMAIL_PROVIDER=smtp`:

```bash
AUTH_SMTP_HOST=smtp.example.com
AUTH_SMTP_PORT=587
AUTH_SMTP_USER=username
AUTH_SMTP_PASS=password
AUTH_SMTP_SECURE=true
AUTH_SMTP_SENDER=noreply@example.com
```

### Supported Providers

- SendGrid
- AWS SES
- Mailgun
- Postmark
- Gmail (with app password)
- Office365
- Brevo (Sendinblue)
- Resend
- SparkPost
- Custom SMTP

---

## Monitoring Bundle

Enable comprehensive monitoring with a single flag or individual services.

### Bundle Flag

```bash
MONITORING_ENABLED=true  # Enables all three services
```

### Individual Flags

```bash
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
LOKI_ENABLED=true
```

### Monitoring Ports

- Prometheus: 9090
- Grafana: 3000
- Loki: 3100

---

## Environment File Cascade

Files are loaded in this exact order (later overrides earlier):

1. `.env.dev` - Team development defaults (committed to git)
2. `.env.staging` - Staging overrides (only if ENV=staging)
3. `.env.prod` - Production config (only if ENV=prod)
4. `.env.secrets` - Production secrets (only if ENV=prod, never commit)
5. `.env` - Local overrides (highest priority, never commit)

### Best Practices

- **Team defaults**: Write to `.env.dev`
- **Personal overrides**: Write to `.env`
- **Production secrets**: Use `.env.secrets`
- **Never commit**: `.env`, `.env.secrets`
- **Always commit**: `.env.dev`, `.env.staging`, `.env.prod`

---

## Migration Guide

### From Old Variable Names

| Old Variable                | New Variable                         | Notes                   |
| --------------------------- | ------------------------------------ | ----------------------- |
| `NADMIN_ENABLED`            | `NSELF_ADMIN_ENABLED`                | Use new name            |
| `MINIO_ENABLED`             | `STORAGE_ENABLED`                    | Storage service control |
| `DB_BACKUP_*`               | `BACKUP_*`                           | Remove DB\_ prefix      |
| `ELASTICSEARCH_ENABLED`     | `SEARCH_ENABLED`                     | Generic search flag     |
| `USER_SERVICE_*`            | `CS_*`                               | New service pattern     |
| `HASURA_GRAPHQL_JWT_SECRET` | `HASURA_JWT_KEY` + `HASURA_JWT_TYPE` | Split into two vars     |

### Example Migration

#### Old Format

```bash
NADMIN_ENABLED=true
MINIO_ENABLED=true
DB_BACKUP_ENABLED=true
DB_BACKUP_SCHEDULE=0 2 * * *
ELASTICSEARCH_ENABLED=true
USER_SERVICE_1_NAME=api
HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"secret-key"}
```

#### New Format

```bash
NSELF_ADMIN_ENABLED=true
STORAGE_ENABLED=true
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
SEARCH_ENABLED=true
CS_1=api:express:4000:api
HASURA_JWT_KEY=secret-key
HASURA_JWT_TYPE=HS256
```

---

## Validation Rules

### Required Variables

- `PROJECT_NAME` - Must be set
- `HASURA_GRAPHQL_ADMIN_SECRET` - Minimum 32 characters
- `HASURA_JWT_KEY` - Minimum 32 characters
- `MINIO_ROOT_PASSWORD` - Minimum 8 characters (if storage enabled)

### Port Uniqueness

All ports must be unique. Reserved ports:

- 80/443: Nginx
- 3000: Hasura Console
- 3100: nself-admin
- 4000: Auth
- 5432: PostgreSQL
- 6379: Redis
- 8080: Hasura GraphQL
- 9000/9001: MinIO
- 9090: Prometheus
- 3000: Grafana

### Naming Conventions

- **Service names**: lowercase, alphanumeric + dash
- **Table prefixes**: lowercase, alphanumeric + underscore, end with underscore
- **Routes**: lowercase, alphanumeric + dash
- **Project names**: lowercase, alphanumeric + dash + underscore

---

## Complete Example

### Development Environment

```bash
# Core Configuration
ENV=dev
PROJECT_NAME=my-awesome-app
PROJECT_DESCRIPTION="Multi-tenant SaaS platform"
BASE_DOMAIN=localhost
ADMIN_EMAIL=admin@localhost

# Core Services (defaults shown for clarity)
POSTGRES_ENABLED=true
HASURA_ENABLED=true
AUTH_ENABLED=true
STORAGE_ENABLED=true

# Database
POSTGRES_DB=myapp
POSTGRES_PASSWORD=dev-password-only

# Hasura
HASURA_GRAPHQL_ADMIN_SECRET=development-admin-secret-minimum-32-chars
HASURA_JWT_KEY=development-jwt-key-minimum-32-characters
HASURA_JWT_TYPE=HS256

# Optional Services
NSELF_ADMIN_ENABLED=true
REDIS_ENABLED=true
MAILPIT_ENABLED=true
SEARCH_ENABLED=true
SEARCH_ENGINE=meilisearch

# Custom Services
SERVICES_ENABLED=true
CS_1=api:express:4000:api
CS_2=worker:python:4001

# Frontend Apps
FRONTEND_APP_COUNT=2
FRONTEND_APP_1_DISPLAY_NAME=Admin Portal
FRONTEND_APP_1_PORT=3001
FRONTEND_APP_1_ROUTE=admin
FRONTEND_APP_2_DISPLAY_NAME=Customer App
FRONTEND_APP_2_PORT=3002
FRONTEND_APP_2_ROUTE=app

# Backups
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
```

### Production Environment

```bash
# Core Configuration
ENV=prod
PROJECT_NAME=my-awesome-app
BASE_DOMAIN=myapp.com
ADMIN_EMAIL=ops@myapp.com

# Security (use strong secrets!)
HASURA_GRAPHQL_ADMIN_SECRET=<generate-strong-64-char-secret>
HASURA_JWT_KEY=<generate-strong-64-char-secret>
HASURA_GRAPHQL_ENABLE_CONSOLE=false
HASURA_GRAPHQL_DEV_MODE=false
HASURA_GRAPHQL_CORS_DOMAIN=https://myapp.com,https://api.myapp.com

# Storage
MINIO_ROOT_PASSWORD=<strong-password>

# Email
EMAIL_PROVIDER=sendgrid
AUTH_SMTP_HOST=smtp.sendgrid.net
AUTH_SMTP_USER=apikey
AUTH_SMTP_PASS=<sendgrid-api-key>
AUTH_SMTP_SENDER=noreply@myapp.com

# Monitoring
MONITORING_ENABLED=true

# Backups
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=90
BACKUP_ENCRYPTION=true
BACKUP_CLOUD_PROVIDER=s3
```

---

## Troubleshooting

### Common Issues

1. **Services not starting**: Check that required variables are set
2. **Port conflicts**: Ensure all ports are unique
3. **Authentication failures**: Verify secret lengths (32+ chars)
4. **Storage issues**: Check MINIO_ROOT_PASSWORD is 8+ chars
5. **Frontend routing issues**: Ensure PORT is set for each app

### Debug Commands

```bash
# Check loaded environment
cat .env.dev

# Verify service status
docker-compose ps

# Check logs
docker-compose logs <service-name>

# Test environment cascade
echo $PROJECT_NAME
```

---

## Additional Resources

- [nself Environment Variable Specification v1.0](../nself-env-spec.md)
- [nself-cli Documentation](https://github.com/nself/cli)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Hasura Environment Variables](https://hasura.io/docs/latest/deployment/graphql-engine-flags/reference/)

---

_Last Updated: 2025-01-05_
_Spec Version: 1.0.0_
