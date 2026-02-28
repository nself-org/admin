# Quick Start Guide

Get nAdmin up and running in 5 minutes!

## Prerequisites

- Docker installed and running
- nself CLI installed (`npm install -g @nself/cli`)
- An empty directory for your project

## Step 1: Start nAdmin

```bash
# Create and navigate to your project directory
mkdir my-nself-project
cd my-nself-project

# Start nAdmin
nself admin
```

This launches nAdmin at http://localhost:3021

## Step 2: Set Admin Password

On first launch, you'll see the password setup screen:

1. Enter a secure password
2. Click "Set Password"
3. You'll be automatically logged in

**Development Mode**: Passwords require only 3 characters
**Production Mode**: Passwords require 12+ characters with uppercase, lowercase, number, and special character

## Step 3: Project Setup Wizard

After login, the setup wizard guides you through:

### Step 1 - Project Configuration

- **Project Name**: Enter your project name
- **Environment**: Select development or production
- **Region**: Choose your deployment region

### Step 2 - Database Configuration

- **Database Type**: PostgreSQL (default)
- **Connection Settings**: Automatic for local development
- **Migrations**: Enable/disable auto-migrations

### Step 3 - Services Selection

Choose which services to include:

- ✅ PostgreSQL - Database
- ✅ Redis - Caching
- ✅ Hasura - GraphQL Engine
- ✅ MinIO - Object Storage
- ✅ Auth Service - Authentication
- ✅ NestJS API - Backend API
- ✅ BullMQ - Job Queue

### Step 4 - Review & Build

- Review your configuration
- Click "Build Project"
- Wait for containers to build (3-5 minutes)

## Step 4: Start Services

After building completes:

1. You'll be redirected to the Start Services page
2. Click "Start All Services"
3. Watch the progress as services come online
4. Once complete, you'll see the main dashboard

## Step 5: Explore the Dashboard

The dashboard shows:

- **Service Status**: Real-time health of all services
- **Quick Actions**: Common tasks and shortcuts
- **System Metrics**: CPU, memory, and network usage
- **Recent Activity**: Audit log of recent actions

## Common Next Steps

### Access Your Services

From the dashboard, you can access:

- **PostgreSQL**: Database console at `/database`
- **Hasura Console**: GraphQL playground at `/services/hasura`
- **MinIO Console**: Object storage at `/services/storage`
- **Redis Commander**: Cache management at `/services/redis`

### Configure Your Application

1. Navigate to `/config/env`
2. Set environment variables
3. Configure API endpoints
4. Set up webhooks

### Database Setup

1. Go to `/database/migrations`
2. Run initial migrations
3. Seed test data if needed
4. View schema at `/database/schema`

## Quick Commands

### Check Status

```bash
# View all running services
docker ps

# Check nAdmin logs
docker logs nself-admin
```

### Stop Services

```bash
# Stop all services
nself stop

# Stop nAdmin
docker stop nself-admin
```

### Restart Services

```bash
# Restart all services
nself restart

# Restart nAdmin
docker restart nself-admin
```

## Keyboard Shortcuts

- `Ctrl+K` - Quick command palette
- `Ctrl+S` - Save current configuration
- `Ctrl+R` - Refresh service status
- `Esc` - Close modals/dialogs

## Tips for Success

### 1. Development Workflow

```bash
# Start services in the morning
nself start

# Check status throughout the day
nself status

# Stop services when done
nself stop
```

### 2. Monitor Resources

Keep an eye on the resource usage in the dashboard to ensure optimal performance.

### 3. Regular Backups

Set up automated backups:

```bash
# Backup database
nself backup database

# Backup configuration
nself backup config
```

### 4. Use the Terminal

Access the integrated terminal at `/dev/terminal` for quick commands without leaving the dashboard.

## Troubleshooting Quick Fixes

### Services Won't Start

```bash
# Check Docker is running
docker version

# Clear and rebuild
nself down
nself build
nself start
```

### Can't Access Dashboard

```bash
# Check if container is running
docker ps | grep nself-admin

# Restart the container
docker restart nself-admin
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# View connection details
nself config database
```

## What's Next?

- [Managing Services](../guides/managing-services.md) - Deep dive into service management
- [Database Operations](../guides/database-operations.md) - Advanced database tasks
- [Configuration Guide](configuration.md) - Detailed configuration options
- [Troubleshooting Guide](../guides/troubleshooting.md) - Comprehensive problem solving

## Getting Help

- **Documentation**: Browse the full docs at `/help`
- **System Check**: Run diagnostics at `/doctor`
- **Community**: Join our Discord server
- **Support**: Email support@nself.com

---

🎉 **Congratulations!** You're now running nAdmin and managing your nself project like a pro!
