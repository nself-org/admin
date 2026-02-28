# nself-admin Setup Wizard Guide

## Overview

The nself-admin Setup Wizard is a 6-step guided process that helps you configure your nself backend project. This guide provides detailed information about each step, configuration options, and best practices.

## Table of Contents

1. [Wizard Overview](#wizard-overview)
2. [Step 1: Basic Settings](#step-1-basic-settings)
3. [Step 2: Core Services](#step-2-core-services)
4. [Step 3: Optional Services](#step-3-optional-services)
5. [Step 4: Custom Services](#step-4-custom-services)
6. [Step 5: Frontend Applications](#step-5-frontend-applications)
7. [Step 6: Review & Build](#step-6-review--build)
8. [Auto-Save Feature](#auto-save-feature)
9. [Environment File Management](#environment-file-management)
10. [Common Configurations](#common-configurations)
11. [Troubleshooting](#troubleshooting)

---

## Wizard Overview

### Features

- **6-step guided setup** with progress tracking
- **Auto-save** to environment files
- **Validation** of inputs and configurations
- **Smart defaults** based on environment
- **Backwards navigation** to modify previous steps
- **Real-time preview** of configuration

### Navigation

- Use **Next** to proceed to the next step
- Use **Back** to return to previous steps
- Click on **completed step indicators** to jump directly
- Changes are **automatically saved** as you type

### File Output

The wizard writes configuration to environment-specific files:

- Development: `.env.dev`
- Staging: `.env.staging`
- Production: `.env.prod`

---

## Step 1: Basic Settings

Configure fundamental project settings and metadata.

### Fields

#### Project Name (Required)

- **Format**: Lowercase alphanumeric with dashes
- **Example**: `my-awesome-app`
- **Validation**: Must be provided, no spaces allowed
- **Used for**: Docker container names, service identification

#### Project Description (Optional)

- **Format**: Free text
- **Example**: `Multi-tenant SaaS platform for task management`
- **Used for**: Documentation and admin UI display

#### Environment (Required)

- **Options**:
  - `development` (dev) - Local development
  - `staging` - Testing environment
  - `production` (prod) - Live environment
- **Default**: `development`
- **Impact**: Determines which `.env.*` file to write to

#### Base Domain (Required)

- **Format**: Valid domain name
- **Default**: `localhost` (dev) or `local.nself.org`
- **Examples**:
  - Development: `localhost`, `myapp.local`
  - Production: `myapp.com`, `api.example.com`
- **Validation**:
  - Dev mode: Allows subdomains like `api.test`
  - Production: Must be valid FQDN

#### Database Name (Required)

- **Format**: Lowercase alphanumeric with underscores
- **Default**: `nself`
- **Example**: `myapp_db`
- **Used for**: PostgreSQL database name

#### Database Password (Required)

- **Default**: `nself-dev-password` (dev only)
- **Requirements**:
  - Development: Minimum 3 characters
  - Production: Minimum 12 characters, mixed case, numbers, special chars
- **Security**: Never commit production passwords to git

#### Admin Email (Optional)

- **Format**: Valid email address
- **Example**: `admin@mycompany.com`
- **Used for**: System notifications, initial admin account

### Automated Backups Card

Configure database backup settings with visual schedule builder.

#### Enable/Disable

- Toggle to enable automated backups
- When disabled, no backup configuration is saved

#### Schedule Options

**Quick Presets:**

- Daily at 2 AM
- Every 6 hours
- Weekly (Sunday)
- Custom (opens advanced settings)

**Advanced Settings:**

- Visual cron builder with dropdowns
- Minute, Hour, Day, Month, Weekday selection
- Live preview of cron expression
- Next run time calculation

#### Retention Period

- **Range**: 1-365 days
- **Default**: 7 days
- **Recommendation**: 30 days for production

#### Additional Options

- **Compression**: Reduce backup size (recommended)
- **Encryption**: Secure backups with encryption

### Best Practices

1. **Project Name**: Use consistent naming across environments
2. **Passwords**: Use strong, unique passwords for each environment
3. **Domain**: Use `.local` or `.test` TLDs for development
4. **Backups**: Always enable for production, consider for staging

---

## Step 2: Core Services

View and configure the required services that form the foundation of your nself stack.

### Services

#### PostgreSQL (Required)

- **Description**: Primary database for all services
- **Port**: 5432
- **Configuration Options**:
  - Version (default: 16-alpine)
  - Extensions (uuid-ossp, pgcrypto, etc.)
  - Connection pool settings
  - Performance tuning

#### Hasura GraphQL (Required)

- **Description**: Instant GraphQL API for your database
- **Port**: 8080 (API), 3000 (Console)
- **Configuration Options**:
  - Admin secret (min 32 chars)
  - JWT configuration
  - CORS settings
  - Dev mode toggle
  - Console access

#### Hasura Auth (Required)

- **Description**: User authentication and authorization
- **Port**: 4000
- **Configuration Options**:
  - Token expiration times
  - Email verification
  - Social auth providers
  - WebAuthn support

#### Nginx (Required)

- **Description**: Reverse proxy and load balancer
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Configuration Options**:
  - SSL certificates
  - Rate limiting
  - Gzip compression
  - Client max body size

### Configuration Modal

Click "Configure" on any service to open advanced settings:

- Service-specific environment variables
- Performance tuning options
- Security configurations
- Integration settings

### Note

These services are always enabled and cannot be disabled as they form the core of the nself stack.

---

## Step 3: Optional Services

Enable additional services to enhance your stack's capabilities.

### Available Services

#### Storage Service (MinIO)

- **Description**: S3-compatible object storage
- **Default**: Enabled (recommended)
- **Ports**: 9000 (API), 9001 (Console)
- **Use Cases**: File uploads, static assets, backups
- **Configuration**:
  - Root credentials
  - Default bucket name
  - Region settings

#### Redis Cache

- **Description**: In-memory data store for caching
- **Default**: Disabled
- **Port**: 6379
- **Use Cases**: Session storage, caching, pub/sub
- **Configuration**:
  - Password protection
  - Persistence settings
  - Memory limits

#### nself Admin UI (This tool)

- **Description**: Web-based administration interface
- **Default**: Disabled
- **Port**: 3100
- **Use Cases**: Project management, monitoring, configuration
- **Note**: Automatically enabled when using the wizard

#### Email Service (Mailpit)

- **Description**: Email capture for development
- **Default**: Disabled (enabled for dev)
- **Ports**: 1025 (SMTP), 8025 (Web UI)
- **Use Cases**: Email testing, debugging
- **Production**: Switches to real email provider

#### Search Services

- **Description**: Full-text search with 6 engine options
- **Default**: Disabled
- **Options**:
  - **Meilisearch** (recommended) - Fast, typo-tolerant
  - **Typesense** - High performance alternative
  - **Zinc** - Lightweight Elasticsearch alternative
  - **Elasticsearch** - Industry standard
  - **OpenSearch** - AWS fork of Elasticsearch
  - **Sonic** - Ultra-lightweight

#### Monitoring Bundle

- **Description**: Complete observability stack
- **Default**: Disabled
- **Includes**:
  - **Prometheus** - Metrics collection
  - **Grafana** - Visualization dashboards
  - **Loki** - Log aggregation
  - **Tempo** - Distributed tracing
  - **cAdvisor** - Container metrics
- **Note**: Enabling this sets all monitoring services

### Toggle All

Use the subtle "Enable All" / "Disable All" button in the top-right to quickly toggle all optional services.

### Service Cards

Each service card shows:

- Service name and icon
- Brief description
- Detailed explanation on hover/focus
- Enable/disable toggle
- Configure button (if applicable)

---

## Step 4: Custom Services

Add your own backend services that run as part of the Docker stack.

### Service Configuration

#### Service Name (Required)

- **Format**: Lowercase alphanumeric with dashes
- **Example**: `api-gateway`, `worker-service`
- **Used for**: Container naming, logging

#### Framework/Language (Required)

- **Dropdown Options**:
  - Node.js: `express`, `fastify`, `nestjs`, `hono`
  - Python: `fastapi`, `django`, `flask`
  - Go: `gin`, `fiber`, `echo`
  - Ruby: `rails`, `sinatra`
  - Java: `spring`, `quarkus`
  - PHP: `laravel`, `symfony`
  - Rust: `actix`, `rocket`
  - Other: `custom`
- **Impact**: Determines Docker image and setup

#### Port (Required)

- **Range**: 3000-9999
- **Default**: 4000, 4001, 4002 (auto-increments)
- **Validation**: Must be unique across all services
- **Reserved Ports**: See [Port Allocation](#port-allocation)

#### URL Route (Optional)

- **Format**: Lowercase alphanumeric with dashes
- **Example**: `api`, `webhooks`, `admin-api`
- **Result**:
  - Dev: `api.localhost`
  - Prod: `api.yourdomain.com`

### Advanced Options

Available after service creation:

- **Memory Limit**: `256M`, `512M`, `1G`, etc.
- **CPU Limit**: `0.25`, `0.5`, `1.0`, etc.
- **Replicas**: Number of instances
- **Health Check**: Endpoint for health monitoring
- **Table Prefix**: Database table namespace
- **Public Access**: Expose to internet
- **Rate Limiting**: Request limits

### Service Management

- **Add Service**: Click "Add Custom Service" button
- **Remove Service**: Click trash icon on service card
- **Reorder**: Services are numbered CS_1, CS_2, etc.
- **Auto-save**: Configuration saves as you type

### Example Services

```
1. API Gateway
   - Framework: Express
   - Port: 4000
   - Route: api

2. Background Worker
   - Framework: Python
   - Port: 4001
   - No route (internal only)

3. WebSocket Server
   - Framework: Socket.io
   - Port: 4002
   - Route: ws
```

---

## Step 5: Frontend Applications

Configure external frontend applications that will consume your backend services.

### Application Fields

#### Display Name (Editable Title)

- **Format**: Free text
- **Example**: `Admin Dashboard`
- **Default**: `App 1`, `App 2`, etc.
- **Used for**: UI display, documentation

#### System Name (Required)

- **Format**: Lowercase, underscores, no spaces
- **Example**: `admin_dashboard`
- **Auto-generated**: From display name
- **Used for**: Internal references, configurations

#### Table Prefix (Optional)

- **Format**: Lowercase, underscores, ends with underscore
- **Example**: `admin_`, `customer_`
- **Used for**: Database table namespacing
- **Purpose**: Enables multi-tenant schemas

#### Local Port (Required) ⚠️

- **Format**: Number 3000-9999
- **Example**: `3001`, `3002`
- **Auto-increment**: Starts at 3001
- **Critical**: Required for nginx routing
- **Validation**: Must be unique

#### Production URL (Optional)

- **Format**: Subdomain or full domain
- **Examples**:
  - Dev: `admin` → `admin.localhost`
  - Prod: `admin.myapp.com`
- **Used for**: Nginx routing configuration

#### GraphQL Endpoint (Optional)

- **Format**: Valid URL
- **Example**: `http://localhost:4001/graphql`
- **Used for**: Hasura remote schema integration
- **Auto-generates**: Schema name from table prefix

### Port Allocation

Frontend apps must use unique ports. Reserved ranges:

- **3000**: Reserved for Hasura Console
- **3001-3099**: Frontend applications
- **3100**: nself-admin
- **4000-4999**: Custom services
- **5432**: PostgreSQL
- **6379**: Redis
- **8080**: Hasura API
- **9000-9001**: MinIO

### Multi-Tenant Architecture

Using table prefixes enables multi-tenant database schemas:

```
Admin App (prefix: admin_)
├── admin_users
├── admin_settings
└── admin_logs

Customer App (prefix: customer_)
├── customer_accounts
├── customer_orders
└── customer_profiles
```

### Hasura Integration

Frontend apps can expose GraphQL schemas to Hasura:

1. **Provide GraphQL endpoint** in the app configuration
2. **Schema name** auto-generates from table prefix
3. **Hasura** adds as remote schema
4. **Result**: Unified GraphQL API

### Example Configuration

```
App 1: Admin Dashboard
- System Name: admin_dashboard
- Table Prefix: admin_
- Port: 3001
- Route: admin
- GraphQL: http://localhost:4001/graphql

App 2: Customer Portal
- System Name: customer_portal
- Table Prefix: customer_
- Port: 3002
- Route: portal
- GraphQL: http://localhost:4002/graphql
```

---

## Step 6: Review & Build

Review your complete configuration and initiate the build process.

### Configuration Summary

The review page displays:

#### Project Details

- Project name and description
- Environment setting
- Domain configuration
- Database configuration

#### Services Configuration

- **Core Services** (always enabled):
  - PostgreSQL Database
  - Hasura GraphQL
  - Authentication Service
  - Nginx Proxy
- **Optional Services** (if enabled):
  - Storage (MinIO)
  - Redis Cache
  - nself Admin UI
  - Email Service
  - Search Engine
  - Monitoring Stack

#### Custom Services Count

- Number of custom services configured
- Service details (name, framework, port, route)

#### Frontend Applications Count

- Number of frontend apps configured
- App details (name, port, route)

#### Total Services

- Combined count of all services to be built
- Visual indicator of stack complexity

### Actions

#### Back Button

- Return to previous step to make changes
- All configurations are preserved

#### Build Project Button

- **Color**: Green (indicates readiness)
- **Icon**: Hammer icon
- **Action**: Redirects to `/build?from=wizard`
- **Process**:
  1. Saves final configuration
  2. Navigates to build page
  3. Initiates `nself build` command
  4. Shows real-time build progress

### Build Process

After clicking "Build Project":

1. **Configuration Validation**
   - Checks all required fields
   - Validates port uniqueness
   - Ensures secret strength

2. **File Generation**
   - Creates docker-compose.yml
   - Generates nginx configuration
   - Sets up service configs

3. **Container Building**
   - Pulls required images
   - Builds custom services
   - Sets up networks

4. **Completion**
   - Shows success message
   - Provides next steps
   - Option to start services

---

## Auto-Save Feature

The wizard automatically saves your configuration as you type.

### How It Works

1. **Debounced Saving**: Waits 1 second after you stop typing
2. **Field Detection**: Saves only changed fields
3. **Visual Feedback**: "Auto-saving..." indicator
4. **Environment Aware**: Saves to correct `.env.*` file

### Saved Locations

Based on your environment selection:

- **Development**: `.env.dev`
- **Staging**: `.env.staging`
- **Production**: `.env.prod`

### Benefits

- **Never lose work**: Changes persist immediately
- **Resume anytime**: Close and reopen without data loss
- **Team sharing**: `.env.dev` can be committed to git
- **Quick iteration**: Make changes without manual saves

### What Gets Saved

- All form inputs
- Service enable/disable states
- Advanced configurations
- Custom service definitions
- Frontend app settings

---

## Environment File Management

Understanding how the wizard manages environment files.

### File Hierarchy

```
project/
├── .env.dev         # Team defaults (commit to git)
├── .env.staging     # Staging config (commit to git)
├── .env.prod        # Production config (commit to git)
├── .env.secrets     # Production secrets (never commit)
└── .env            # Local overrides (never commit)
```

### Loading Order

Files load in priority order (later overrides earlier):

1. `.env.dev`
2. `.env.staging` (if ENV=staging)
3. `.env.prod` (if ENV=prod)
4. `.env.secrets` (if ENV=prod)
5. `.env` (highest priority)

### Best Practices

#### DO Commit

- `.env.dev` - Team development defaults
- `.env.staging` - Staging configuration
- `.env.prod` - Production config (no secrets)

#### DON'T Commit

- `.env` - Personal overrides
- `.env.secrets` - Production secrets
- Any file with passwords/keys

### Variable Naming

The wizard follows nself's official naming conventions:

- Service flags: `*_ENABLED`
- Frontend apps: `FRONTEND_APP_N_*`
- Custom services: `CS_N`
- Backup: `BACKUP_*` (not DB*BACKUP*\*)

---

## Common Configurations

### Simple Development Setup

```bash
# Step 1: Basic Settings
PROJECT_NAME=my-app
ENV=dev
BASE_DOMAIN=localhost

# Step 3: Optional Services
REDIS_ENABLED=true
MAILPIT_ENABLED=true

# Result: Basic stack with caching and email
```

### Full Development Stack

```bash
# All optional services enabled
STORAGE_ENABLED=true
REDIS_ENABLED=true
NSELF_ADMIN_ENABLED=true
MAILPIT_ENABLED=true
SEARCH_ENABLED=true
MONITORING_ENABLED=true

# Custom API service
CS_1=api:express:4000:api

# Frontend apps
FRONTEND_APP_1_PORT=3001
FRONTEND_APP_1_ROUTE=app
```

### Production Configuration

```bash
ENV=prod
BASE_DOMAIN=myapp.com

# Strong secrets (64+ chars)
HASURA_GRAPHQL_ADMIN_SECRET=<strong-secret>
HASURA_JWT_KEY=<strong-secret>

# Disable dev features
HASURA_GRAPHQL_ENABLE_CONSOLE=false
HASURA_GRAPHQL_DEV_MODE=false

# Production email
EMAIL_PROVIDER=sendgrid

# Enable backups
BACKUP_ENABLED=true
BACKUP_ENCRYPTION=true
```

### Multi-Tenant SaaS

```bash
# Multiple frontend apps with table isolation
FRONTEND_APP_1_DISPLAY_NAME=Admin Portal
FRONTEND_APP_1_TABLE_PREFIX=admin_
FRONTEND_APP_1_PORT=3001

FRONTEND_APP_2_DISPLAY_NAME=Customer App
FRONTEND_APP_2_TABLE_PREFIX=customer_
FRONTEND_APP_2_PORT=3002

FRONTEND_APP_3_DISPLAY_NAME=Partner Portal
FRONTEND_APP_3_TABLE_PREFIX=partner_
FRONTEND_APP_3_PORT=3003
```

---

## Troubleshooting

### Common Issues

#### "Auto-saving..." Stuck

- **Cause**: Network issue or server error
- **Fix**: Refresh page, changes are likely saved
- **Check**: Look for errors in browser console

#### Port Already in Use

- **Cause**: Port conflict with running service
- **Fix**: Choose different port or stop conflicting service
- **Check**: `lsof -i :PORT` to find process

#### Domain Validation Error

- **Cause**: Invalid format for environment
- **Fix**:
  - Dev: Use `localhost` or `.local` domains
  - Prod: Use valid FQDN

#### Build Fails

- **Cause**: Missing required configuration
- **Fix**: Review Step 6 for missing items
- **Check**: Ensure all secrets meet length requirements

#### Services Not Starting

- **Cause**: Configuration or dependency issues
- **Fix**:
  1. Check docker logs: `docker-compose logs [service]`
  2. Verify environment variables
  3. Ensure ports are available

### Reset Wizard

To start fresh:

1. Click "Reset Configuration" on any step
2. Confirm the reset action
3. Wizard runs:
   - `nself reset --force`
   - `nself init --full`
4. Returns to Step 1

### Manual Configuration

If the wizard isn't working:

1. Edit `.env.dev` directly
2. Run `nself build` manually
3. Check logs for errors

### Getting Help

1. **Documentation**: Check `/docs` folder
2. **Logs**: Review docker and service logs
3. **Support**: File issue on GitHub
4. **Community**: Join Discord/Slack

---

## Advanced Topics

### Custom Service Templates

Create reusable service templates:

1. Define service in `CS_N` format
2. Add memory/CPU limits
3. Configure health checks
4. Set up table prefixes

### Remote Schema Federation

Connect multiple GraphQL services:

1. Each frontend app exposes GraphQL
2. Hasura adds as remote schema
3. Single unified API endpoint
4. Cross-service queries enabled

### Multi-Environment Strategy

Managing multiple environments:

1. **Local**: `.env.dev` for development
2. **CI/CD**: `.env.staging` for testing
3. **Production**: `.env.prod` + `.env.secrets`
4. **Overrides**: `.env` for personal settings

### Performance Optimization

Optimize your stack:

1. **Redis**: Enable for caching
2. **Monitoring**: Track metrics
3. **Replicas**: Scale services horizontally
4. **Resources**: Set appropriate limits

---

## Next Steps

After completing the wizard:

1. **Build Project**: Click "Build Project" on Step 6
2. **Start Services**: Navigate to `/start` after build
3. **Access Services**:
   - Hasura Console: `http://localhost:3000`
   - nself Admin: `http://localhost:3100`
   - Your Apps: Configured ports
4. **Development**: Start coding your applications
5. **Monitoring**: Check service health and logs

---

_Last Updated: 2025-01-05_
_Wizard Version: 1.0.0_
