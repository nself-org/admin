# Docker Deployment Guide

## Overview

nAdmin is designed as a Docker-first application, running in a container that manages user projects through volume mounts. This guide covers building, deploying, and managing the nAdmin Docker container.

## Docker Image

### Official Image

```bash
# Pull from Docker Hub
docker pull nself/nself-admin:latest

# Specific version
docker pull nself/nself-admin:v1.2.0
```

### Building from Source

```bash
# Clone repository
git clone https://github.com/your-org/nself-admin.git
cd nself-admin

# Build image
docker build -t nself-admin:local .

# Build with specific Node version
docker build --build-arg NODE_VERSION=20 -t nself-admin:local .
```

## Dockerfile

```dockerfile
# Multi-stage build for optimization
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Create data directory
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3021

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3021/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

## Container Configuration

### Basic Deployment

```bash
docker run -d \
  --name nself-admin \
  --restart unless-stopped \
  -p 3021:3021 \
  -v /path/to/project:/workspace:rw \
  -v nself-admin-data:/app/data \
  nself/nself-admin:latest
```

### Advanced Configuration

```bash
docker run -d \
  --name nself-admin \
  --restart unless-stopped \
  --memory="512m" \
  --cpus="0.5" \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  -p 3021:3021 \
  -v /path/to/project:/workspace:rw \
  -v nself-admin-data:/app/data \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e NODE_ENV=production \
  -e NSELF_PROJECT_PATH=/workspace \
  --health-cmd="curl -f http://localhost:3021/api/health || exit 1" \
  --health-interval=30s \
  --health-timeout=3s \
  --health-retries=3 \
  nself/nself-admin:latest
```

## Docker Compose

### Basic Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  nself-admin:
    image: nself/nself-admin:latest
    container_name: nself-admin
    restart: unless-stopped
    ports:
      - '3021:3021'
    volumes:
      - /path/to/project:/workspace:rw
      - nself-admin-data:/app/data
    environment:
      - NODE_ENV=production
      - NSELF_PROJECT_PATH=/workspace
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3021/api/health']
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

volumes:
  nself-admin-data:
    driver: local
```

### With Traefik Proxy

```yaml
version: '3.8'

services:
  nself-admin:
    image: nself/nself-admin:latest
    container_name: nself-admin
    restart: unless-stopped
    networks:
      - traefik
      - internal
    volumes:
      - /path/to/project:/workspace:rw
      - nself-admin-data:/app/data
    environment:
      - NODE_ENV=production
      - NSELF_PROJECT_PATH=/workspace
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.nself-admin.rule=Host(`admin.example.com`)'
      - 'traefik.http.routers.nself-admin.entrypoints=websecure'
      - 'traefik.http.routers.nself-admin.tls.certresolver=letsencrypt'
      - 'traefik.http.services.nself-admin.loadbalancer.server.port=3021'

networks:
  traefik:
    external: true
  internal:
    driver: bridge

volumes:
  nself-admin-data:
    driver: local
```

### With Nginx Proxy

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - nself-admin

  nself-admin:
    image: nself/nself-admin:latest
    container_name: nself-admin
    restart: unless-stopped
    expose:
      - '3021'
    volumes:
      - /path/to/project:/workspace:rw
      - nself-admin-data:/app/data
    environment:
      - NODE_ENV=production
      - NSELF_PROJECT_PATH=/workspace

volumes:
  nself-admin-data:
    driver: local
```

## Volume Management

### Data Persistence

```bash
# Create named volume
docker volume create nself-admin-data

# Inspect volume
docker volume inspect nself-admin-data

# Backup volume
docker run --rm \
  -v nself-admin-data:/data \
  -v $(pwd):/backup \
  busybox tar czf /backup/nself-admin-backup-$(date +%Y%m%d).tar.gz /data

# Restore volume
docker run --rm \
  -v nself-admin-data:/data \
  -v $(pwd):/backup \
  busybox tar xzf /backup/nself-admin-backup.tar.gz -C /
```

### Project Mount

```bash
# Read-write mount (default)
-v /path/to/project:/workspace:rw

# Read-only mount (safer but limits functionality)
-v /path/to/project:/workspace:ro

# With specific user permissions
-v /path/to/project:/workspace:rw,uid=1001,gid=1001
```

## Network Configuration

### Bridge Network

```bash
# Create custom network
docker network create nself-network

# Run with custom network
docker run -d \
  --name nself-admin \
  --network nself-network \
  -p 3021:3021 \
  # ... other options
  nself/nself-admin:latest
```

### Host Network

```bash
# Use host network (Linux only)
docker run -d \
  --name nself-admin \
  --network host \
  -e PORT=3021 \
  # ... other options
  nself/nself-admin:latest
