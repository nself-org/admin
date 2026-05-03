# First Time Setup Guide

This guide walks you through the initial setup of nAdmin, from installation to having a fully running nself project.

## Step 1: Launch nAdmin

### Option A: Using nself CLI

```bash
# Navigate to your project directory
cd ~/projects/my-app

# Launch nAdmin
nself admin
```

### Option B: Using Docker

```bash
# Run nAdmin container
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace:rw \
  -v nself-admin-data:/app/data \
  nself/nself-admin:latest
```

Open your browser to http://localhost:3021

## Step 2: Set Admin Password

### Password Setup Screen

When you first access nAdmin, you'll see the password setup screen:

![Password Setup](../images/password-setup.png)

1. **Enter a secure password**

- Development mode: Minimum 3 characters
- Production mode: Minimum 12 characters with complexity requirements

2. **Click "Set Password"**

- Password is hashed and stored in the database
- You'll be automatically logged in

### Password Requirements

#### Development Environment

Detected when running on localhost or \*.local domains:

- Minimum 3 characters
- No complexity requirements
- Simplified for quick testing

#### Production Environment

- Minimum 12 characters
- Must contain:
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%\*?&)

Example strong password: `MyS3cur3P@ssw0rd!`

## Step 3: Project Setup Wizard

After setting your password, you'll be redirected to the Project Setup Wizard.

### Stage 1: Project Configuration

Configure your nself project basics:

```yaml
Project Information:
  Name: my-awesome-app
  Environment: development
  Region: us-east-1

Organization:
  Name: My Company
  Domain: example.com
```

**Fields:**

- **Project Name**: Used for container naming and identification
- **Environment**: Development, staging, or production
- **Region**: Deployment region (affects default configurations)
- **Organization**: Optional organization details

### Stage 2: Database Configuration

Set up your PostgreSQL database:

```yaml
Database Settings:
  Type: PostgreSQL
  Version: 15
  Port: 5432

Initial Setup:
  Database Name: app_db
  Username: app_user
  Auto-migrate: true
  Seed Data: true
```

**Options:**

- **Auto-migrate**: Run migrations on startup
- **Seed Data**: Load sample data for development
- **SSL Mode**: Enable for production
- **Connection Pooling**: Configure max connections

### Stage 3: Services Selection

Choose which services to include:

| Service          | Description           | Default |
| ---------------- | --------------------- | ------- |
| **PostgreSQL**   | Primary database      | ✅      |
| **Redis**        | Caching and sessions  | ✅      |
| **Hasura**       | GraphQL engine        | ✅      |
| **MinIO**        | S3-compatible storage | ✅      |
| **Auth Service** | Authentication        | ✅      |
| **NestJS API**   | Backend API           | ✅      |
| **BullMQ**       | Job queue             | ✅      |
| **Nginx**        | Reverse proxy         | ✅      |
| **MailHog**      | Email testing         | ⬜      |

**Service Groups:**

- **Essential**: PostgreSQL, Redis, Auth
- **API Layer**: Hasura, NestJS
- **Storage**: MinIO
- **Infrastructure**: Nginx, BullMQ
- **Development**: MailHog

### Stage 4: Review & Build

Review your configuration before building:

```yaml
Summary:
  Project: my-awesome-app
  Environment: development
  Services: 9 selected
  Database: PostgreSQL 15

Estimated Build Time: 3-5 minutes
Disk Space Required: ~2GB
```

Click **"Build Project"** to start the build process.

## Step 4: Building Process

### Build Progress

You'll see real-time progress as nAdmin builds your project:

```
Building nself project...
✓ Initializing project structure
✓ Creating docker-compose.yml
✓ Setting up environment variables
↻ Pulling Docker images... (3/9)
  ✓ postgres:15-alpine
  ✓ redis:7-alpine
  ↻ hasura/graphql-engine:latest (45%)
  ⏳ minio/minio:latest
  ⏳ nginx:alpine
  ...
```

### What's Happening

1. **Project Initialization**

   ```bash
   nself init
   ```

Creates project structure and configuration files

2. **Environment Setup**

   ```bash
   # Creates .env files with:
   - Database credentials
   - Service URLs
   - API keys
   - Secret tokens
   ```

3. **Docker Image Pull**

   ```bash
   docker pull postgres:15-alpine
   docker pull redis:7-alpine
   # ... etc
   ```

4. **Container Build**
   ```bash
   nself build
   ```
   Builds custom service containers

### Build Completion

Once complete, you'll see:

```
✅ Build completed successfully!

Summary:
- 9 services configured
- All images downloaded
- Environment ready

Click "Start Services" to continue →
```

## Step 5: Starting Services

You'll be redirected to the Start Services page.

### Start All Services

Click the **"Start All Services"** button to begin:

```
Starting services...
✓ Network created: nself_default
✓ Volume created: postgres_data
↻ Starting containers... (3/9)
  ✓ postgres: Running
  ✓ redis: Running
  ↻ hasura: Starting (health check)
  ⏳ minio: Waiting
  ...
```

### Service Health Checks

Each service goes through health checks:

1. **Container Started**: Process is running
2. **Port Available**: Service is listening
3. **Health Check**: Service is responding
4. **Ready**: Service is fully operational

### Troubleshooting Start Issues

If a service fails to start:

```
❌ hasura: Failed to start

Error: Database connection refused
Action: Check PostgreSQL is running

[Retry] [View Logs] [Skip]
```

**Common Issues:**

- Port conflicts: Change port in configuration
- Memory limits: Increase Docker resources
- Network issues: Check Docker network settings

## Step 6: Dashboard Access

