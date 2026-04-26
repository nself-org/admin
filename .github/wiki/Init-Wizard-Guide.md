# Init Wizard Complete Guide

The nself Admin Init Wizard is a 6-step configuration tool that guides you through setting up your entire development stack. This full guide covers every field, option, and best practice.

## Table of Contents

- [Overview](#overview)
- [Step 1: Project Setup](#step-1-project-setup)
- [Step 2: Required Services](#step-2-required-services)
- [Step 3: Optional Services](#step-3-optional-services)
- [Step 4: Custom Services](#step-4-custom-services)
- [Step 5: Frontend Applications](#step-5-frontend-applications)
- [Step 6: Review & Build](#step-6-review--build)
- [Advanced Configuration](#advanced-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The Init Wizard transforms a blank directory into a fully configured development stack with:

- Core infrastructure (PostgreSQL, Hasura, Auth, Nginx)
- Optional services (Redis, Storage, Monitoring, etc.)
- Custom microservices (40+ framework templates)
- Frontend applications with automatic routing
- Environment-specific configurations

### Prerequisites

- Docker Desktop installed and running
- 4GB+ available RAM
- Port 3021 available (for nAdmin UI)
- An empty or nself-compatible project directory

## Step 1: Project Setup

The foundation of your stack configuration.

### Project Name

**Field**: Text input 
**Default**: `my_project` 
**Validation**: Lowercase alphanumeric with underscores 
**Impact**: Used for Docker container prefixes and database names

**Best Practices**:

- Use descriptive names: `ecommerce_api`, `blog_platform`
- Keep it short (under 20 characters)
- Avoid special characters

**Example Values**:

- ✅ `my_app`, `todo_api`, `shop_backend`
- ❌ `My-App`, `todo.api`, `shop backend`

### Environment

**Field**: Dropdown 
**Options**: Development, Staging, Production 
**Default**: Development 
**Impact**: Determines security settings, performance tuning, and default passwords

**Environment Differences**:

| Setting | Development | Staging | Production |
| ----------------- | ----------- | ----------- | --------------- |
| Debug Logs | Enabled | Enabled | Disabled |
| Default Passwords | Allowed | Warning | Required Change |
| SSL | Optional | Recommended | Required |
| Monitoring | Basic | Full | Full + Alerts |
| Backups | Optional | Daily | Hourly |

### Domain/Host

**Field**: Text input 
**Default**: `localhost` (dev), actual domain (staging/prod) 
**Examples**: `localhost`, `dev.myapp.com`, `api.production.com` 
**Impact**: Used for nginx routing and CORS configuration

**Configuration by Environment**:

- **Development**: Usually `localhost` or `*.local`
- **Staging**: Subdomain like `staging.myapp.com`
- **Production**: Your actual domain `api.myapp.com`

### Admin Email

**Field**: Email input 
**Validation**: Valid email format 
**Default**: `admin@nself.local` 
**Impact**: Used for Let's Encrypt SSL, admin notifications, and initial admin account

**Important Notes**:

- Required for production SSL certificates
- Receives monitoring alerts and backup notifications
- Can be changed later in settings

### Database Configuration

#### Database Name

**Field**: Text input 
**Default**: `nself` 
**Validation**: PostgreSQL naming rules 
**Impact**: Main database for all services

**Naming Conventions**:

- Use lowercase
- Separate words with underscores
- Match your project name for clarity

#### Database Password

**Field**: Password input 
**Default**: `nself-dev-password` (dev only) 
**Validation**:

- Dev: Minimum 3 characters
- Production: 12+ chars, mixed case, numbers, symbols

**Security Guidelines**:

- **Development**: Default password acceptable
- **Staging**: Use strong password
- **Production**: Use password manager, rotate regularly

**Password Requirements by Environment**:

```
Development: min 3 characters
Staging:     min 8 characters, mixed case
Production:  min 12 characters, mixed case, numbers, symbols
```

## Step 2: Required Services

Core services that are always enabled. These can be configured but not disabled.

### PostgreSQL Database

**Always Enabled**: Primary database for all services

**Configuration Options**:

- **Version**: 14, 15, 16 (default: 15)
- **Port**: Default 5432 (usually unchanged)
- **Max Connections**: 100 (default), increase for high load
- **Shared Buffers**: Auto-calculated based on RAM

**Advanced Settings** (via Configure button):

```yaml
Memory Settings:
  - shared_buffers: 256MB (default)
  - work_mem: 4MB
  - maintenance_work_mem: 64MB

Performance:
  - max_connections: 100
  - checkpoint_segments: 32
  - checkpoint_completion_target: 0.9

Backup:
  - Enable automated backups: Yes/No
  - Backup schedule: Daily 2 AM
  - Retention: 7 days
```

### Hasura GraphQL Engine

**Always Enabled**: Instant GraphQL API for your database

**Configuration Options**:

- **Admin Secret**: Auto-generated secure token
- **Console Enabled**: Yes (dev), No (production)
- **Dev Mode**: Enabled (dev), Disabled (production)
- **Unauthorized Role**: `public` (default)

**Key Settings**:

```yaml
Performance:
  - Connection Pool Size: 50
  - Timeout: 180 seconds
  - Max Queries: 100/minute

Features:
  - Enable Migrations: Yes
  - Enable Allow List: No (dev), Yes (prod)
  - Enable Telemetry: No
  - CORS Domain: * (dev), specific (prod)
```

### Authentication Service

**Always Enabled**: JWT-based authentication

**Configuration Options**:

- **JWT Secret**: Auto-generated 32-char key
- **JWT Expiry**: 15 minutes (default)
- **Refresh Token Expiry**: 30 days
- **Email Verification**: Optional (dev), Required (prod)

**Provider Settings**:

```yaml
Local Auth:
  - Enable Registration: Yes
  - Require Email Verification: No (dev), Yes (prod)
  - Password Requirements: Configurable

OAuth Providers (optional):
  - Google: Client ID, Secret
  - GitHub: Client ID, Secret
  - Facebook: App ID, Secret
```

### Nginx Reverse Proxy

**Always Enabled**: Routes all traffic, handles SSL

**Configuration Options**:

- **HTTP Port**: 80 (default)
- **HTTPS Port**: 443 (default)
- **SSL Mode**: None (dev), Let's Encrypt (prod)
- **Client Max Body Size**: 100M (default)

**Routing Rules** (auto-configured):

- `/` → Frontend apps
- `/api` → Custom services
- `/graphql` → Hasura
- `/auth` → Authentication service

## Step 3: Optional Services

Enable additional services based on your needs.

### Redis Cache

**Purpose**: High-performance caching and pub/sub 
**When to Enable**:

- Need caching layer
- Real-time features (chat, notifications)
- Session storage
- Job queues (with BullMQ)

**Configuration**:

```yaml
Mode: Standalone (default) or Cluster
Max Memory: 512MB (default)
Eviction Policy: allkeys-lru
Persistence: RDB snapshots
Password: Auto-generated
```

### Storage (MinIO)

**Purpose**: S3-compatible object storage 
**When to Enable**:

- File uploads
- Image/video storage
- Backup storage
- Static asset hosting

**Configuration**:

```yaml
Access Key: minioadmin (change in production)
Secret Key: minioadmin-password (change in production)
Default Bucket: uploads
Public Bucket: public-assets
Region: us-east-1
Console Port: 9001
```

### Search (MeiliSearch)

**Purpose**: Lightning-fast search engine 
**When to Enable**:

- Full-text search
- Faceted search
- Typo tolerance needed
- Instant search UI

**Configuration**:

```yaml
Master Key: Auto-generated 32-char
Environment: development or production
Max Index Size: 100GB
Max Payload: 100MB
```

### Email (Mailpit)

**Purpose**: Email testing in development 
**When to Enable**:

- Testing email flows
- Debugging email templates
- Capturing sent emails

**Configuration**:

```yaml
SMTP Port: 1025
Web UI Port: 8025
Max Messages: 500
Auth: None (dev only)
```

### MLflow

**Purpose**: ML experiment tracking 
**When to Enable**:

- Machine learning projects
- Model versioning
- Experiment tracking
- Model registry needed

**Configuration**:

```yaml
Backend Store: postgresql
Artifact Store: minio
Default Experiment: 0
Port: 5000
```

### Monitoring Stack

**Purpose**: Complete observability solution 
**When to Enable**:

- Production deployments
- Need metrics and alerting
- Log aggregation required
- Distributed tracing

**Included Services** (8 total):

1. **Prometheus** - Metrics collection
2. **Grafana** - Visualization dashboards
3. **Loki** - Log aggregation
4. **Tempo** - Distributed tracing
5. **Alertmanager** - Alert routing
6. **Node Exporter** - Host metrics
7. **PostgreSQL Exporter** - Database metrics
8. **cAdvisor** - Container metrics

**Default Dashboards**:

- System Overview
- Container Metrics
- PostgreSQL Performance
- API Response Times
- Error Rates

### Automated Backups

**Purpose**: Scheduled backup system 
**When to Enable**:

- Production data
- Important development work
- Compliance requirements

**Configuration**:

```yaml
Schedule:
  Frequency: Daily (default), Weekly, Monthly, Custom Cron
  Time: 02:00 AM

What to Backup:
  - Database: Yes
  - Uploaded Files: Yes
  - Configuration: Yes

Options:
  Compression: Enabled
  Encryption: Enabled (production)
  Retention: 7 days (default)
  Storage: Local or S3
```

## Step 4: Custom Services

Add your own microservices and APIs with 40+ pre-configured templates.

### Service Configuration

#### Service Name

**Field**: Text input 
**Validation**: Lowercase, alphanumeric, underscores 
**Examples**: `api_gateway`, `payment_service`, `worker_queue`

#### Framework Selection

**Field**: Dropdown with 40+ options

**JavaScript/TypeScript Options**:
| Framework | Performance | Use Case |
|-----------|------------|----------|
| Node.js | ⭐⭐⭐⭐⭐ | Raw HTTP server |
| Express | ⭐⭐⭐⭐ | Traditional REST APIs |
| Fastify | ⭐⭐⭐⭐⭐⭐ | High-performance APIs |
| NestJS | ⭐⭐⭐ | Enterprise applications |
| Hono | ⭐⭐⭐⭐⭐⭐⭐ | Edge computing |
| Socket.IO | ⭐⭐⭐⭐ | Real-time features |
| BullMQ | ⭐⭐⭐⭐⭐ | Job queues |
| Temporal | ⭐⭐⭐⭐ | Workflow orchestration |
| Bun | ⭐⭐⭐⭐⭐⭐⭐ | All-in-one runtime |
| Deno | ⭐⭐⭐⭐⭐⭐ | Secure runtime |
| tRPC | ⭐⭐⭐⭐⭐ | Type-safe RPC |

**Python Options**:
| Framework | Performance | Use Case |
|-----------|------------|----------|
| Flask | ⭐⭐ | Simple APIs |
| FastAPI | ⭐⭐⭐⭐ | Modern async APIs |
| Django REST | ⭐⭐ | Full-featured APIs |
| Celery | ⭐⭐⭐ | Task queues |
| Ray | ⭐⭐⭐⭐ | Distributed compute |

**Python Agent Templates**:

- **Agent Analytics**: Pandas, Polars, Plotly, Streamlit
- **Agent LLM**: LangChain, RAG, Vector stores
- **Agent TimeSeries**: TimescaleDB, Prophet, Anomaly detection
- **Agent Vision**: YOLOv8, CLIP, OCR, Segmentation
- **Agent Training**: PyTorch Lightning, MLFlow, Optuna

**Go Options**:
| Framework | Performance | Use Case |
|-----------|------------|----------|
| Gin | ⭐⭐⭐⭐⭐⭐⭐⭐ | Fast REST APIs |
| Fiber | ⭐⭐⭐⭐⭐⭐⭐⭐⭐ | Express-like APIs |
| Echo | ⭐⭐⭐⭐⭐⭐⭐⭐ | Minimalist APIs |
| gRPC | ⭐⭐⭐⭐⭐⭐⭐⭐⭐ | Microservices |

**Other Languages**:

- **Ruby**: Rails API, Sinatra
- **Rust**: Actix Web (⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐)
- **Java**: Spring Boot
- **Kotlin**: Ktor
- **Elixir**: Phoenix
- **C#**: ASP.NET Core
- **PHP**: Laravel
- **Swift**: Vapor
- **C++**: Oat++
- **Lua**: Lapis
- **Zig**: Zap

#### Port Configuration

**Field**: Number input 
**Range**: 1024-65535 
**Default**: 4001+ (auto-incremented) 
**Reserved Ports**:

- 5432: PostgreSQL
- 8080: Hasura
- 4000: Auth
- 80/443: Nginx
- 6379: Redis
- 9000/9001: MinIO
- 3000: Grafana
- 9090: Prometheus

#### Route Configuration

**Field**: Text input (optional) 
**Purpose**: External API endpoint 
**Examples**:

- Empty: Internal-only service (workers, queues)
- `api`: Creates api.yourdomain.com
- `webhook`: Creates webhook.yourdomain.com
- `graphql.external.com`: Uses exact domain

**Routing Rules**:

- No route = internal-only service
- Single word = subdomain.basedomain
- Full domain = used as-is

### Template Features

Each framework template includes:

**Project Structure**:

```
service/
├── Dockerfile        # Optimized multi-stage build
├── package.json     # Dependencies and scripts
├── src/
│   ├── index.ts    # Entry point
│   ├── routes/     # API routes
│   ├── models/     # Data models
│   └── utils/      # Helpers
├── tests/          # Test files
└── .env.example    # Environment template
```

**Pre-configured Features**:

- Health check endpoint (`/health`)
- Graceful shutdown handling
- Environment variable management
- Logging configuration
- Error handling middleware
- CORS setup
- Database connection (if needed)
- Hot reload in development

## Step 5: Frontend Applications

Configure external frontend applications that consume your backend.

### Application Settings

#### Display Name

**Field**: Text input 
**Example**: "Admin Dashboard", "Customer Portal" 
**Purpose**: Human-readable name for the UI

#### System Name

**Field**: Text input 
**Auto-generated**: From display name 
**Validation**: Lowercase, underscores 
**Example**: `admin_dashboard`

#### Table Prefix

**Field**: Text input (3-4 chars) 
**Purpose**: Database table namespacing 
**Example**: `adm_` for admin tables 
**Impact**: All Hasura tables for this app will be prefixed

#### Local Port

**Field**: Number input 
**Range**: 3000-9999 
**Default**: 3001+ (auto-incremented) 
**Purpose**: Development server port

### URL Configuration

#### Development URL

**Field**: Smart URL input 
**Examples**:

- `admin` → admin.localhost
- `app` → app.localhost
- Empty → No external route

#### Production URL

**Field**: Smart URL input 
**Examples**:

- `admin` → admin.yourdomain.com
- `app.external.com` → Exact domain
- Empty → No external route

### GraphQL Remote Schema

#### Custom GraphQL Endpoint

**Field**: URL input (optional) 
**Purpose**: Add frontend's GraphQL to Hasura 
**Example**: `api` → api.localhost/graphql

**Benefits**:

- Unified GraphQL endpoint
- Cross-service queries
- Shared authentication

### Auto-Generated Configuration

For each frontend app, nAdmin creates:

**Nginx Routes**:

```nginx
# Development
localhost:3001 → admin.localhost

# Production
localhost:3001 → admin.yourdomain.com
```

**Hasura Remote Schema**:

```yaml
name: admin_schema
url: http://admin:3001/graphql
headers:
  X-Hasura-Admin-Secret: <from-env>
```

**Environment Variables**:

```bash
FRONTEND_APP_1_NAME=admin_dashboard
FRONTEND_APP_1_PORT=3001
FRONTEND_APP_1_URL=admin.localhost
FRONTEND_APP_1_TABLE_PREFIX=adm
```

## Step 6: Review & Build

Final validation and stack generation.

### Validation Checks

**Automatic Fixes**:

- Port conflicts resolved
- Missing credentials generated
- Required services enabled
- Database URLs constructed

**Warning Checks**:

- Default passwords in production
- Missing SSL configuration
- No backup configuration
- Insufficient resources

**Error Checks**:

- Invalid service names
- Port conflicts that can't be resolved
- Circular dependencies
- Missing required fields

### Configuration Summary

**Displays**:

- Total services count
- Core services (4)
- Optional services (enabled count)
- Custom services (user added)
- Frontend apps (configured)

### Build Process

**What Happens**:

1. Validates all configuration
2. Generates docker-compose.yml
3. Creates service directories
4. Generates .env files
5. Sets up nginx routing
6. Initializes databases
7. Configures monitoring

**Generated Files**:

```
project/
├── docker-compose.yml       # Main orchestration
├── .env.development        # Dev environment
├── .env.staging           # Staging environment
├── .env.production        # Production environment
├── nginx/
│   └── default.conf       # Routing configuration
├── hasura/
│   └── metadata/         # GraphQL configuration
└── services/
    └── [your-services]/   # Custom service code
```

## Advanced Configuration

### Multi-Environment Setup

**Managing Multiple Environments**:

```bash
# Development
.env.development → docker-compose.yml

# Staging
.env.staging → docker-compose.staging.yml

# Production
.env.production → docker-compose.production.yml
```

### Secret Management

**Best Practices**:

- Never commit .env files
- Use Docker secrets in production
- Rotate credentials regularly
- Use strong passwords

**Secret Storage Options**:

- Environment variables
- Docker secrets
- Kubernetes secrets
- HashiCorp Vault

### Performance Tuning

**Resource Allocation**:

```yaml
PostgreSQL:
  Memory: 2GB minimum
  CPU: 2 cores recommended

Hasura:
  Memory: 512MB minimum
  CPU: 1 core

Custom Services:
  Memory: 256MB per service
  CPU: 0.5 cores per service
```

### Backup Strategies

**Recommended Schedule**:

- **Development**: Weekly
- **Staging**: Daily
- **Production**: Hourly + transaction logs

**Backup Locations**:

- Local: /backups directory
- S3: Configured bucket
- External: Custom script

## Troubleshooting

### Common Issues

**Port Already in Use**:

```bash
Error: Port 5432 is already in use
Solution: Stop existing PostgreSQL or change port
```

**Insufficient Memory**:

```bash
Error: Cannot allocate memory
Solution: Increase Docker memory to 4GB+
```

**Build Fails**:

```bash
Error: Service 'x' failed to build
Solution: Check Docker logs, ensure Docker is running
```

### Reset Options

**Start Fresh**:

- Click "Start Fresh" to reset wizard
- Preserves no configuration

**Edit Existing**:

- Click "Edit Existing" to modify
- Loads current configuration

### Getting Help

**Resources**:

- [FAQ](FAQ)
- [Common Issues](Troubleshooting)
- [GitHub Issues](https://github.com/nself-org/admin/issues)
- [community at chat.nself.org](https://chat.nself.org)

## Next Steps

After completing the wizard:

1. **[Build Process](Build-Process)** - Understanding the build
2. **[Start Services](Start-Services)** - Launching your stack
3. **[Dashboard](Dashboard-Overview)** - Monitoring services
4. **[Database Management](Database-Management)** - Managing data

---

**Related Documentation**:

- [Quick Start Guide](Quick-Start)
- [Service Configuration](Service-Configuration)
- [Custom Services](Custom-Services)
- [Frontend Apps](Frontend-Apps)