```

## Environment Variables

### Required Variables

| Variable             | Description                  | Default      |
| -------------------- | ---------------------------- | ------------ |
| `NSELF_PROJECT_PATH` | Path to project in container | `/workspace` |

### Optional Variables

| Variable   | Description          | Default      |
| ---------- | -------------------- | ------------ |
| `NODE_ENV` | Environment mode     | `production` |
| `PORT`     | Internal port        | `3021`       |
| `DEBUG`    | Enable debug logging | `false`      |
| `TZ`       | Timezone             | `UTC`        |

### Setting Variables

```bash
# Via command line
docker run -d \
  -e NODE_ENV=production \
  -e TZ=America/New_York \
  # ... other options
  nself/nself-admin:latest

# Via env file
docker run -d \
  --env-file .env.production \
  # ... other options
  nself/nself-admin:latest
```

## Security Hardening

### Run as Non-Root

```bash
# Container already configured for non-root
# Verify user
docker exec nself-admin whoami
# Output: nodejs
```

### Read-Only Root Filesystem

```bash
docker run -d \
  --name nself-admin \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /app/.next/cache \
  -v nself-admin-data:/app/data \
  # ... other options
  nself/nself-admin:latest
```

### Security Options

```bash
docker run -d \
  --name nself-admin \
  --security-opt no-new-privileges \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  # ... other options
  nself/nself-admin:latest
```

## Monitoring

### Health Checks

```bash
# Check container health
docker inspect nself-admin --format='{{.State.Health.Status}}'

# View health check logs
docker inspect nself-admin --format='{{range .State.Health.Log}}{{.Output}}{{end}}'

# Manual health check
curl http://localhost:3021/api/health
```

### Logs

```bash
# View logs
docker logs nself-admin

# Follow logs
docker logs -f nself-admin

# Last 100 lines
docker logs --tail 100 nself-admin

# Since timestamp
docker logs --since 2024-01-20T10:00:00 nself-admin
```

### Metrics

```bash
# Container stats
docker stats nself-admin

# Detailed inspection
docker inspect nself-admin

# Resource usage
docker exec nself-admin ps aux
docker exec nself-admin free -h
docker exec nself-admin df -h
```

## Upgrades

### Zero-Downtime Upgrade

```bash
# 1. Pull new image
docker pull nself/nself-admin:latest

# 2. Create new container
docker run -d \
  --name nself-admin-new \
  -p 3022:3021 \
  -v /path/to/project:/workspace:rw \
  -v nself-admin-data:/app/data \
  nself/nself-admin:latest

# 3. Test new container
curl http://localhost:3022/api/health

# 4. Stop old container
docker stop nself-admin

# 5. Rename containers
docker rename nself-admin nself-admin-old
docker rename nself-admin-new nself-admin

# 6. Update port mapping
docker stop nself-admin
docker rm nself-admin
# Re-run with port 3021

# 7. Remove old container
docker rm nself-admin-old
```

### Rollback

```bash
# Tag current version before upgrade
docker tag nself/nself-admin:latest nself/nself-admin:backup

# If rollback needed
docker stop nself-admin
docker rm nself-admin
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v /path/to/project:/workspace:rw \
  -v nself-admin-data:/app/data \
  nself/nself-admin:backup
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs nself-admin

# Check events
docker events --filter container=nself-admin

# Interactive debug
docker run -it --rm \
  -v /path/to/project:/workspace:rw \
  -v nself-admin-data:/app/data \
  nself/nself-admin:latest \
  sh
```

### Permission Issues

```bash
# Check file permissions
docker exec nself-admin ls -la /workspace
docker exec nself-admin ls -la /app/data

# Fix permissions
docker exec -u root nself-admin chown -R nodejs:nodejs /app/data
```

### Memory Issues

```bash
# Check memory usage
docker stats nself-admin

# Increase memory limit
docker update --memory="1g" --memory-swap="2g" nself-admin

# Or recreate with limits
docker run -d \
  --memory="1g" \
  --memory-swap="2g" \
  # ... other options
  nself/nself-admin:latest
```

### Network Issues

```bash
# Test connectivity
docker exec nself-admin ping -c 3 google.com
docker exec nself-admin nslookup google.com
docker exec nself-admin curl -I http://localhost:3021/api/health

# Check port binding
docker port nself-admin
netstat -tlnp | grep 3021
```

## Best Practices

1. **Always use named volumes** for data persistence
2. **Set resource limits** to prevent resource exhaustion
3. **Use health checks** for automatic recovery
4. **Run as non-root** for security
5. **Keep images updated** for security patches
6. **Use specific tags** in production (not `latest`)
7. **Monitor logs** and set up alerting
8. **Backup data regularly** before upgrades
9. **Test upgrades** in staging environment
10. **Document your deployment** configuration

## Production Checklist

- [ ] Use specific image version tag
- [ ] Configure resource limits
- [ ] Set up health checks
- [ ] Enable restart policy
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Implement backup strategy
- [ ] Configure SSL/TLS
- [ ] Set proper environment variables
- [ ] Test disaster recovery
