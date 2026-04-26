# nself CLI Integration Guide

## Overview

nself-admin is designed as an optional web-based administration interface for the nself CLI backend stack. It runs as a Docker container alongside your nself services, providing real-time monitoring, configuration management, and service control through an intuitive web interface.

## Installation Methods

### 1. Using nself CLI (Recommended)

The nself CLI will automatically detect and install the admin interface:

```bash
# Install admin interface with default settings
nself admin install

# Install specific version
nself admin install --version 1.0.0-beta.3

# Install with custom port
nself admin install --port 3021

# Update existing installation
nself admin update
```

### 2. Manual Docker Installation

```bash
# Run standalone
docker run -d \
  --name nself-admin \
  --restart unless-stopped \
  -p 3021:3021 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/project \
  -e ADMIN_PASSWORD=your-secure-password \
  nself/admin:latest

# Using docker-compose
wget https://raw.githubusercontent.com/nself-org/admin/main/docker-compose.nself-admin.yml
docker-compose -f docker-compose.nself-admin.yml up -d
```

### 3. Integration with Existing nself Stack

Add to your existing `docker-compose.override.yml`:

```yaml
services:
  admin:
    image: nself/admin:latest
    container_name: nself-admin
    restart: unless-stopped
    ports:
      - '3021:3021'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./:/project:rw
    environment:
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - AUTO_UPDATE=true
    networks:
      - nself-network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.admin.rule=Host(`admin.${BASE_DOMAIN}`)'
```

## Configuration

### Environment Variables

| Variable | Description | Default |
| ----------------------- | ------------------------------ | ---------- |
| `ADMIN_PASSWORD` | Admin interface password | (required) |
| `ADMIN_PORT` | Port to expose admin interface | 3021 |
| `PROJECT_PATH` | Path to nself project | /project |
| `AUTO_UPDATE` | Enable automatic updates | true |
| `UPDATE_CHECK_INTERVAL` | Hours between update checks | 6 |
| `NODE_ENV` | Environment mode | production |
| `TZ` | Timezone | UTC |

### Volume Mounts

| Mount Point | Description | Required |
| ---------------------- | -------------------------------------- | -------- |
| `/var/run/docker.sock` | Docker socket for container management | Yes |
| `/project` | Your nself project directory | Yes |
| `/data` | Persistent data storage | No |

## Features

### Core Functionality

- **Dashboard**: Real-time metrics and service status overview
- **Service Management**: Start, stop, restart, and monitor containers
- **Configuration Editor**: Edit environment variables across environments
- **Database Console**: PostgreSQL management and query execution
- **Log Viewer**: Real-time log streaming from all services
- **Health Monitoring**: Service health checks and alerts
- **Auto-Updates**: Automatic version updates with rollback support

### Security

- Password-protected access
- Read-only Docker socket access by default
- Isolated container environment
- No external dependencies

## API Endpoints

The admin interface exposes several API endpoints for integration:

### Health & Status

- `GET /api/health` - Health check endpoint
- `GET /api/version` - Version information
- `GET /api/project/status` - Project status

### Service Management

- `GET /api/docker/containers` - List containers
- `POST /api/docker/containers/{id}/start` - Start container
- `POST /api/docker/containers/{id}/stop` - Stop container
- `POST /api/docker/containers/{id}/restart` - Restart container

### Configuration

- `GET /api/config/env` - Get environment configuration
- `POST /api/config/env` - Update environment configuration

### Updates

- `GET /api/version` - Check for updates
- `POST /api/version` - Perform update

## CLI Commands

The nself CLI provides commands for managing the admin interface:

```bash
# Install admin interface
nself admin install

# Check admin status
nself admin status

# View admin logs
nself admin logs

# Update admin interface
nself admin update

# Remove admin interface
nself admin remove

# Open admin interface in browser
nself admin open
```

## Plugin Commands (v0.4.8+)

nself Admin v0.0.8 wraps the CLI plugin system with a visual UI. These are the CLI commands executed by the Admin API:

| nself Admin Action | CLI Command Executed |
| --------------------- | ----------------------------- |
| View plugins page | `nself plugin list` |
| Install plugin button | `nself plugin install <name>` |
| Remove plugin button | `nself plugin remove <name>` |
| Sync button | `nself plugin <name> sync` |
| View plugin status | `nself plugin status <name>` |

> **Full CLI docs**: See [nself CLI](https://github.com/nself-org/cli) for complete plugin command reference.

## Database Commands (v0.4.8+)

nself Admin v0.0.8 wraps database operations. These are the CLI commands executed by the Admin API:

| nself Admin Action | CLI Command Executed |
| --------------------- | ------------------------- |
| Create backup button | `nself db backup create` |
| Backup list | `nself db backup list` |
| Restore button | `nself db restore <file>` |
| Run migrations | `nself db migrate up` |
| View migration status | `nself db migrate status` |
| Execute SQL query | `nself db query "<sql>"` |
| Schema browser | `nself db inspect` |

> **Full CLI docs**: See [nself CLI](https://github.com/nself-org/cli) for complete database command reference.

## Versioning

The admin interface follows semantic versioning:

- **Major**: Breaking changes to API or configuration
- **Minor**: New features, backwards compatible
- **Patch**: Bug fixes and minor improvements
- **Beta/Alpha**: Pre-release versions for testing

Current stable version: `1.0.0-beta.3`

## Docker Image Tags

| Tag | Description |
| -------------- | ---------------------------- |
| `latest` | Latest stable release |
| `1.0.0-beta.3` | Specific version |
| `1.0` | Latest 1.0.x version |
| `beta` | Latest beta release |
| `dev` | Development build (unstable) |

## Platform Support

Multi-architecture Docker images are available for:

- `linux/amd64` - Standard x86_64
- `linux/arm64` - ARM 64-bit (Apple Silicon, AWS Graviton)
- `linux/arm/v7` - ARM 32-bit (Raspberry Pi)

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs nself-admin

# Verify Docker socket access
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  alpine sh -c "apk add docker && docker ps"

# Check port availability
lsof -i :3021
```

### Cannot access interface

```bash
# Check container status
docker ps | grep nself-admin

# Test health endpoint
curl http://localhost:3021/api/health

# Check firewall rules
sudo iptables -L | grep 3021
```

### Update issues

```bash
# Manual update
docker pull nself/admin:latest
docker stop nself-admin
docker rm nself-admin
# Re-run installation command

# Force specific version
docker run -d \
  --name nself-admin \
  -e ADMIN_VERSION=1.0.0-beta.3 \
  nself/admin:1.0.0-beta.3
```

## Development

### Building from source

```bash
# Clone repository
git clone https://github.com/nself-org/admin.git
cd nself-admin

# Install dependencies
npm install

# Development mode
npm run dev

# Build Docker image
npm run docker:build

# Run tests
npm test
```

### Contributing

1. Fork the repository
2. Create feature branch
3. Make changes and test
4. Submit pull request

## Support

- GitHub Issues: https://github.com/nself-org/admin/issues
- Documentation: https://docs.nself.org/admin
- the community chat: https://chat.nself.org

## License

nself-admin is part of the nself ecosystem. See LICENSE file for details.
