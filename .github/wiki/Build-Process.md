# Build Process Documentation

Understanding how nself Admin builds your development stack from configuration to running containers.

## Overview

The build process transforms your wizard configuration into a complete, running development stack. This involves:

1. Configuration validation
2. File generation
3. Service initialization
4. Network setup
5. Health verification

## Build Phases

### Phase 1: Initialization

**Duration**: 1-2 seconds  
**What Happens**:

- Validates project directory
- Checks Docker availability
- Verifies port availability
- Creates data directories

**Generated Structure**:

```
project/
├── .nself/           # Metadata directory
├── data/            # Persistent data
├── backups/         # Backup directory
└── logs/            # Service logs
```

### Phase 2: Docker Compose Generation

**Duration**: 2-3 seconds  
**What Happens**:

- Parses environment configuration
- Generates service definitions
- Creates network configurations
- Sets up volume mappings

**Generated File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - nself_network

  hasura:
    image: hasura/graphql-engine:latest
    depends_on:
      - postgres
    environment:
      HASURA_GRAPHQL_DATABASE_URL: ${DATABASE_URL}
      HASURA_GRAPHQL_ADMIN_SECRET: ${HASURA_ADMIN_SECRET}
    networks:
      - nself_network

  # ... more services

networks:
  nself_network:
    driver: bridge

volumes:
  postgres_data:
  # ... more volumes
```

### Phase 3: Service Configuration

**Duration**: 3-4 seconds  
**What Happens**:

- Creates service-specific configs
- Generates nginx routing rules
- Sets up Hasura metadata
- Configures monitoring dashboards

**Generated Configurations**:

#### Nginx Configuration

```nginx
# nginx/default.conf
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://frontend:3000;
    }

    location /api {
        proxy_pass http://api:4001;
    }

    location /graphql {
        proxy_pass http://hasura:8080;
    }
}
```

#### Hasura Metadata

```yaml
# hasura/metadata/databases.yaml
- name: default
  kind: postgres
  configuration:
    connection_info:
      database_url:
        from_env: DATABASE_URL
```

### Phase 4: Database Setup

**Duration**: 2-3 seconds  
**What Happens**:

- Creates database schemas
- Sets up user permissions
- Initializes extensions
- Prepares migration system

**Database Initialization**:

```sql
-- Initial setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- Setup permissions
GRANT ALL ON SCHEMA public TO postgres;
```

### Phase 5: Custom Service Setup

**Duration**: 1-2 seconds per service  
**What Happens**:

- Creates service directories
- Copies framework templates
- Configures environment variables
- Sets up hot reload

**Template Structure**:

```
services/api/
├── Dockerfile
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── routes/
│   └── middleware/
└── .env
```

### Phase 6: Network Configuration

**Duration**: 1 second  
**What Happens**:

- Creates Docker network
- Sets up service discovery
- Configures internal DNS
- Maps external ports

**Network Layout**:

```yaml
Networks:
  nself_network:
    - Subnet: 172.20.0.0/16
    - Gateway: 172.20.0.1

Service IPs:
  postgres: 172.20.0.2
  hasura: 172.20.0.3
  auth: 172.20.0.4
  nginx: 172.20.0.5
  # ... dynamic assignment for others
```

### Phase 7: Validation

**Duration**: 1-2 seconds  
**What Happens**:

- Verifies all files generated
- Checks configuration syntax
- Validates environment variables
- Ensures no conflicts

**Validation Checks**:

- ✅ All required files exist
- ✅ Docker Compose syntax valid
- ✅ No port conflicts
- ✅ All secrets generated
- ✅ Network configuration valid

## Build Outputs

### Environment Files

#### .env.development

```bash
# Project Configuration
PROJECT_NAME=my_app
ENVIRONMENT=development
BASE_DOMAIN=localhost

# Database
POSTGRES_DB=myapp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dev-password

# Services
HASURA_ADMIN_SECRET=hasura-secret-key
JWT_SECRET=jwt-secret-key-32-chars
REDIS_PASSWORD=redis-password

# Custom Services
CS_1=api:express-ts:4001:api
CS_2=worker:bullmq-ts:4002:

# Frontend Apps
FRONTEND_APP_1=webapp:3001:app.localhost
```

### Docker Compose Structure

**Service Dependencies**:

```yaml
graph TD
nginx[Nginx]
postgres[PostgreSQL]
hasura[Hasura]
auth[Auth Service]
redis[Redis]
custom[Custom Services]

