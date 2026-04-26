# Migration Guide: v0.4.0 → v0.5.0

Complete guide for upgrading nself-admin from v0.4.0 to v0.5.0.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Steps](#migration-steps)
- [Post-Migration Verification](#post-migration-verification)
- [Rollback Procedure](#rollback-procedure)
- [Common Migration Issues](#common-migration-issues)

---

## Overview

### What's Changed

v0.5.0 is a **major release** that includes significant improvements:

- 198 fully functional pages (up from ~50)
- 60+ production-grade components (up from ~20)
- Real-time WebSocket updates
- Full error handling
- Database schema changes
- API response format standardization
- Enhanced security features

### Compatibility

- **nself CLI**: Requires v0.4.4 or later
- **Docker**: Requires 20.0 or later
- **Node.js**: Requires 18.0 or later (for development)
- **PostgreSQL**: 14+ (existing data preserved)

### Estimated Migration Time

- **Small projects** (<10 services): 15-30 minutes
- **Medium projects** (10-30 services): 30-60 minutes
- **Large projects** (>30 services): 1-2 hours

---

## Breaking Changes

### 1. Database Schema Changes

**Impact:** Automatic migration required on first startup.

**What Changed:**

- New tables: `audit_log`, `deployment_history`, `user_sessions`
- Modified tables: `config` (added columns), `sessions` (TTL support)
- Indexes added for performance

**Migration:** Automatic via LokiJS schema upgrade.

**Action Required:** None (automatic), but backup first.

---

### 2. API Response Format Standardization

**Impact:** If you're using the API directly (not through the UI).

**Old Format:**

```json
{
  "data": { ... },
  "error": null
}
```

**New Format:**

```json
{
  "success": true,
  "data": { ... }
}
```

Or for errors:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Action Required:** Update API clients to handle new format.

---

### 3. Environment Variable Naming

**Impact:** Some environment variables renamed for consistency.

**Changes:**

```bash
# Old → New
ADMIN_PASSWORD → (removed, now in database)
PROJECT_PATH → NSELF_PROJECT_PATH
ADMIN_PORT → PORT
```

**Action Required:** Update Docker run commands and scripts.

---

### 4. Session Storage

**Impact:** Sessions now stored in database instead of filesystem.

**What Changed:**

- Old: Sessions in `/tmp/sessions`
- New: Sessions in `nadmin.db`

**Action Required:** Users will be logged out on upgrade (one-time).

---

### 5. Removed Features

**Impact:** Minor, mostly internal cleanup.

**Removed:**

- Legacy environment variable authentication
- Deprecated `/api/v1/*` routes (use `/api/*`)
- Unused dependencies (automatically handled)

**Action Required:** None if using standard UI.

---

## Pre-Migration Checklist

### 1. Backup Current Installation

**Backup nself-admin database:**

```bash
# Stop nself-admin container
docker stop nself-admin

# Backup database file
docker cp nself-admin:/app/data/nadmin.db ./nadmin-backup-$(date +%Y%m%d).db

# Restart
docker start nself-admin
```

**Backup your project database:**

```bash
# Via nself CLI
nself db backup

# Or via Docker
docker exec -it postgres pg_dump -U postgres yourdb > backup-$(date +%Y%m%d).sql
```

### 2. Document Current Configuration

Export current environment variables:

```bash
# Copy current .env files
cp .env.dev .env.dev.backup
cp .env.local .env.local.backup
cp .env.stage .env.stage.backup 2>/dev/null || true
cp .env.prod .env.prod.backup 2>/dev/null || true
```

### 3. Check nself CLI Version

Ensure you have compatible nself CLI:

```bash
nself --version
# Should be v0.4.4 or later
```

If not:

```bash
# Update nself CLI
nself update --cli

# Or reinstall
curl -fsSL https://raw.githubusercontent.com/nself-org/cli/main/install.sh | bash
```

### 4. Check Running Services

Document currently running services:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" > services-before-migration.txt
```

### 5. Free Disk Space

Ensure sufficient disk space:

```bash
df -h /var/lib/docker
# Should have at least 5GB free
```

---

## Migration Steps

### Step 1: Stop Current nself-admin

```bash
# Via nself CLI
nself admin stop

# Or directly
docker stop nself-admin
docker rm nself-admin
```

### Step 2: Pull New Docker Image

```bash
docker pull nself/nself-admin:0.5.0
```

### Step 3: Update Launch Command

**Old Command (v0.4.0):**

```bash
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/project \
  -e PROJECT_PATH=/project \
  -e ADMIN_PASSWORD=your-password \
  nself/nself-admin:0.4.0
```

**New Command (v0.5.0):**

```bash
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e NSELF_PROJECT_PATH=/workspace \
  nself/nself-admin:0.5.0
```

**Key Changes:**

- `/project` → `/workspace`
- `PROJECT_PATH` → `NSELF_PROJECT_PATH`
- `ADMIN_PASSWORD` removed (set via UI on first login)
- Added Docker socket mount (required for container management)

### Step 4: Start New Version

**Via nself CLI (Recommended):**

```bash
nself admin
```

This automatically handles the correct configuration.

**Or Manually:**

```bash
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e NSELF_PROJECT_PATH=/workspace \
  nself/nself-admin:latest
```

### Step 5: First Login

1. Open `http://localhost:3021`
2. You'll be prompted to set admin password (even if you had one before)
3. Set a strong password:
 - Minimum 12 characters
 - At least 1 uppercase letter
 - At least 1 lowercase letter
 - At least 1 number
 - At least 1 special character
4. Click "Create Password"

### Step 6: Verify Database Migration

The database schema automatically upgrades on first startup. Check logs:

```bash
docker logs nself-admin | grep -i migration
```

You should see:

```
[INFO] Database schema version: 1.0.0
[INFO] Upgrading schema to 2.0.0...
[INFO] Migration complete
```

### Step 7: Verify Services

Check that all services are detected:

1. Go to dashboard: `http://localhost:3021`
2. Verify all services show correct status
3. Check metrics are displaying

### Step 8: Test Core Functionality

**Quick Verification:**

1. ✅ Login works
2. ✅ Dashboard loads
3. ✅ Service cards display correctly
4. ✅ Can view logs
5. ✅ Can access database console
6. ✅ Environment config loads

**Detailed Testing:**

```bash
# Test health endpoint
curl http://localhost:3021/api/health

# Expected response:
{
  "status": "healthy",
  "version": "0.5.0",
  "checks": {
    "docker": true,
    "filesystem": true,
    "database": true,
    "cliAvailable": true
  }
}
```

---

## Post-Migration Verification

### 1. Database Console

Test the new SQL console:

1. Navigate to `/database/console`
2. Run a simple query:
   ```sql
   SELECT version();
   ```
3. Verify results display correctly

### 2. Real-Time Updates

Test WebSocket connection:

1. Open dashboard
2. Start/stop a service
3. Verify status updates in real-time (no page refresh)

### 3. Service Management

Test service controls:

1. Stop a service via UI
2. Check it actually stopped: `docker ps`
3. Start it again via UI
4. Verify it starts successfully

### 4. Deployment Pages

Navigate to new deployment pages:

1. `/deployment/environments`
2. `/deployment/staging`
3. `/deployment/production`

Verify they load without errors.

### 5. Monitoring

Check new monitoring features:

1. Navigate to `/monitoring/metrics`
2. Verify charts display
3. Check real-time updates

### 6. Backup System

Test backup functionality:

1. Navigate to `/database/backup`
2. Create a test backup
3. Verify backup file created
4. Download backup to confirm

---

## Rollback Procedure

If you encounter issues and need to rollback:

### Quick Rollback

```bash
# Stop v0.5.0
docker stop nself-admin
docker rm nself-admin

# Restore backup database
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/project \
  -v $(pwd)/nadmin-backup-YYYYMMDD.db:/app/data/nadmin.db \
  -e PROJECT_PATH=/project \
  -e ADMIN_PASSWORD=your-old-password \
  nself/nself-admin:0.4.0
```

### Full Rollback with Data Restore

```bash
# 1. Stop v0.5.0
docker stop nself-admin
docker rm nself-admin

# 2. Restore environment files
cp .env.dev.backup .env.dev
cp .env.local.backup .env.local
cp .env.stage.backup .env.stage 2>/dev/null || true
cp .env.prod.backup .env.prod 2>/dev/null || true

# 3. Start v0.4.0
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/project \
  -e PROJECT_PATH=/project \
  -e ADMIN_PASSWORD=your-old-password \
  nself/nself-admin:0.4.0

# 4. Verify rollback
curl http://localhost:3021/api/health | jq .version
# Should show "0.4.0"
```

---

## Common Migration Issues

### Issue 1: "Cannot connect to Docker daemon"

**Symptom:**

```
Error: Cannot connect to Docker daemon
Services show as "Unknown" status
```

**Cause:** Docker socket not mounted or permissions issue.

**Solution:**

```bash
# Check Docker socket exists
ls -la /var/run/docker.sock

# Verify permissions
sudo chmod 666 /var/run/docker.sock

# Or add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Restart nself-admin
docker restart nself-admin
```

---

### Issue 2: "Database migration failed"

**Symptom:**

```
[ERROR] Failed to upgrade database schema
Application fails to start
```

**Cause:** Corrupted database file.

**Solution:**

```bash
# Stop container
docker stop nself-admin

# Remove corrupted database
docker run --rm -v nself-admin-data:/data alpine rm /data/nadmin.db

# Start fresh (will reinitialize)
docker start nself-admin
```

**Note:** You'll need to set admin password again.

---

### Issue 3: "Admin password not working"

**Symptom:**

- Old password doesn't work
- Can't log in after upgrade

**Cause:** Password storage moved to database.

**Solution:**

1. Open `http://localhost:3021/login`
2. Look for "Set up admin password" link
3. Create new password
4. Log in with new password

---

### Issue 4: "Services not detected"

**Symptom:**

- Dashboard shows no services
- "No services found" message

**Cause:** Incorrect project path or missing docker-compose.yml.

**Solution:**

```bash
# Verify project path
docker exec nself-admin env | grep NSELF_PROJECT_PATH

# Check docker-compose.yml exists
docker exec nself-admin ls -la /workspace/docker-compose.yml

# If missing, rebuild
nself build
```

---

### Issue 5: "Real-time updates not working"

**Symptom:**

- Have to refresh page to see changes
- WebSocket connection fails

**Cause:** Port 3021 blocked or proxy configuration.

**Solution:**

```bash
# Check if port is accessible
curl http://localhost:3021/api/health

# Check browser console for WebSocket errors
# Open browser DevTools → Console tab
# Look for "WebSocket connection failed"

# If behind proxy, ensure WebSocket upgrade headers allowed
```

---

### Issue 6: "High memory usage"

**Symptom:**

- nself-admin using >1GB RAM
- System becomes slow

**Cause:** Metrics collection or log streaming.

**Solution:**

```bash
# Restart container to clear memory
docker restart nself-admin

# If persistent, limit container memory
docker update --memory=512m nself-admin

# Or recreate with memory limit
docker stop nself-admin
docker rm nself-admin

docker run -d \
  --name nself-admin \
  --memory=512m \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:0.5.0
```

---

### Issue 7: "Environment variables not loading"

**Symptom:**

- Config page shows empty
- Variables not persisted

**Cause:** `.env` file permissions or format.

**Solution:**

```bash
# Check file permissions
ls -la .env.dev

# Should be readable
chmod 644 .env.dev

# Verify file format (no BOM, Unix line endings)
dos2unix .env.dev  # If on Windows

# Rebuild config
nself build
```

---

## Getting Help

If you encounter issues not covered here:

1. **Check Logs:**

   ```bash
   docker logs nself-admin --tail 100
   ```

2. **Run Diagnostics:**

   ```bash
   nself doctor
   ```

3. **Search GitHub Issues:**
 [github.com/nself-org/admin/issues](https://github.com/nself-org/admin/issues)

4. **Ask Community:**
 [github.com/nself-org/admin/discussions](https://github.com/nself-org/admin/discussions)

5. **Report Bug:**
 [github.com/nself-org/admin/issues/new](https://github.com/nself-org/admin/issues/new)

---

## Success Checklist

After migration, verify:

- [ ] nself-admin starts successfully
- [ ] Can log in with new password
- [ ] Dashboard displays all services
- [ ] Real-time updates work (no manual refresh needed)
- [ ] Can view logs for each service
- [ ] Database console works
- [ ] Can create/restore backups
- [ ] Environment config page loads
- [ ] Deployment pages accessible
- [ ] Monitoring metrics display

---

## Next Steps

After successful migration:

1. **Explore New Features**
 - Try the new database console
 - Check out deployment workflows
 - Configure monitoring alerts

2. **Update Documentation**
 - Review new user guide
 - Check updated API reference

3. **Security Review**
 - Audit access controls
 - Review secrets management
 - Check SSL configuration

4. **Performance Tuning**
 - Monitor resource usage
 - Optimize queries if needed
 - Configure caching

---

**Migration Complete!** 🎉

You're now running v0.5.0 with all the latest features and improvements.

For questions or issues, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or join our [community](https://github.com/nself-org/admin/discussions).
