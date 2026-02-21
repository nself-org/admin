# nself-admin User Guide

Complete guide to using nself-admin for managing your self-hosted backend stack.

## Table of Contents

- [Getting Started](#getting-started)
- [Initial Setup](#initial-setup)
- [Dashboard Overview](#dashboard-overview)
- [Service Management](#service-management)
- [Database Operations](#database-operations)
- [Deployment Workflows](#deployment-workflows)
- [Monitoring & Logs](#monitoring--logs)
- [Configuration Management](#configuration-management)
- [Backup & Restore](#backup--restore)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

Before using nself-admin, ensure you have:

- Docker 20+ installed and running
- nself CLI installed (v0.4.4+)
- An existing nself project, or ready to create one
- 2GB RAM minimum
- 10GB disk space

### Launching nself-admin

**Option 1: Via nself CLI (Recommended)**

```bash
# Navigate to your nself project
cd /path/to/your/project

# Launch nself-admin
nself admin
```

This automatically starts nself-admin on port 3021 with the correct project path.

**Option 2: Direct Docker**

```bash
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:latest
```

**Option 3: Development Mode**

```bash
# Clone the repository
git clone https://github.com/nself-org/admin.git
cd nself-admin

# Install dependencies
pnpm install

# Start development server
PORT=3021 pnpm dev
```

### First-Time Access

1. Open your browser and navigate to `http://localhost:3021`
2. You'll be greeted with the login page
3. If this is your first time, click "Set up admin password"
4. Create a strong password (min 12 characters, uppercase, lowercase, number, special character)
5. Click "Create Password" to continue

---

## Initial Setup

### Setup Wizard (6 Steps)

If you're starting with an empty directory, nself-admin will guide you through a 6-step wizard:

#### Step 1: Project Basics

![Setup Step 1](screenshots/wizard-step1.png)

- **Project Name**: Choose a unique name (lowercase, hyphens allowed)
- **Environment**: Select `development`, `staging`, or `production`
- **Domain**: Enter your domain (e.g., `example.com` or `localhost` for local)

**Example:**

```
Project Name: my-awesome-app
Environment: development
Domain: localhost
```

Click "Next" to continue.

#### Step 2: Core Services

![Setup Step 2](screenshots/wizard-step2.png)

Select the core services you need:

- **PostgreSQL**: Primary database (required)
- **Hasura**: GraphQL engine
- **Auth Service**: Authentication system
- **Nginx**: Reverse proxy

**Recommended for most projects:** Enable all core services.

Click "Next" to continue.

#### Step 3: Optional Services

![Setup Step 3](screenshots/wizard-step3.png)

Choose optional services based on your needs:

- **Redis**: In-memory cache and session store
- **MinIO**: S3-compatible object storage
- **Mailpit**: Email testing (dev only)
- **Monitoring**: Prometheus + Grafana

**For local development:** Enable Redis and Mailpit.
**For production:** Enable Redis and Monitoring.

Click "Next" to continue.

#### Step 4: Database Configuration

![Setup Step 4](screenshots/wizard-step4.png)

Configure PostgreSQL:

- **Database Name**: Default is your project name
- **Username**: Database user (default: `postgres`)
- **Password**: Strong password (auto-generated, or custom)
- **Port**: PostgreSQL port (default: `5432`)

**Tip:** Click "Generate Secure Password" to create a strong password automatically.

Click "Next" to continue.

#### Step 5: Hasura Configuration

![Setup Step 5](screenshots/wizard-step5.png)

Configure Hasura GraphQL engine:

- **Admin Secret**: Hasura admin password (auto-generated recommended)
- **Port**: Hasura port (default: `8080`)
- **Enable Console**: Allow Hasura console access

**Security Note:** Keep the admin secret secure. Never commit it to git.

Click "Next" to continue.

#### Step 6: Frontend Apps

![Setup Step 6](screenshots/wizard-step6.png)

Add your frontend applications:

- **App Name**: Friendly name
- **Framework**: Next.js, React, Vue, etc.
- **Port**: Development port
- **URL**: Production URL

**Example:**

```
App Name: Web App
Framework: Next.js
Port: 3000
URL: https://app.example.com
```

Click "Add Another App" to add more, or "Finalize Setup" to complete.

#### Finalization

After completing all steps:

1. nself-admin generates configuration files
2. Creates `.env.dev` with your settings
3. Runs `nself build` to generate docker-compose.yml
4. Shows build progress in real-time

Once build completes, you're taken to the start page.

---

## Dashboard Overview

### Main Dashboard

![Dashboard](screenshots/dashboard.png)

The dashboard is your command center. It displays:

#### Service Status Cards

Each service shows:

- **Status**: Running (green), Stopped (red), Starting (yellow)
- **Uptime**: How long the service has been running
- **Resource Usage**: CPU, Memory
- **Health**: Health check status
- **Quick Actions**: Start, Stop, Restart, Logs

**Example:**

```
PostgreSQL
Status: Running
Uptime: 2d 4h 32m
CPU: 5.2%
Memory: 256 MB
Health: Healthy
```

#### System Metrics

Top-right section shows:

- **Total Services**: Active services count
- **CPU Usage**: Overall system CPU
- **Memory Usage**: Overall system memory
- **Disk Usage**: Available disk space

#### Recent Activity

Bottom section shows:

- Recent deployments
- Service state changes
- Configuration updates
- Error alerts

### Quick Actions

Use the top-right buttons for common tasks:

- **Build**: Rebuild docker-compose configuration
- **Start All**: Start all services
- **Stop All**: Stop all services
- **Doctor**: Run health diagnostics

---

## Service Management

### Viewing Service Details

Click any service card to open the detail modal:

![Service Detail](screenshots/service-detail.png)

**Tabs:**

- **Overview**: Status, uptime, resource usage
- **Logs**: Real-time container logs
- **Configuration**: Service-specific settings
- **Metrics**: Historical performance data
- **Shell**: Terminal access to container

### Starting/Stopping Services

**Individual Service:**

1. Click the service card
2. Click "Start", "Stop", or "Restart" button
3. Watch status update in real-time

**All Services:**

1. Click "Start All" in top navigation
2. Services start in dependency order (PostgreSQL → Hasura → Auth → Functions)
3. Progress shown for each service

**Via CLI (Alternative):**

```bash
# Start all services
nself start

# Start specific service
nself start postgres

# Stop all services
nself stop

# Restart a service
nself restart hasura
```

### Viewing Logs

**Real-Time Logs:**

1. Click service card
2. Click "Logs" tab
3. Logs stream in real-time with ANSI color support

**Log Features:**

- **Filter**: Search logs by keyword
- **Level**: Filter by log level (info, warn, error)
- **Follow**: Auto-scroll to latest (enabled by default)
- **Download**: Export logs to file
- **Clear**: Clear log buffer

**Example Log View:**

```
2026-01-31 10:23:45 [INFO] PostgreSQL ready to accept connections
2026-01-31 10:23:46 [INFO] Hasura GraphQL Engine started
2026-01-31 10:23:47 [WARN] Redis: maxmemory not set, using default
2026-01-31 10:23:48 [INFO] Auth service listening on port 4000
```

### Service Configuration

**Editing Configuration:**

1. Click service card
2. Click "Configuration" tab
3. Edit environment variables
4. Click "Save Changes"
5. Restart service to apply

**Common Settings:**

**PostgreSQL:**

- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Username
- `POSTGRES_PASSWORD`: Password
- `POSTGRES_MAX_CONNECTIONS`: Connection limit

**Hasura:**

- `HASURA_GRAPHQL_ADMIN_SECRET`: Admin password
- `HASURA_GRAPHQL_ENABLE_CONSOLE`: Enable console
- `HASURA_GRAPHQL_DEV_MODE`: Development mode

**Redis:**

- `REDIS_MAXMEMORY`: Memory limit
- `REDIS_MAXMEMORY_POLICY`: Eviction policy

---

## Database Operations

### SQL Console

Access the SQL console at `/database/console`:

![SQL Console](screenshots/database-console.png)

**Features:**

- Monaco editor with syntax highlighting
- Auto-completion for tables and columns
- Query history (persisted)
- Saved queries
- Export results (CSV, JSON)
- Query explain/analyze

**Example Query:**

```sql
-- Select all users
SELECT id, email, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Analyze query performance
EXPLAIN ANALYZE
SELECT u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.email;
```

**Running Queries:**

1. Type your SQL in the editor
2. Press `Cmd+Enter` (Mac) or `Ctrl+Enter` (Windows/Linux)
3. Results appear below
4. Click "Export" to download results

**Query History:**

- Access from sidebar "History" tab
- Click any previous query to re-run
- Delete unwanted history items

**Saved Queries:**

- Click "Save Query" after writing
- Name your query
- Access from "Saved" tab

### Migrations

Manage database migrations at `/database/migrations`:

**Creating Migrations:**

1. Click "Create Migration"
2. Enter migration name (e.g., `add_users_table`)
3. Write SQL for up/down migrations
4. Click "Save"

**Example Migration:**

```sql
-- Up Migration
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration
DROP TABLE users;
```

**Running Migrations:**

1. View pending migrations
2. Click "Run All" or run individually
3. Watch progress in real-time

**Rolling Back:**

1. View applied migrations
2. Click "Rollback" on last migration
3. Confirm rollback

**Via CLI:**

```bash
# Create migration
nself db migrate create add_users_table

# Run migrations
nself db migrate

# Rollback
nself db migrate rollback
```

### Schema Browser

View database schema at `/database/schema`:

**Features:**

- List all tables with row counts
- View table columns (name, type, nullable, default)
- See indexes and constraints
- Visualize relationships
- Generate SQL for table structure

**Example:**

```
Table: users (523 rows)
Columns:
- id (INTEGER, NOT NULL, PRIMARY KEY)
- email (VARCHAR(255), NOT NULL, UNIQUE)
- password_hash (VARCHAR(255), NOT NULL)
- created_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

Indexes:
- users_pkey (PRIMARY KEY on id)
- users_email_key (UNIQUE on email)
```

---

## Deployment Workflows

### Environment Overview

Navigate to `/deployment/environments`:

![Environments](screenshots/environments.png)

**Available Environments:**

- **Development**: Local development
- **Staging**: Testing environment
- **Production**: Live production

Each environment shows:

- Status (active/inactive)
- Last deployment
- Current version
- Health status

### Deploying to Staging

1. Go to `/deployment/staging`
2. Review changes to be deployed
3. Click "Deploy to Staging"
4. Watch deployment progress
5. Verify deployment success

**Deployment Steps:**

1. Build Docker images
2. Push to registry
3. Update environment variables
4. Run database migrations
5. Start services
6. Health checks
7. Complete

**Via CLI:**

```bash
nself staging deploy
```

### Deploying to Production

1. Go to `/deployment/production`
2. Review changes from staging
3. Click "Deploy to Production"
4. Confirm deployment
5. Monitor progress
6. Verify production health

**Production Deployment Options:**

- **Standard**: Direct deployment
- **Blue-Green**: Zero-downtime deployment
- **Canary**: Gradual rollout

**Blue-Green Deployment:**

1. Select "Blue-Green" strategy
2. New version deployed to "green" environment
3. Run smoke tests on green
4. Switch traffic to green
5. Keep blue as rollback option

**Canary Deployment:**

1. Select "Canary" strategy
2. Deploy to 10% of traffic
3. Monitor metrics
4. Increase to 50%, then 100%
5. Full rollout or rollback

### Rollback

If deployment fails:

1. Go to `/deployment/history`
2. Find last successful deployment
3. Click "Rollback to this version"
4. Confirm rollback
5. Services revert to previous state

**Via CLI:**

```bash
# Rollback production
nself prod rollback

# Rollback to specific version
nself prod rollback --version=v1.2.3
```

---

## Monitoring & Logs

### System Metrics

View system metrics at `/monitoring/metrics`:

**Metrics Displayed:**

- **CPU Usage**: Per-core and total
- **Memory Usage**: Used/available
- **Disk Usage**: Per mount point
- **Network I/O**: Bytes sent/received
- **Service Health**: Health check results

**Time Ranges:**

- Last hour
- Last 24 hours
- Last 7 days
- Last 30 days
- Custom range

### Grafana Dashboard

Access Grafana at `/monitoring/grafana`:

**Pre-built Dashboards:**

- System Overview
- PostgreSQL Metrics
- Hasura Performance
- API Response Times
- Error Rates

**Creating Custom Dashboards:**

1. Click "New Dashboard"
2. Add panels
3. Select data source (Prometheus)
4. Write PromQL query
5. Configure visualization

### Log Aggregation

View aggregated logs at `/monitoring/logs`:

**Features:**

- Search across all services
- Filter by service, level, time
- Highlight keywords
- Export logs
- Create alerts

**Example Search:**

```
# Find all errors in last hour
level:error time:1h

# Find database connection issues
service:postgres "connection refused"

# Find slow queries
service:hasura "query took"
```

### Alerts

Configure alerts at `/monitoring/alerts`:

**Alert Types:**

- **Metric Alerts**: CPU > 80%, Memory > 90%, etc.
- **Log Alerts**: Error patterns, specific keywords
- **Health Alerts**: Service down, health check failed

**Setting Up Alert:**

1. Click "Create Alert"
2. Name alert
3. Choose condition (metric, log, health)
4. Set threshold
5. Configure notification (email, webhook)
6. Save alert

**Example Alert:**

```
Name: High CPU Usage
Condition: CPU > 80% for 5 minutes
Notification: Email to admin@example.com
```

---

## Configuration Management

### Environment Variables

Edit environment variables at `/config`:

**Tabs:**

- **Local**: `.env.local` (your machine only)
- **Dev**: `.env.dev` (all developers)
- **Staging**: `.env.stage` (staging server)
- **Production**: `.env.prod` (production server)
- **Secrets**: `.env.secrets` (server-generated)

**Editing Variables:**

1. Select environment tab
2. Click variable to edit
3. Enter new value
4. Click "Save"
5. Rebuild configuration

**Adding New Variable:**

1. Click "Add Variable"
2. Enter name (e.g., `API_KEY`)
3. Enter value
4. Select visibility (local, dev, staging, prod)
5. Click "Save"

**Security:**

- Secrets are gitignored
- Production variables require auth
- Audit log tracks all changes

### SSL Configuration

Manage SSL certificates at `/config/ssl`:

**Local Development (mkcert):**

1. Click "Generate Local Certificate"
2. Wait for mkcert to create cert
3. Click "Trust Certificate"
4. Restart services

**Production (Let's Encrypt):**

1. Enter your domain
2. Enter email for notifications
3. Click "Generate Let's Encrypt Certificate"
4. DNS verification or HTTP challenge
5. Certificate issued automatically

**Certificate Renewal:**

- Automatic renewal 30 days before expiry
- Manual renewal available
- Notifications sent 7 days before expiry

---

## Backup & Restore

### Creating Backups

Navigate to `/database/backup`:

**Backup Types:**

- **Full**: Complete database dump
- **Schema**: Structure only
- **Data**: Data only

**Creating Backup:**

1. Click "Create Backup"
2. Select type (Full recommended)
3. Enter description
4. Click "Start Backup"
5. Download backup file

**Scheduled Backups:**

1. Click "Schedule Backup"
2. Select frequency (daily, weekly, monthly)
3. Choose time
4. Set retention (keep last N backups)
5. Enable schedule

**Example Schedule:**

```
Frequency: Daily
Time: 2:00 AM
Retention: Keep last 7 backups
```

**Via CLI:**

```bash
# Create backup
nself db backup

# Scheduled backup (cron)
0 2 * * * nself db backup
```

### Restoring Backups

**Restore Process:**

1. Go to `/database/restore`
2. Select backup from list
3. Click "Restore"
4. Confirm restoration (WARNING: overwrites current data)
5. Wait for restore to complete

**Via CLI:**

```bash
# List backups
nself db backup list

# Restore specific backup
nself db restore backup-2026-01-31.sql
```

---

## Troubleshooting

### Common Issues

#### Services Won't Start

**Symptoms:**

- Service stays in "Starting" state
- Container exits immediately
- Health check fails

**Solutions:**

1. Check logs for error messages
2. Verify environment variables
3. Check port conflicts
4. Ensure dependencies are running
5. Run `nself doctor` for diagnostics

**Via CLI:**

```bash
# Run diagnostics
nself doctor

# Check specific service
nself logs postgres
```

#### Database Connection Failed

**Symptoms:**

- "Connection refused" errors
- "Role does not exist" errors
- "Password authentication failed"

**Solutions:**

1. Verify PostgreSQL is running
2. Check database credentials in `.env.dev`
3. Ensure database exists
4. Check PostgreSQL logs

**Via CLI:**

```bash
# Check PostgreSQL status
nself logs postgres

# Connect to database
nself db cli
```

#### Build Failed

**Symptoms:**

- Build process exits with error
- Missing environment variables
- Invalid configuration

**Solutions:**

1. Review build output for specific error
2. Validate `.env.dev` file
3. Run `nself reset` to clean state
4. Rebuild with `nself build`

**Via CLI:**

```bash
# Clean and rebuild
nself reset
nself build
```

### Getting Help

If you're still stuck:

1. **Check Documentation**: [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. **Search Issues**: [GitHub Issues](https://github.com/nself-org/admin/issues)
3. **Ask Community**: [GitHub Discussions](https://github.com/nself-org/admin/discussions)
4. **Report Bug**: [New Issue](https://github.com/nself-org/admin/issues/new)

### Diagnostic Tools

**Health Check:**

```bash
curl http://localhost:3021/api/health
```

**System Info:**

```bash
nself doctor
```

**Service Status:**

```bash
docker ps
```

**Logs:**

```bash
# nself-admin logs
docker logs nself-admin

# Service logs
nself logs <service>
```

---

## Next Steps

Now that you're familiar with nself-admin:

1. **Explore Features**: Try all the services and tools
2. **Deploy to Staging**: Practice deployment workflow
3. **Set Up Monitoring**: Configure alerts and dashboards
4. **Automate Backups**: Schedule daily backups
5. **Review Security**: Audit access controls and secrets

**Additional Resources:**

- [Developer Guide](DEVELOPER_GUIDE.md) - For developers
- [API Reference](API.md) - API documentation
- [Component Library](COMPONENTS.md) - UI components
- [Deployment Guide](DEPLOYMENT.md) - Production deployment

---

**Need help?** Join our [community discussions](https://github.com/nself-org/admin/discussions)!