nginx --> hasura
nginx --> auth
nginx --> custom
hasura --> postgres
auth --> postgres
auth --> redis
custom --> postgres
custom --> redis
```

### File System Layout

**Complete Project Structure**:

```
project/
├── docker-compose.yml         # Main orchestration
├── docker-compose.override.yml # Dev overrides
├── .env.development           # Dev environment
├── .env.staging              # Staging environment
├── .env.production           # Production environment
├── .gitignore               # Git ignore rules
│
├── nginx/
│   ├── default.conf         # Main routing
│   ├── ssl/                # SSL certificates
│   └── includes/           # Shared configs
│
├── hasura/
│   ├── metadata/           # GraphQL metadata
│   ├── migrations/         # Database migrations
│   └── seeds/             # Seed data
│
├── services/
│   ├── api/               # Custom API service
│   ├── worker/            # Background worker
│   └── [other-services]/  # Additional services
│
├── data/
│   ├── postgres/          # Database files
│   ├── redis/            # Redis persistence
│   └── minio/           # Object storage
│
└── backups/
    ├── daily/            # Daily backups
    └── manual/          # Manual backups
```

## Build Configuration

### Resource Allocation

**Default Resource Limits**:

```yaml
services:
  postgres:
    mem_limit: 2g
    cpus: '2.0'

  hasura:
    mem_limit: 512m
    cpus: '1.0'

  redis:
    mem_limit: 256m
    cpus: '0.5'

  custom_service:
    mem_limit: 512m
    cpus: '1.0'
```

### Volume Management

**Persistent Volumes**:

```yaml
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/postgres

  redis_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/redis
```

### Health Checks

**Service Health Configuration**:

```yaml
healthcheck:
  postgres:
    test: ['CMD-SHELL', 'pg_isready -U postgres']
    interval: 10s
    timeout: 5s
    retries: 5

  hasura:
    test: ['CMD', 'curl', '-f', 'http://localhost:8080/healthz']
    interval: 10s
    timeout: 5s
    retries: 5
```

## Build Optimization

### Multi-Stage Builds

**Optimized Dockerfile Example**:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 4001
CMD ["node", "dist/index.js"]
```

### Caching Strategy

**Layer Caching**:

1. Base images cached locally
2. Dependencies cached separately
3. Source code as final layer
4. Build cache persisted

### Parallel Building

**Concurrent Operations**:

- Service configurations generated in parallel
- Independent services built simultaneously
- Network setup concurrent with file generation
- Validation runs asynchronously

## Build Troubleshooting

### Common Build Issues

#### Port Conflicts

**Error**: "Port 5432 is already in use"

```bash
# Find process using port
lsof -i :5432

# Stop conflicting service
docker stop <container_id>
```

#### Insufficient Resources

**Error**: "Cannot allocate memory"

```bash
# Check Docker resources
docker system df

# Clean up unused resources
docker system prune -a
```

#### Permission Denied

**Error**: "Permission denied while creating directory"

```bash
# Fix permissions
sudo chown -R $USER:$USER ./data
chmod -R 755 ./data
```

### Build Logs

**Viewing Build Logs**:

```bash
# Real-time logs
docker-compose logs -f

# Specific service
docker-compose logs -f postgres

# Build output
docker-compose build --no-cache 2>&1 | tee build.log
```

### Rebuilding

**Clean Rebuild**:

```bash
# Stop all services
docker-compose down

# Remove volumes (careful - data loss!)
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

## Build Customization

### Custom Build Scripts

**Pre-Build Hook**:

```bash
#!/bin/bash
# .nself/hooks/pre-build.sh

echo "Running pre-build tasks..."
# Custom validation
# Environment setup
# Dependency checks
```

**Post-Build Hook**:

```bash
#!/bin/bash
# .nself/hooks/post-build.sh

echo "Running post-build tasks..."
# Seed database
# Import configurations
# Send notifications
```

### Environment-Specific Builds

**Development Build**:

- Hot reload enabled
- Debug logging
- Development tools included
- Relaxed security

**Production Build**:

- Optimized images
- Security hardening
- Minimal logging
- Resource limits enforced

## Build Metrics

### Performance Metrics

**Typical Build Times**:
| Phase | Duration | Description |
|-------|----------|-------------|
| Initialization | 1-2s | Directory setup |
| Generation | 2-3s | File creation |
| Configuration | 3-4s | Service setup |
| Database | 2-3s | Schema creation |
| Custom Services | 1-2s each | Template copying |
| Network | 1s | Network creation |
| Validation | 1-2s | Final checks |
| **Total** | **~15-20s** | Complete build |

### Resource Usage

**Build Resource Requirements**:

- CPU: 2 cores recommended
- RAM: 2GB minimum, 4GB recommended
- Disk: 1GB for build artifacts
- Network: 100MB for image downloads

## Next Steps

After the build completes:

1. **[Start Services](Start-Services)** - Launch your stack
2. **[Dashboard Overview](Dashboard-Overview)** - Monitor services
3. **[Service Management](Service-Management)** - Control individual services
4. **[Troubleshooting](Troubleshooting)** - Solve common issues

---

**Related Documentation**:

- [Init Wizard Guide](Init-Wizard-Guide)
- [Docker Compose Reference](Docker-Compose-Reference)
- [Service Configuration](Service-Configuration)
- [Environment Management](Environment-Management)
