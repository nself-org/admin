# Migration Guide: v0.4.x to v0.5.0

This guide helps you migrate from nself-admin v0.4.x to v0.5.0 (Production-Ready Release).

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes](#breaking-changes)
3. [Prerequisites](#prerequisites)
4. [Migration Steps](#migration-steps)
5. [Database Changes](#database-changes)
6. [Configuration Updates](#configuration-updates)
7. [API Changes](#api-changes)
8. [Testing](#testing)
9. [Rollback Plan](#rollback-plan)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What's New in v0.5.0

- **198 fully functional pages** (up from ~50 in v0.4)
- **60+ production-grade components** with loading states and error boundaries
- **Real-time WebSocket updates** for services and logs
- **Comprehensive error handling** across all endpoints
- **Enhanced security** with improved session management
- **Mobile-responsive design** with WCAG 2.1 AA compliance
- **Performance optimizations** (sub-1.5s page loads)

### Migration Time Estimate

- **Simple installations**: 10-15 minutes
- **Customized installations**: 30-60 minutes
- **Production deployments**: 1-2 hours (including testing)

---

## Breaking Changes

### 1. Database Schema Changes

**Impact**: Automatic migration on first startup

The LokiJS database schema has been updated:

- New `audit_log` collection for security tracking
- Enhanced `sessions` collection with IP and user agent
- Updated `project_cache` with TTL support

**Action Required**: None (automatic migration)

---

### 2. API Response Format Standardization

**Impact**: API clients need updates

**Before (v0.4.x):**

```json
{
  "data": { ... }
}
```

**After (v0.5.0):**

```json
{
  "success": true,
  "data": { ... }
}
```

**Action Required**: Update API clients to check `success` field.

---

### 3. Environment Variable Changes

**Impact**: Configuration updates needed

**Renamed:**

- `ADMIN_PORT` → `PORT` (default: 3021)
- `PROJECT_PATH` → `NSELF_PROJECT_PATH`

**Deprecated:**

- `ADMIN_PASSWORD` (now stored in database)
- `SESSION_SECRET` (now auto-generated)

**Action Required**: Update docker-compose.yml or environment files.

---

### 4. Session Storage Migration

**Impact**: All users will be logged out after upgrade

Sessions are now stored in the database instead of in-memory or environment variables.

**Action Required**: Users need to re-login after upgrade.

---

## Prerequisites

### Before You Begin

**1. Backup your installation:**

```bash
# Backup nAdmin database
docker cp nself-admin:/app/data/nadmin.db ./backup/nadmin.db

# Backup project directory
cp -r /path/to/project ./backup/project

# Backup Docker volumes
docker run --rm \
  -v nself-admin-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/data.tar.gz /data
```

**2. Check requirements:**

- Docker 20.10+ (24+ recommended)
- 2GB RAM minimum (4GB recommended)
- 10GB disk space (20GB recommended)
- Node.js 18+ (for development)

**3. Review current configuration:**

```bash
# Check current version
docker exec nself-admin cat /app/package.json | grep version

# Check environment variables
docker exec nself-admin env | grep NSELF
```

---

## Migration Steps

### Step 1: Stop Current Installation

```bash
# Stop the container
docker stop nself-admin

# Optionally remove it (volumes persist)
docker rm nself-admin
```

---

### Step 2: Pull New Image

```bash
# Pull specific version
docker pull nself/nself-admin:0.5.0

# Or latest
docker pull nself/nself-admin:latest
```

---

### Step 3: Update Configuration

#### Option A: Via nself CLI (Recommended)

```bash
# The nself CLI automatically uses the latest version
nself admin --port=3021
```

#### Option B: Docker Compose

Update `docker-compose.yml`:

```yaml
version: '3.8'

services:
  nself-admin:
    image: nself/nself-admin:0.5.0 # Update version
    container_name: nself-admin
    restart: unless-stopped
    ports:
      - '3021:3021'
    volumes:
      - /path/to/project:/workspace:rw
      - /var/run/docker.sock:/var/run/docker.sock:rw
      - nself-admin-data:/app/data
    environment:
      # Updated environment variables
      - NSELF_PROJECT_PATH=/workspace # Renamed from PROJECT_PATH
      - NODE_ENV=production
      - PORT=3021 # Renamed from ADMIN_PORT
      # Remove ADMIN_PASSWORD (now in database)
    healthcheck:
      test:
        [
          'CMD',
          'wget',
          '--quiet',
          '--tries=1',
          '--spider',
          'http://localhost:3021/api/health',
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  nself-admin-data:
```

#### Option C: Direct Docker Run

```bash
docker run -d \
  --name nself-admin \
  --restart unless-stopped \
  -p 3021:3021 \
  -v /path/to/project:/workspace:rw \
  -v /var/run/docker.sock:/var/run/docker.sock:rw \
  -v nself-admin-data:/app/data \
  -e NSELF_PROJECT_PATH=/workspace \
  -e NODE_ENV=production \
  -e PORT=3021 \
  nself/nself-admin:0.5.0
```

---

### Step 4: Start New Version

```bash
# Using nself CLI
nself admin

# Using Docker Compose
docker-compose up -d

# Using Docker run (see step 3)
```

---

### Step 5: Verify Migration

```bash
# Check container is running
docker ps | grep nself-admin

# Check logs
docker logs nself-admin

# Check health
curl http://localhost:3021/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T...",
  "version": "0.5.0",
  "checks": {
    "docker": true,
    "filesystem": true,
    "database": true,
    "cli": true
  }
}
```

---

### Step 6: Re-Login

1. Open http://localhost:3021
2. Enter your admin password
3. If password was stored in `ADMIN_PASSWORD` env var, you'll need to set it again via the setup screen

---

## Database Changes

### Automatic Migrations

The database will automatically migrate on first startup of v0.5.0.

**New collections:**

- `audit_log` - Security and action tracking
- Enhanced `sessions` with IP tracking

**Migration process:**

1. Backup existing database
2. Add new collections
3. Migrate existing session data
4. Clean up expired sessions

**No manual intervention required.**

---

## Configuration Updates

### Environment Files

If you have custom `.env` files for your nself project, no changes are required. The nself-admin UI now provides a better interface for managing these.

### Docker Volumes

Volume paths remain the same:

- `/workspace` - Your project
- `/app/data` - nAdmin database
- `/var/run/docker.sock` - Docker socket

---

## API Changes

### Response Format

**All API responses now include `success` field:**

**Old client code:**

```typescript
const response = await fetch('/api/services/status')
const data = await response.json()
if (data.services) { ... }
```

**New client code:**

```typescript
const response = await fetch('/api/services/status')
const data = await response.json()
if (data.success && data.data.services) { ... }
```

### New Endpoints

v0.5.0 adds 80+ new endpoints. See [API.md](API.md) for complete reference.

**Notable additions:**

- `/api/deploy/staging` - Staging deployment
- `/api/deploy/production` - Production deployment
- `/api/cloud/*` - Cloud provider integration
- `/api/k8s/*` - Kubernetes management
- `/api/plugins/*` - Plugin management

---

## Testing

### Post-Migration Checklist

**Critical flows:**

- [ ] Login works
- [ ] Dashboard loads
- [ ] Services start/stop
- [ ] Database queries execute
- [ ] Logs viewer works
- [ ] Configuration saves
- [ ] SSL configuration (if used)
- [ ] Deployments work (if used)

**Quick test script:**

```bash
#!/bin/bash
# test-migration.sh

BASE_URL="http://localhost:3021"

echo "Testing health endpoint..."
curl -s $BASE_URL/api/health | jq .

echo "Testing auth (login)..."
curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}' \
  -c cookies.txt | jq .

echo "Testing service status..."
curl -s -b cookies.txt $BASE_URL/api/services/status | jq .

echo "All tests passed!"
```

---

## Rollback Plan

If you encounter issues, you can roll back to v0.4.x.

### Rollback Steps

**1. Stop v0.5.0:**

```bash
docker stop nself-admin
docker rm nself-admin
```

**2. Restore database:**

```bash
docker cp ./backup/nadmin.db nself-admin:/app/data/
```

**3. Start v0.4.x:**

```bash
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v /path/to/project:/workspace:rw \
  -v /var/run/docker.sock:/var/run/docker.sock:rw \
  -v nself-admin-data:/app/data \
  -e PROJECT_PATH=/workspace \
  -e ADMIN_PASSWORD=your_password \
  nself/nself-admin:0.4.0
```

**Note**: You will lose any data created during v0.5.0 usage.

---

## Troubleshooting

### Issue: Container won't start

**Symptoms**: Container exits immediately after start

**Solution**:

```bash
# Check logs
docker logs nself-admin

# Common causes:
# - Port 3021 in use
# - Volume mount path doesn't exist
# - Docker socket permission denied

# Fix port conflict
sudo lsof -i :3021
kill -9 <PID>

# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

---

### Issue: Can't login

**Symptoms**: "Unauthorized" error on login

**Solution**:

```bash
# Reset password via database
docker exec -it nself-admin node -e "
const db = require('./dist/lib/database.js');
// Password reset logic
"

# Or restart fresh (loses sessions)
docker exec nself-admin rm /app/data/nadmin.db
docker restart nself-admin
```

---

### Issue: API responses differ

**Symptoms**: Client code breaks due to response format

**Solution**: Update client code to check `success` field:

```typescript
// Add response validation
function handleResponse(response: any) {
  if (!response.success) {
    throw new Error(response.error || 'Unknown error')
  }
  return response.data
}

// Use it
const data = handleResponse(await fetch('/api/...').then((r) => r.json()))
```

---

### Issue: Performance degradation

**Symptoms**: Slow page loads, high CPU usage

**Solution**:

```bash
# Check container resources
docker stats nself-admin

# Increase limits in docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G

# Restart
docker-compose restart nself-admin
```

---

### Issue: WebSocket not connecting

**Symptoms**: Real-time updates don't work

**Solution**:

```bash
# Check WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3021/socket.io/

# If behind reverse proxy, ensure WebSocket support:
# Nginx: proxy_set_header Upgrade $http_upgrade;
# Caddy: Automatic
# Traefik: Automatic
```

---

## Additional Resources

- [Changelog](CHANGELOG.md) - Complete list of changes
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [Development Guide](DEVELOPMENT.md) - Local development
- [Architecture](ARCHITECTURE.md) - System architecture
- [API Reference](API.md) - Complete API documentation

---

## Support

**Need help with migration?**

- GitHub Issues: https://github.com/nself-org/admin/issues
- GitHub Discussions: https://github.com/nself-org/admin/discussions

---

## Summary

**Key points:**

1. Backup before upgrading
2. Update environment variables (`PROJECT_PATH` → `NSELF_PROJECT_PATH`)
3. Remove `ADMIN_PASSWORD` from env (now in database)
4. Pull new image and restart
5. Re-login (sessions reset)
6. Test critical workflows
7. Update API clients for new response format

**Most users can complete migration in under 15 minutes with zero data loss.**

---

**Congratulations on upgrading to nself-admin v0.5.0!**
