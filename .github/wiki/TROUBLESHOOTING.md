# nself-admin Troubleshooting Guide

## Overview

This guide helps you diagnose and resolve common issues with nself-admin and the nself stack.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation Issues](#installation-issues)
3. [Wizard Issues](#wizard-issues)
4. [Environment Variable Issues](#environment-variable-issues)
5. [Service Issues](#service-issues)
6. [Build and Deployment Issues](#build-and-deployment-issues)
7. [Database Issues](#database-issues)
8. [Authentication Issues](#authentication-issues)
9. [Network and Port Issues](#network-and-port-issues)
10. [Performance Issues](#performance-issues)
11. [Docker Issues](#docker-issues)
12. [Debug Commands](#debug-commands)
13. [Getting Help](#getting-help)

---

## Quick Diagnostics

Run these commands to quickly diagnose issues:

```bash
# Check service status
docker-compose ps

# View recent logs
docker-compose logs --tail=50

# Check port availability
lsof -i :3100  # nself-admin port

# Verify environment files
ls -la .env*

# Check Docker resources
docker system df
docker stats --no-stream

# Test database connection
docker-compose exec postgres psql -U postgres -d nself -c "SELECT 1"
```

---

## Installation Issues

### nself-admin Won't Start

#### Symptom

```
Error: Cannot find module 'xyz'
```

#### Causes & Solutions

1. **Missing dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Wrong Node version**

   ```bash
   node --version  # Should be 18+
   nvm use 18     # If using nvm
   ```

3. **Port already in use**

   ```bash
   # Check what's using port 3100
   lsof -i :3100

   # Kill process or use different port
   PORT=3101 npm run dev
   ```

### Docker Not Found

#### Symptom

```
docker: command not found
```

#### Solution

Install Docker Desktop:

- Mac: https://docs.docker.com/desktop/mac/install/
- Windows: https://docs.docker.com/desktop/windows/install/
- Linux: https://docs.docker.com/engine/install/

Verify installation:

```bash
docker --version
docker-compose --version
```

---

## Wizard Issues

### Wizard Not Loading

#### Symptoms

- Blank page
- Infinite loading
- "No project detected"

#### Solutions

1. **Check project path**

   ```bash
   echo $NSELF_PROJECT_PATH
   # Should point to your project directory

   # Set if missing
   export NSELF_PROJECT_PATH=/path/to/project
   ```

2. **Initialize project**

   ```bash
   cd /path/to/project
   nself init
   ```

3. **Clear browser cache**
   - Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
   - Clear site data in DevTools

### Auto-Save Not Working

#### Symptoms

- "Auto-saving..." stuck
- Changes not persisting
- Configuration lost on refresh

#### Solutions

1. **Check file permissions**

   ```bash
   ls -la .env*
   # Should be writable by current user

   chmod 644 .env.dev
   ```

2. **Check API endpoints**

   ```bash
   curl http://localhost:3100/api/wizard/update-env
   # Should not return 404
   ```

3. **Browser console errors**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

### Validation Errors

#### "Invalid project name"

- Use lowercase letters, numbers, dashes only
- No spaces or special characters
- Example: `my-awesome-app`

#### "Invalid domain"

- Development: Use `localhost` or `.local` domains
- Production: Use valid FQDN
- No protocol (http://) in domain field

#### "Port already in use"

- Choose different port
- Valid range: 3000-9999
- Check reserved ports list

---

## Environment Variable Issues

### Variables Not Loading

#### Symptom

Services start with default values instead of configured ones

#### Diagnosis

```bash
# Check file exists
cat .env.dev

# Check loading order
docker-compose config

# Verify in container
docker-compose exec <service> env | grep PROJECT_NAME
```

#### Solutions

1. **File in wrong location**

   ```bash
   # Files should be in project root
   ls -la /path/to/project/.env*
   ```

2. **Wrong environment**

   ```bash
   # Check current environment
   echo $ENV

   # Set correct environment
   export ENV=dev
   ```

3. **Syntax errors**

   ```bash
   # No spaces around =
   CORRECT=value
   WRONG = value

   # Quote values with spaces
   CORRECT="value with spaces"
   WRONG=value with spaces
   ```

### Deprecated Variables

Old variables still being used? Update them:

| Old                     | New                   |
| ----------------------- | --------------------- |
| `NADMIN_ENABLED`        | `NSELF_ADMIN_ENABLED` |
| `MINIO_ENABLED`         | `STORAGE_ENABLED`     |
| `DB_BACKUP_*`           | `BACKUP_*`            |
| `ELASTICSEARCH_ENABLED` | `SEARCH_ENABLED`      |

---

## Service Issues

### PostgreSQL Won't Start

#### Symptoms

```
postgres exited with code 1
FATAL: password authentication failed
```

#### Solutions

1. **Reset database**

   ```bash
   docker-compose down -v  # Warning: Deletes data
   docker-compose up -d postgres
   ```

2. **Check credentials**

   ```bash
   grep POSTGRES .env.dev
   # Ensure POSTGRES_PASSWORD is set
   ```

3. **Port conflict**
   ```bash
   lsof -i :5432
   # Kill local postgres or change port
   ```

### Hasura Console Not Loading

#### Symptoms

- Console shows "Error"
- Can't access localhost:3000

#### Solutions

1. **Check admin secret**

   ```bash
   # Must be 32+ characters
   grep HASURA_GRAPHQL_ADMIN_SECRET .env.dev
   ```

2. **Enable console**

   ```bash
   # Add to .env.dev
   HASURA_GRAPHQL_ENABLE_CONSOLE=true
   ```

3. **Check database connection**
   ```bash
   docker-compose logs hasura | grep "database"
   ```

### Storage (MinIO) Issues

#### Symptoms

- Can't upload files
- MinIO console not accessible

#### Solutions

1. **Check credentials**

   ```bash
   # Password must be 8+ characters
   grep MINIO_ROOT_PASSWORD .env.dev
   ```

2. **Access console**
   ```
   http://localhost:9001
   Username: minioadmin (or configured)
   Password: (from env file)
   ```

---

## Build and Deployment Issues

### Build Fails

#### Symptom

```
Error during build process
docker-compose.yml not found
```

#### Solutions

1. **Run from correct directory**

   ```bash
   cd /path/to/project
   nself build
   ```

2. **Check Docker daemon**

   ```bash
   docker ps
   # If error, start Docker Desktop
   ```

3. **Clear Docker cache**
   ```bash
   docker system prune -a
   # Warning: Removes all unused images
   ```

### Services Not Starting After Build

#### Solutions

1. **Start services**

   ```bash
   nself start
   # or
   docker-compose up -d
   ```

2. **Check logs**

   ```bash
   docker-compose logs <service-name>
   ```

3. **Verify configuration**
   ```bash
   docker-compose config --services
   ```

---

## Database Issues

### Connection Refused

#### Symptom

```
could not connect to server: Connection refused
```

#### Solutions

1. **Wait for database**

   ```bash
   # Database takes time to initialize
   docker-compose logs -f postgres
   # Wait for "database system is ready"
   ```

2. **Check network**
   ```bash
   docker network ls
   docker network inspect <project>_default
   ```

### Migration Errors

#### Symptom

```
ERROR: relation does not exist
```

#### Solutions

1. **Run migrations**

   ```bash
   docker-compose exec hasura hasura migrate apply
   ```

2. **Reset and migrate**
   ```bash
   docker-compose exec hasura hasura migrate apply --down all
   docker-compose exec hasura hasura migrate apply
   ```

---

## Authentication Issues

### Can't Login to nself-admin

#### Solutions

1. **Reset password**

   ```bash
   # Remove password from database
   rm data/nadmin.db
   # Restart to set new password
   ```

2. **Check session**
   - Clear browser cookies
   - Try incognito/private window

### JWT Errors

#### Symptom

```
Invalid JWT token
JWT secret key too short
```

#### Solutions

1. **Check key length**

   ```bash
   # Must be 32+ characters
   grep HASURA_JWT_KEY .env.dev | wc -c
   ```

2. **Verify format**
   ```bash
   # Should be plain key, not JSON
   HASURA_JWT_KEY=your-32-character-minimum-secret-key
   HASURA_JWT_TYPE=HS256
   ```

---

## Network and Port Issues

### Port Already in Use

#### Diagnosis

```bash
# Find what's using a port
lsof -i :3100
netstat -an | grep 3100
```

#### Solutions

1. **Kill process**

   ```bash
   kill -9 <PID>
   ```

2. **Use different port**

   ```bash
   PORT=3101 npm run dev
   ```

3. **Common port conflicts**
   - 3000: Create React App / Hasura Console
   - 3100: nself-admin
   - 5432: Local PostgreSQL
   - 6379: Local Redis

### Cannot Access Services

#### Symptom

- Can't reach http://localhost:3100
- ERR_CONNECTION_REFUSED

#### Solutions

1. **Check firewall**

   ```bash
   # Mac
   sudo pfctl -s rules

   # Linux
   sudo iptables -L
   ```

2. **Check Docker network**

   ```bash
   docker network ls
   docker-compose ps
   ```

3. **Use container IP**
   ```bash
   docker inspect <container> | grep IPAddress
   ```

---

## Performance Issues

### Slow Response Times

#### Diagnosis

```bash
# Check resource usage
docker stats

# Check logs for errors
docker-compose logs --tail=100
```

#### Solutions

1. **Increase resources**

   ```bash
   # Docker Desktop: Preferences > Resources
   # Increase CPUs and Memory
   ```

2. **Enable caching**

   ```bash
   REDIS_ENABLED=true
   ```

3. **Optimize queries**
   - Add database indexes
   - Use Hasura query caching
   - Enable connection pooling

### High Memory Usage

#### Solutions

1. **Set memory limits**

   ```bash
   # In docker-compose.yml
   services:
     api:
       mem_limit: 512m
   ```

2. **Clean up**
   ```bash
   docker system prune
   docker volume prune
   ```

---

## Docker Issues

### Docker Daemon Not Running

#### Symptom

```
Cannot connect to the Docker daemon
```

#### Solution

- Start Docker Desktop application
- Linux: `sudo systemctl start docker`

### Out of Disk Space

#### Symptom

```
no space left on device
```

#### Solutions

1. **Clean Docker**

   ```bash
   docker system prune -a --volumes
   ```

2. **Check disk usage**

   ```bash
   docker system df
   df -h
   ```

3. **Move Docker data**
   - Docker Desktop: Preferences > Resources > Advanced
   - Change disk image location

### Container Keeps Restarting

#### Diagnosis

```bash
docker-compose logs <service>
docker inspect <container> | grep -i restart
```

#### Solutions

1. **Check exit code**

   ```bash
   docker ps -a
   # Look at STATUS column
   ```

2. **Disable restart**
   ```yaml
   # docker-compose.yml
   services:
     service:
       restart: 'no' # For debugging
   ```

---

## Debug Commands

### Essential Commands

```bash
# Service status
docker-compose ps
docker ps -a

# Logs
docker-compose logs [service]
docker-compose logs -f --tail=100

# Environment
docker-compose exec [service] env
docker-compose config

# Network
docker network ls
docker network inspect [network]

# Resources
docker system df
docker stats
docker system prune

# Database
docker-compose exec postgres psql -U postgres
docker-compose exec postgres pg_dump -U postgres nself

# Shell access
docker-compose exec [service] /bin/bash
docker-compose exec [service] sh

# Rebuild
docker-compose build --no-cache
docker-compose up -d --force-recreate
```

### Advanced Debugging

```bash
# Trace system calls
docker run --rm -it --pid container:[container] --cap-add SYS_PTRACE alpine strace -p 1

# Network debugging
docker run --rm -it nicolaka/netshoot

# Check container health
docker inspect [container] --format='{{.State.Health}}'

# Export/Import database
docker-compose exec postgres pg_dump -U postgres nself > backup.sql
docker-compose exec -T postgres psql -U postgres nself < backup.sql
```

---

## Getting Help

### Before Asking for Help

1. **Check documentation**
   - `/docs` folder in project
   - [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md)
   - [Wizard Guide](./WIZARD_GUIDE.md)

2. **Search existing issues**
   - GitHub Issues
   - Stack Overflow
   - Discord/Slack history

3. **Gather information**

   ```bash
   # System info
   uname -a
   docker --version
   node --version

   # Error logs
   docker-compose logs > logs.txt

   # Configuration (remove secrets!)
   cat .env.dev | grep -v PASSWORD | grep -v SECRET
   ```

### Where to Get Help

1. **GitHub Issues**
   - https://github.com/nself/admin/issues
   - Include: Error message, steps to reproduce, system info

2. **Community**
   - Discord: [invite link]
   - Slack: [invite link]
   - Forum: [link]

3. **Commercial Support**
   - Email: support@nself.com
   - Priority support available

### Reporting Bugs

Include:

1. **Environment**
   - OS and version
   - Docker version
   - Node version
   - Browser (if UI issue)

2. **Steps to reproduce**
   - Exact commands run
   - Configuration used
   - Expected vs actual behavior

3. **Error messages**
   - Full error text
   - Screenshots if UI issue
   - Relevant logs

4. **What you've tried**
   - Solutions attempted
   - Workarounds found

---

## Common Error Messages

### Quick Reference

| Error                            | Likely Cause         | Solution                        |
| -------------------------------- | -------------------- | ------------------------------- |
| `EADDRINUSE`                     | Port in use          | Change port or kill process     |
| `ECONNREFUSED`                   | Service not running  | Start service or check port     |
| `EACCES`                         | Permission denied    | Check file permissions          |
| `ENOENT`                         | File not found       | Verify file path                |
| `password authentication failed` | Wrong credentials    | Check env file                  |
| `JWT secret too short`           | Secret < 32 chars    | Generate longer secret          |
| `Invalid project name`           | Special characters   | Use only lowercase and dashes   |
| `Container unhealthy`            | Health check failing | Check service logs              |
| `no space left on device`        | Disk full            | Clean Docker or free space      |
| `network not found`              | Docker network issue | Recreate with docker-compose up |

---

_Last Updated: 2025-01-05_
_Version: 1.0.0_
