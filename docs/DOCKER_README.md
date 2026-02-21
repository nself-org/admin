# nself-admin - Web UI for nself CLI

[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/nself-org/admin/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/acamarata/nself-admin)](https://hub.docker.com/r/acamarata/nself-admin)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/nself-org/admin/blob/main/LICENSE)

Production-ready web interface for managing your self-hosted backend stack using the [nself CLI](https://github.com/nself-org/cli).

## Quick Start

```bash
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  acamarata/nself-admin:latest
```

Open http://localhost:3021 in your browser.

## Docker Tags

| Tag       | Description                      | Use Case                  |
| --------- | -------------------------------- | ------------------------- |
| `latest`  | Latest stable release            | Production                |
| `0.5.0`   | Specific version                 | Production (pinned)       |
| `0.5`     | Minor version (receives patches) | Production (auto-updates) |
| `staging` | Latest staging build             | Testing                   |

## Supported Platforms

- `linux/amd64` - x86_64 systems
- `linux/arm64` - ARM systems (Apple Silicon, Raspberry Pi)

## Environment Variables

### Required

| Variable             | Default      | Description                |
| -------------------- | ------------ | -------------------------- |
| `NSELF_PROJECT_PATH` | `/workspace` | Path to your nself project |

### Optional

| Variable    | Default      | Description                       |
| ----------- | ------------ | --------------------------------- |
| `PORT`      | `3021`       | Server port                       |
| `NODE_ENV`  | `production` | Environment mode                  |
| `LOG_LEVEL` | `info`       | Log level (debug/info/warn/error) |

## Volume Mounts

### Required

- `/workspace` - Your nself project directory (read/write)

### Optional

- `/var/run/docker.sock` - Docker socket for container management
- `/app/data` - Persistent data (database, sessions)

## Docker Compose Example

```yaml
version: '3.8'

services:
  nself-admin:
    image: acamarata/nself-admin:latest
    container_name: nself-admin
    restart: unless-stopped
    ports:
      - '3021:3021'
    volumes:
      - /path/to/your/project:/workspace:rw
      - /var/run/docker.sock:/var/run/docker.sock
      - nself-admin-data:/app/data
    environment:
      - NSELF_PROJECT_PATH=/workspace
      - NODE_ENV=production
      - LOG_LEVEL=info
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3021/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  nself-admin-data:
```

## Health Check

The container includes a health check endpoint:

```bash
curl http://localhost:3021/api/health
```

Response:

```json
{
  "status": "healthy",
  "checks": {
    "docker": true,
    "filesystem": true,
    "nself": true
  }
}
```

## Monitoring

### Prometheus Metrics

```bash
curl http://localhost:3021/api/metrics
```

### Grafana Integration

Configure Prometheus to scrape metrics:

```yaml
scrape_configs:
  - job_name: 'nself-admin'
    static_configs:
      - targets: ['localhost:3021']
    metrics_path: '/api/metrics'
```

## Security

- Admin password stored securely (bcrypt hashed)
- Session management with httpOnly cookies
- CSRF protection enabled
- Rate limiting on authentication endpoints
- No sensitive data in environment variables

## First-Time Setup

1. Start the container
2. Navigate to http://localhost:3021
3. Create admin password
4. Initialize your nself project
5. Start managing your services

## Features

- Real-time service monitoring
- Database management console
- Multi-environment deployment (dev/staging/prod)
- SSL certificate management
- Live container logs
- WebSocket-based updates
- Mobile-responsive interface

## System Requirements

- Docker 20.10+
- 2GB RAM minimum
- 10GB disk space

## Documentation

- [GitHub Repository](https://github.com/nself-org/admin)
- [Full Documentation](https://github.com/nself-org/admin/tree/main/docs)
- [CI/CD Pipeline](https://github.com/nself-org/admin/blob/main/docs/CICD.md)
- [User Guide](https://github.com/nself-org/admin/blob/main/docs/USER_GUIDE.md)

## Support

- [GitHub Issues](https://github.com/nself-org/admin/issues)
- [Discussions](https://github.com/nself-org/admin/discussions)
- [Security](https://github.com/nself-org/admin/blob/main/docs/SECURITY.md)

## License

MIT - See [LICENSE](https://github.com/nself-org/admin/blob/main/LICENSE)

---

**Built with**: Next.js, React, TypeScript, Tailwind CSS, Docker

**Maintained by**: [nself-org](https://github.com/nself-org)