Once all services are running, you'll be redirected to the main dashboard.

### Dashboard Overview

The dashboard displays:

```
┌─────────────────┬─────────────────┐
│ Services        │ System Health   │
│ 9/9 Running     │ CPU: 12%        │
│                 │ Memory: 2.1GB   │
├─────────────────┼─────────────────┤
│ Quick Actions   │ Recent Activity │
│ • View Logs     │ • Services      │
│ • Database      │   started       │
│ • API Docs      │ • Password set  │
└─────────────────┴─────────────────┘
```

### Service Cards

Each service shows:

- **Status**: Running, Stopped, Error
- **Health**: Healthy, Unhealthy, Unknown
- **Actions**: Start, Stop, Restart, Logs
- **Metrics**: CPU, Memory usage

### Quick Access URLs

Access your services:

| Service            | URL                   | Credentials           |
| ------------------ | --------------------- | --------------------- |
| **Hasura Console** | http://localhost:8080 | Admin secret in env   |
| **MinIO Console**  | http://localhost:9001 | minioadmin/minioadmin |
| **PostgreSQL**     | localhost:5432        | app_user/[generated]  |
| **Redis**          | localhost:6379        | No auth (dev)         |

## Step 7: Verify Installation

### Run System Check

Navigate to `/doctor` or click "System Check":

```
System Diagnostics
==================
✅ Docker: Connected (v24.0.5)
✅ nself CLI: Found (v2.1.0)
✅ Database: Connected
✅ Services: All healthy
✅ Network: Configured
✅ Volumes: Mounted

Status: Everything is working correctly!
```

### Test Database Connection

Go to `/database` and run a test query:

```sql
SELECT version();
-- PostgreSQL 15.2 on x86_64-pc-linux-musl
```

### Check API Endpoints

Test the API at `/api/health`:

```json
{
  "status": "healthy",
  "services": {
    "postgres": "running",
    "redis": "running",
    "hasura": "running"
  },
  "timestamp": "2024-01-20T10:00:00Z"
}
```

## Next Steps

### 1. Configure Your Application

- Set environment variables at `/config/env`
- Configure CORS at `/config/cors`
- Set up webhooks at `/tools/webhooks`

### 2. Database Setup

- Run migrations at `/database/migrations`
- Create initial schema
- Seed development data

### 3. Development Workflow

```bash
# Monitor logs
docker logs -f <service-name>

# Access database
psql -h localhost -U app_user -d app_db

# Clear Redis cache
redis-cli FLUSHALL
```

### 4. Security Hardening

For production:

1. Change default passwords
2. Enable SSL/TLS
3. Configure firewall rules
4. Set up monitoring
5. Enable backups

## Password Reset

If you forget your admin password or need to reset it for any reason, you have two options:

### Method 1: Using nself CLI (Recommended)

The nself CLI provides a convenient command to reset the admin password:

```bash
# Reset the admin password
nself admin reset-password

# This will:
# 1. Stop the nAdmin container
# 2. Delete the password from the database
# 3. Restart the container
# 4. Prompt you to set a new password on next login
```

### Method 2: Manual Reset

You can manually reset the password by deleting the database file:

```bash
# Option A: Delete database from inside container
docker exec nself-admin rm /app/data/nadmin.db
docker restart nself-admin

# Option B: Delete database using volume
docker volume rm nself-admin-data
docker restart nself-admin

# Option C: If running locally (development)
rm ./data/nadmin.db
npm run dev
```

After resetting, navigate to http://localhost:3021 and you'll be prompted to set a new password.

### Important Notes

- **Data Loss**: Resetting the password by deleting `nadmin.db` will also clear:
- All active sessions
- Cached project information
- Audit logs
- Any other stored configuration
- **Project Data Safe**: Your actual nself project data is never affected by password reset

- **Container Must Be Running**: For the CLI reset command to work, the nAdmin container must be running

## Common First-Time Issues

### Issue: Can't Access Dashboard

**Solution:**

```bash
# Check if container is running
docker ps | grep nself-admin

# Check logs
docker logs nself-admin

# Restart if needed
docker restart nself-admin
```

### Issue: Services Won't Start

**Solution:**

```bash
# Check Docker resources
docker system df
docker system prune -a

# Increase Docker memory
# Docker Desktop > Settings > Resources
```

### Issue: Database Connection Failed

**Solution:**

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec -it postgres psql -U app_user

# Check credentials in .env
cat .env | grep DATABASE_URL
```

### Issue: Port Already in Use

**Solution:**

```bash
# Find what's using the port
lsof -i :3021

# Use different port
PORT=3022 nself admin
```

## Tips for Success

1. **Start Small**: Begin with essential services only
2. **Use Development Mode**: Easier passwords and relaxed security
3. **Monitor Resources**: Keep Docker Desktop open to watch resource usage
4. **Read Logs**: Most issues are explained in service logs
5. **Take Snapshots**: Backup your database after initial setup

## Getting Help

- **Documentation**: Available at `/help` or [GitHub Wiki](https://github.com/nself-org/admin/wiki)
- **System Check**: Run diagnostics at `/doctor`
- **View Logs**: Check service logs for errors
- **GitHub Issues**: [Report bugs](https://github.com/nself-org/admin/issues)
- **Discussions**: [Community support](https://github.com/nself-org/admin/discussions)
- **Telegram**: [@nselforg](https://t.me/nselforg) for announcements
- **Commercial Support**: [nself.org/commercial](https://nself.org/commercial)

---

🎉 **Congratulations!** You've successfully set up nAdmin and your nself project. Happy developing!
