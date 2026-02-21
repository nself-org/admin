# Production Deployment Guide

This guide covers deploying nself-admin in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Methods](#deployment-methods)
3. [Docker Deployment](#docker-deployment)
4. [Environment Configuration](#environment-configuration)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Reverse Proxy Setup](#reverse-proxy-setup)
7. [Health Checks](#health-checks)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup Strategy](#backup-strategy)
10. [Security Hardening](#security-hardening)
11. [Scaling & High Availability](#scaling--high-availability)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Minimum:**

- Docker 20.10+
- 2GB RAM
- 10GB disk space
- Linux, macOS, or Windows (WSL2)

**Recommended:**

- Docker 24+
- 4GB RAM
- 50GB SSD
- Ubuntu 22.04 LTS or similar

### Required Access

- Root or sudo access
- Docker daemon running
- Port 3021 available (or custom port)
- Internet access for Docker pulls

### DNS & Domain (for production)

- Domain name (e.g., admin.example.com)
- DNS A record pointing to your server
- SSL certificate (Let's Encrypt or custom)

---

## Deployment Methods

### Method 1: Via nself CLI (Recommended)

The easiest way to deploy nself-admin is through the nself CLI:

```bash
# On your server
curl -fsSL https://raw.githubusercontent.com/nself-org/cli/main/install.sh | bash
nself admin --port=3021
```

The nself CLI handles:

- Docker image pulling
- Volume mounting
- Environment setup
- Health checks

### Method 2: Direct Docker

For manual control:

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
  acamarata/nself-admin:0.5.0
```

### Method 3: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  nself-admin:
    image: acamarata/nself-admin:0.5.0
    container_name: nself-admin
    restart: unless-stopped
    ports:
      - '3021:3021'
    volumes:
      - /path/to/project:/workspace:rw
      - /var/run/docker.sock:/var/run/docker.sock:rw
      - nself-admin-data:/app/data
    environment:
      - NSELF_PROJECT_PATH=/workspace
      - NODE_ENV=production
      - PORT=3021
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

Start with:

```bash
docker-compose up -d
```

---

## Docker Deployment

### Image Versioning

Always use specific version tags in production:

```bash
# Good - specific version
docker pull acamarata/nself-admin:0.5.0

# Avoid - latest tag can change
docker pull acamarata/nself-admin:latest
```

### Volume Mounts

**Critical volumes:**

1. **Project Directory** (`/workspace`)
   - Contains your nself project
   - Must be mounted read-write
   - Example: `-v /home/user/myproject:/workspace:rw`

2. **Docker Socket** (`/var/run/docker.sock`)
   - Required for container management
   - Security consideration: grants Docker control
   - Example: `-v /var/run/docker.sock:/var/run/docker.sock:rw`

3. **Data Directory** (`/app/data`)
   - Stores nAdmin database (nadmin.db)
   - Sessions, audit logs, cache
   - Example: `-v nself-admin-data:/app/data`

### Docker Socket Security

Mounting the Docker socket gives nself-admin full control over Docker. Mitigate risks:

**Option 1: Docker group (recommended)**

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps
```

**Option 2: Socket permissions (less secure)**

```bash
# Adjust socket permissions (not recommended for production)
sudo chmod 666 /var/run/docker.sock
```

**Option 3: Docker Socket Proxy (most secure)**

Use a socket proxy like [tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy):

```yaml
services:
  docker-proxy:
    image: tecnativa/docker-socket-proxy
    environment:
      - CONTAINERS=1
      - IMAGES=1
      - NETWORKS=1
      - VOLUMES=1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - '127.0.0.1:2375:2375'

  nself-admin:
    image: acamarata/nself-admin:0.5.0
    environment:
      - DOCKER_HOST=tcp://docker-proxy:2375
```

---

## Environment Configuration

### Required Variables

```bash
NSELF_PROJECT_PATH=/workspace    # Path to your nself project
NODE_ENV=production              # Enable production mode
PORT=3021                        # Server port (default: 3021)
```

### Optional Variables

```bash
ADMIN_VERSION=0.5.0             # Version string (for display)
LOG_LEVEL=info                  # Logging level (debug, info, warn, error)
SESSION_DURATION=604800         # Session duration in seconds (default: 7 days)
RATE_LIMIT_WINDOW=900000        # Rate limit window in ms (default: 15 min)
RATE_LIMIT_MAX=100              # Max requests per window
```

### Setting Environment Variables

**Docker run:**

```bash
docker run -d \
  -e NSELF_PROJECT_PATH=/workspace \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  acamarata/nself-admin:0.5.0
```

**Docker Compose:**

```yaml
services:
  nself-admin:
    environment:
      - NSELF_PROJECT_PATH=/workspace
      - NODE_ENV=production
      - LOG_LEVEL=info
```

**Environment file:**

Create `.env.production`:

```bash
NSELF_PROJECT_PATH=/workspace
NODE_ENV=production
LOG_LEVEL=info
```

Load with:

```bash
docker run -d --env-file .env.production acamarata/nself-admin:0.5.0
```

---

## SSL/TLS Configuration

### Let's Encrypt (Automated)

nself-admin includes built-in Let's Encrypt support via the SSL Configuration page.

**Prerequisites:**

- Public domain name
- DNS pointing to your server
- Ports 80 and 443 accessible

**Steps:**

1. Access nself-admin at `http://your-domain:3021`
2. Navigate to **Config > SSL**
3. Click **Configure Let's Encrypt**
4. Enter your email and domain
5. Click **Generate Certificate**

Certificates auto-renew 30 days before expiry.

### Manual SSL (Custom Certificate)

If you have your own certificate:

1. Place certificate files on the server:

   ```bash
   /etc/ssl/certs/admin.example.com.crt
   /etc/ssl/private/admin.example.com.key
   ```

2. Configure via nself-admin UI or environment variables.

### Local Development (mkcert)

For local HTTPS:

1. Navigate to **Config > SSL**
2. Click **Generate Local Certificate**
3. Click **Trust Certificate** (macOS/Linux)
4. Restart nself-admin

---

## Reverse Proxy Setup

### Nginx

Create `/etc/nginx/sites-available/nself-admin`:

```nginx
upstream nself_admin {
    server localhost:3021;
}

server {
    listen 80;
    server_name admin.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/admin.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy Configuration
    location / {
        proxy_pass http://nself_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://nself_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/nself-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Caddy

Create `Caddyfile`:

```caddy
admin.example.com {
    reverse_proxy localhost:3021 {
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }

    # WebSocket support (automatic in Caddy)
}
```

Start Caddy:

```bash
sudo caddy run --config Caddyfile
```

### Traefik

Add labels to Docker Compose:

```yaml
services:
  nself-admin:
    image: acamarata/nself-admin:0.5.0
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.nself-admin.rule=Host(`admin.example.com`)'
      - 'traefik.http.routers.nself-admin.entrypoints=websecure'
      - 'traefik.http.routers.nself-admin.tls.certresolver=letsencrypt'
      - 'traefik.http.services.nself-admin.loadbalancer.server.port=3021'
```

---

## Health Checks

### Endpoint

nself-admin provides a health check endpoint:

```bash
curl http://localhost:3021/api/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T12:34:56.789Z",
  "version": "0.5.0",
  "checks": {
    "docker": true,
    "filesystem": true,
    "database": true,
    "cli": true
  }
}
```

### Docker Health Check

Add to `docker-compose.yml`:

```yaml
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
```

Or with `curl`:

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:3021/api/health']
  interval: 30s
  timeout: 10s
  retries: 3
```

### Monitoring Health

**Check health status:**

```bash
docker inspect --format='{{.State.Health.Status}}' nself-admin
```

**View health logs:**

```bash
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' nself-admin
```

---

## Monitoring & Logging

### Container Logs

**View logs:**

```bash
docker logs nself-admin
docker logs -f nself-admin          # Follow
docker logs --tail 100 nself-admin  # Last 100 lines
```

**Configure log rotation:**

```yaml
services:
  nself-admin:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

### Application Logging

nself-admin logs to stdout/stderr. Log levels:

- `DEBUG` - Detailed debugging information
- `INFO` - General information (default)
- `WARN` - Warning messages
- `ERROR` - Error messages

Set log level:

```bash
-e LOG_LEVEL=info
```

### External Monitoring

**Prometheus:**

nself-admin exposes metrics at `/api/metrics` (planned for v0.6.0).

**Grafana:**

Integrated Grafana dashboards accessible via the Monitoring page.

**Uptime Monitoring:**

Use services like:

- UptimeRobot
- Pingdom
- StatusCake

Configure to check `https://admin.example.com/api/health` every 5 minutes.

---

## Backup Strategy

### What to Back Up

1. **nAdmin Database** (`nadmin.db`)
   - Sessions, passwords, cache
   - Located at `/app/data/nadmin.db`

2. **Project Directory** (`/workspace`)
   - Your nself project configuration
   - Environment files
   - Docker Compose configs

3. **Docker Volumes**
   - Named volumes used by services
   - PostgreSQL data, MinIO buckets, etc.

### Backup Methods

**Automated daily backup:**

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/nself-admin/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup nAdmin database
docker cp nself-admin:/app/data/nadmin.db "$BACKUP_DIR/"

# Backup project directory
cp -r /path/to/project "$BACKUP_DIR/"

# Backup Docker volumes
docker run --rm \
  -v nself-admin-data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/data.tar.gz /data

# Keep only last 7 days
find /backups/nself-admin -type d -mtime +7 -exec rm -rf {} +
```

**Schedule with cron:**

```bash
crontab -e
# Add:
0 2 * * * /path/to/backup.sh
```

### Restore from Backup

```bash
# Stop container
docker stop nself-admin

# Restore database
docker cp nadmin.db nself-admin:/app/data/

# Restore project
cp -r backup/project /path/to/project

# Start container
docker start nself-admin
```

---

## Security Hardening

### 1. Firewall Configuration

Only expose necessary ports:

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# Block direct access to port 3021
sudo ufw deny 3021/tcp
```

Use a reverse proxy (Nginx/Caddy) to terminate SSL.

### 2. Strong Admin Password

Set a strong password on first login:

- Minimum 12 characters
- Uppercase, lowercase, numbers, special characters
- Avoid common patterns

### 3. Session Security

Sessions expire after 7 days by default. Adjust:

```bash
-e SESSION_DURATION=259200  # 3 days in seconds
```

### 4. Rate Limiting

Prevent brute-force attacks:

```bash
-e RATE_LIMIT_WINDOW=900000  # 15 minutes
-e RATE_LIMIT_MAX=100        # Max 100 requests
```

### 5. Update Regularly

Keep Docker images up to date:

```bash
docker pull acamarata/nself-admin:latest
docker-compose down
docker-compose up -d
```

### 6. Audit Logging

Enable audit logging:

Navigate to **System > Security > Audit Log** to review:

- Login attempts
- Configuration changes
- Service restarts
- Database operations

### 7. Restrict Docker Socket

Use a Docker socket proxy (see [Docker Socket Security](#docker-socket-security)).

### 8. Environment Isolation

Run nself-admin in a dedicated network:

```yaml
networks:
  nself-admin-net:
    driver: bridge

services:
  nself-admin:
    networks:
      - nself-admin-net
```

---

## Scaling & High Availability

### Load Balancing

Run multiple instances behind a load balancer:

```yaml
services:
  nself-admin-1:
    image: acamarata/nself-admin:0.5.0
    # ... config

  nself-admin-2:
    image: acamarata/nself-admin:0.5.0
    # ... config

  nginx:
    image: nginx:alpine
    ports:
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

**Note**: Session persistence requires sticky sessions or shared session storage (planned for v0.6.0).

### Database Replication

For high availability:

1. Use external PostgreSQL with replication
2. Configure via **Database > Configuration**
3. Set up read replicas

### Monitoring & Alerting

Set up alerts for:

- Container health failures
- High resource usage (CPU > 80%, RAM > 90%)
- Disk space < 10%
- Failed login attempts > 10/min

Use Prometheus + Alertmanager or similar.

---

## Troubleshooting

### Container Won't Start

**Check logs:**

```bash
docker logs nself-admin
```

**Common issues:**

- Port 3021 already in use
- Docker socket permission denied
- Volume mount path doesn't exist

**Solutions:**

```bash
# Check port usage
sudo lsof -i :3021

# Fix Docker permissions
sudo usermod -aG docker $USER

# Verify volume paths
ls -la /path/to/project
ls -la /var/run/docker.sock
```

### Can't Access UI

**Check container status:**

```bash
docker ps -a | grep nself-admin
```

**Check health:**

```bash
docker inspect --format='{{.State.Health.Status}}' nself-admin
```

**Test locally:**

```bash
curl http://localhost:3021/api/health
```

**Firewall blocking:**

```bash
sudo ufw status
sudo ufw allow 3021/tcp
```

### Database Errors

**Reset database:**

```bash
docker exec nself-admin rm /app/data/nadmin.db
docker restart nself-admin
```

**Note**: This will log you out and reset all sessions.

### Performance Issues

**Check resource usage:**

```bash
docker stats nself-admin
```

**Increase container resources:**

```yaml
services:
  nself-admin:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### SSL Certificate Issues

**Verify certificate:**

```bash
openssl s_client -connect admin.example.com:443 -servername admin.example.com
```

**Check Let's Encrypt logs:**

```bash
docker logs nself-admin | grep letsencrypt
```

**Renew manually:**

Navigate to **Config > SSL > Renew Certificate**

---

## Next Steps

After deploying nself-admin:

1. **Configure Services** - Set up PostgreSQL, Hasura, etc.
2. **Set Up Backups** - Automate database backups
3. **Configure Monitoring** - Enable Grafana dashboards
4. **Invite Team Members** - Add users (v0.6.0+)
5. **Deploy to Staging** - Test deployment workflow

For more information, see:

- [User Guide](USER_GUIDE.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [API Reference](API.md)

---

**Need help?** Open an issue on [GitHub](https://github.com/nself-org/admin/issues).
